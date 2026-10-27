using System.Text.Json;
using PropertyGis.Api.Models;

namespace PropertyGis.Api.Services;

public sealed class JsonFeatureStorageService : IFeatureStorageService
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    // Set JSON file path
    public JsonFeatureStorageService(IWebHostEnvironment environment, IConfiguration configuration)
    {
        var configuredPath = configuration["FeatureStorage:FilePath"] ?? "Data/features.json";
        _filePath = Path.IsPathRooted(configuredPath) ? configuredPath : Path.Combine(environment.ContentRootPath, configuredPath);
    }

    // Get all features
    public async Task<IReadOnlyList<StoredFeature>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var store = await ReadStoreAsync(cancellationToken);
            return store.Features.ToList();
        }
        finally
        {
            _gate.Release();
        }
    }

    // Get one feature by LayerId + FeatureId
    public async Task<StoredFeature?> GetAsync(int layerId, string featureId, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var store = await ReadStoreAsync(cancellationToken);
            return store.Features.FirstOrDefault(f => f.Layer.Id == layerId && string.Equals(f.FeatureId, featureId, StringComparison.OrdinalIgnoreCase));
        }
        finally
        {
            _gate.Release();
        }
    }

    // Save feature and prevent duplicates
    public async Task<SaveFeatureResult> SaveAsync(SaveFeatureRequest request, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            var store = await ReadStoreAsync(cancellationToken);
            var existing = store.Features.FirstOrDefault(f => f.Layer.Id == request.Layer.Id && string.Equals(f.FeatureId, request.FeatureId, StringComparison.OrdinalIgnoreCase));

            if (existing is not null) return new SaveFeatureResult(SaveFeatureStatus.Duplicate, existing);

            var stored = new StoredFeature
            {
                Layer = request.Layer,
                FeatureId = request.FeatureId,
                GeometryType = request.GeometryType,
                SpatialReference = request.SpatialReference,
                Geometry = request.Geometry.Clone(),
                Attributes = request.Attributes.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.Clone()),
                Measurements = request.Measurements,
                SavedAtUtc = DateTimeOffset.UtcNow
            };

            store.Features.Add(stored);
            await WriteStoreAsync(store, cancellationToken);

            return new SaveFeatureResult(SaveFeatureStatus.Created, stored);
        }
        finally
        {
            _gate.Release();
        }
    }

    // Delete feature by LayerId + FeatureId
    public async Task<bool> DeleteAsync(int layerId, string featureId, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            var store = await ReadStoreAsync(cancellationToken);
            var feature = store.Features.FirstOrDefault(f => f.Layer.Id == layerId && string.Equals(f.FeatureId, featureId, StringComparison.OrdinalIgnoreCase));

            if (feature is null) return false;

            store.Features.Remove(feature);
            await WriteStoreAsync(store, cancellationToken);

            return true;
        }
        finally
        {
            _gate.Release();
        }
    }

    // Read JSON file
    private async Task<FeatureStore> ReadStoreAsync(CancellationToken cancellationToken)
    {
        EnsureDirectory();

        if (!File.Exists(_filePath)) return new FeatureStore();

        await using var stream = File.OpenRead(_filePath);
        if (stream.Length == 0) return new FeatureStore();

        return await JsonSerializer.DeserializeAsync<FeatureStore>(stream, _jsonOptions, cancellationToken) ?? new FeatureStore();
    }

    // Write JSON file safely using temp file
    private async Task WriteStoreAsync(FeatureStore store, CancellationToken cancellationToken)
    {
        EnsureDirectory();

        var tempPath = _filePath + ".tmp";

        await using (var stream = File.Create(tempPath))
        {
            await JsonSerializer.SerializeAsync(stream, store, _jsonOptions, cancellationToken);
        }

        File.Move(tempPath, _filePath, true);
    }

    // Create Data directory if needed
    private void EnsureDirectory()
    {
        var directory = Path.GetDirectoryName(_filePath);
        if (!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
    }
}