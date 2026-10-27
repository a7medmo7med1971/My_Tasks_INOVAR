// ==================================================
// ArcGIS Feature -> API Payload
export function buildFeaturePayload( feature,featureType, measurements = null)
 {
  if (!feature) {
    throw new Error("Feature is required.");
  }
  const geometry =feature.geometry;
  if (!geometry) {
    throw new Error("Feature geometry is required.");
  }

  const layer =getLayerInfo(featureType);
  if (!layer) {
    throw new Error(`Feature type "${featureType}" cannot be saved.`);
  }

  const featureId =getFeatureId(feature);
  if (!featureId) {
    throw new Error("Feature OBJECTID was not found.");
  }

  return {
    layer,
    featureId,
    geometryType:normalizeGeometryType(geometry.type),
    spatialReference: {wkid:geometry.spatialReference?.wkid ?? 2193},
    geometry:geometry.toJSON(),
    attributes: {  ...feature.attributes},
    measurements
  };
}
// ==================================================
// Allowed Layers
function getLayerInfo(featureType) {
  switch (featureType) {
    case "property":
      return {
        id: 0,
        name: "Properties"
      };

    case "address":
      return {
        id: 2,
        name: "Street Address"
      };

    case "road":
      return {
        id: 3,
        name: "Roads"
      };

    default:
      return null;
  }
}
// ==================================================
// Feature ID
function getFeatureId(feature) {
  const attributes =
    feature.attributes ?? {};
  const id =
    attributes.OBJECTID ??
    attributes.ObjectId ??
    attributes.objectid;
  if (
    id === null ||
    id === undefined
  ) {
    return null;
  }
  return String(id);
}
// ==================================================
// Geometry Type
function normalizeGeometryType(type) {
  switch (type) {

    case "point":
      return "point";

    case "polyline":
      return "polyline";

    case "polygon":
      return "polygon";

    case "multipoint":
      return "multipoint";

    default:
      return type;
  }
}