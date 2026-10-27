import FeatureLayer from "https://js.arcgis.com/4.32/@arcgis/core/layers/FeatureLayer.js";
import { LAYER_URLS } from "../services/arcgis/layerConfig.js";

export function createMapLayers() {
  const parcels = new FeatureLayer({ url: LAYER_URLS.parcels, title: "LINZ Primary Parcels", outFields: ["*"], visible: false, popupEnabled: true });
  const properties = new FeatureLayer({ url: LAYER_URLS.properties, title: "ORC Properties", outFields: ["*"], visible: false, popupEnabled: true });
  const addresses = new FeatureLayer({ url: LAYER_URLS.addresses, title: "Street Address", outFields: ["*"], visible: false, popupEnabled: true });
  const roads = new FeatureLayer({ url: LAYER_URLS.roads, title: "Roads", outFields: ["*"], visible: false, popupEnabled: false });
  return { parcels, properties, addresses, roads };
}
