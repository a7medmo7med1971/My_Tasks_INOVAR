export const MAP_SERVER = "https://maps.orc.govt.nz/arcgis/rest/services/PropertyExternal/MapServer";
export const LAYER_URLS = {
  properties: `${MAP_SERVER}/0`,
  parcels: `${MAP_SERVER}/1`,
  addresses: `${MAP_SERVER}/2`,
  roads: `${MAP_SERVER}/3`,
};
export const LAYER_IDS = { properties: 0, parcels: 1, addresses: 2, roads: 3 };
export const SPATIAL_REFERENCE = { wkid: 2193 };
