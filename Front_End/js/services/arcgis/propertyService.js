import * as geometryEngine from "https://js.arcgis.com/4.32/@arcgis/core/geometry/geometryEngine.js";
import { queryByGeometry } from "./queryService.js";
const ROAD_BUFFER_METERS = 15;
export async function getPropertiesForRoad(propertiesLayer, roadGeometry) {
  if (!roadGeometry) {
    return [];
  }
  const buffer = geometryEngine.buffer(
    roadGeometry,
    ROAD_BUFFER_METERS,
    "meters",
  );
  if (!buffer) {
    return [];
  }
  return queryByGeometry(propertiesLayer, buffer);
}
export function propertyLabel(feature) {
  const a = feature.attributes ?? {};
  const houseNumber = a.HouseNumber ?? "";
  const extension = a.HouseNumberExtension ?? "";
  const streetName = String(a.StreetName ?? "").trim();
  const address = `${houseNumber}${extension} ${streetName}`.trim();
  return (
    address ||
    String(a.ValuationReference ?? "") ||
    `Property ${a.PropertyID ?? a.OBJECTID}`
  );
}
