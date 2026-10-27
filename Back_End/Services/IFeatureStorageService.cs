using PropertyGis.Api.Models;
namespace PropertyGis.Api.Services;
// Feature storage contract
public interface IFeatureStorageService
{
    Task<IReadOnlyList<StoredFeature>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<StoredFeature?> GetAsync(int layerId, string featureId, CancellationToken cancellationToken = default);
    Task<SaveFeatureResult> SaveAsync(SaveFeatureRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int layerId, string featureId, CancellationToken cancellationToken = default);
}
// // Save result status
public enum SaveFeatureStatus
{
    Created,
    Duplicate
}
// // Save result
public sealed record SaveFeatureResult(SaveFeatureStatus Status, StoredFeature Feature);