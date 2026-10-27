export async function queryByGeometry(layer, geometry, outFields = ["*"]) {
  const query = layer.createQuery();
  query.geometry = geometry;
  query.spatialRelationship = "intersects";
  query.outFields = outFields;
  query.returnGeometry = true;
  query.num = 1000;
  const result = await layer.queryFeatures(query);
  return result.features;
}
export async function queryByObjectId(layer, objectId) {
  const query = layer.createQuery();
  query.objectIds = [objectId];
  query.outFields = ["*"];
  query.returnGeometry = true;
  const result = await layer.queryFeatures(query);
  return result.features[0] ?? null;
}
export async function queryByWhere(layer, where, outFields = ["*"]) {
  const query = layer.createQuery();
  query.where = where;
  query.outFields = outFields;
  query.returnGeometry = true;
  query.num = 1000;
  const result = await layer.queryFeatures(query);
  return result.features;
}
