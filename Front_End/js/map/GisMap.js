import Map from "https://js.arcgis.com/4.32/@arcgis/core/Map.js";
import MapView from "https://js.arcgis.com/4.32/@arcgis/core/views/MapView.js";
import LayerList from "https://js.arcgis.com/4.32/@arcgis/core/widgets/LayerList.js";
import Expand from "https://js.arcgis.com/4.32/@arcgis/core/widgets/Expand.js";
import { queryByObjectId } from "../services/arcgis/queryService.js";
import { createMapLayers } from "./MapLayers.js";
import { INITIAL_EXTENT } from "../lib/constants.js";

export async function initializeMap(onReady, onError) {
  try {
    const layers = createMapLayers();
    const map = new Map({ basemap: "hybrid", layers: [layers.roads, layers.addresses, layers.parcels, layers.properties] });
    const view = new MapView({
      container: "gis-map", map, extent: INITIAL_EXTENT, padding: { left: 350 }, popupEnabled: true,
      popup: { dockEnabled: true, dockOptions: { position: "bottom-right", breakpoint: false } },
    });

    await view.when();
    view.ui.move("zoom", "top-right");
    await Promise.all(Object.values(layers).map((layer) => layer.load()));

    Object.values(layers).forEach((layer) => {
      layer.popupEnabled = true;
      layer.popupTemplate = {
        title: layer.title,
        content: [{ type: "fields", fieldInfos: layer.fields.map((field) => ({ fieldName: field.name, label: field.alias || field.name, visible: true })) }],
      };
    });

    view.on("click", async (event) => {
      try {
        const hitResponse = await view.hitTest(event, { include: Object.values(layers) });
        const graphicHit = hitResponse.results.find((result) => result.type === "graphic" && Object.values(layers).includes(result.graphic.layer));
        if (!graphicHit || graphicHit.type !== "graphic") return;
        const clickedGraphic = graphicHit.graphic;
        const layer = clickedGraphic.layer;
        if (!layer) return;
        const objectId = clickedGraphic.attributes?.[layer.objectIdField];
        if (objectId === null || objectId === undefined) return;
        const feature = await queryByObjectId(layer, objectId);
        if (!feature) return;
        // onFeatureClick?.(feature,layer);
        feature.popupTemplate = layer.popupTemplate;
        view.openPopup({ features: [feature], location: event.mapPoint ?? feature.geometry?.extent?.center });
      } catch (error) { console.error("Error opening feature popup:", error); }
    });

    const layerList = new LayerList({ view });
    const layerListExpand = new Expand({ view, content: layerList, expanded: false });
    view.ui.add(layerListExpand, "top-right");
    onReady({ view, layers ,map});
    return { view, layers };
  } catch (error) {
    console.error("ArcGIS initialization error:", error);
    onError?.("Error loading layer");
    throw error;
  }
}
