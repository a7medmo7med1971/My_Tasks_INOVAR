import { queryByGeometry } from "./queryService.js";
export async function getAddressesForProperty(layer,parcelGeometry){
  return queryByGeometry(layer,parcelGeometry);
}
export function addressLabel(feature) {
  const attributes = feature.attributes ?? {};
  return String(
    attributes.full_address ??
    attributes.address ??
    attributes.OBJECTID ??
    "Address"
  );
}