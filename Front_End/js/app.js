import { initializeMap } from "./map/GisMap.js";
import { setupMapSketch } from "./map/MapSketch.js";
import { getPropertiesForRoad, propertyLabel } from "./services/arcgis/propertyService.js";
import { getAddressesForProperty, addressLabel } from "./services/arcgis/addressService.js";
import { getTerritorialAuthorities, getLocalitiesForAuthority, getRoadsForLocality, roadLabel } from "./services/arcgis/roadService.js";
import { getHighlightSymbol } from "./map/MapHighlight.js";
import { zoomToGeometry } from "./map/MapNavigation.js";
import { getPopupLocation } from "./services/arcgis/geometryService.js";
import PropertyPopup from "./property/PropertyPopup.js";
import { renderFeatureDetails } from "./property/FeatureDetails.js";
import { setupTerritorialAuthoritySelect, updateTerritorialAuthoritySelect } from "./filters/TerritorialAuthoritySelect.js";
import { setupLocalitySelect, updateLocalitySelect } from "./filters/LocalitySelect.js";
import { setupRoadSelect, updateRoadSelect } from "./filters/RoadSelect.js";
import { setupPropertySelect, updatePropertySelect } from "./filters/PropertySelect.js";
import { setupStreetSelect, updateStreetSelect } from "./filters/StreetSelect.js";
import { setupCoordinateTool } from "./map/CoordinateTool.js";
import { showPolygonSideMeasurements, clearPolygonSideMeasurements, showPropertyRoadDistance } from "./map/MapMeasurements.js";
import { setupFeatureSave, setFeatureForSave } from "./property/FeatureSave.js";
import { getParcelMeasurements } from "./property/ParcelMeasurements.js";
import { saveFeature } from "./services/apis/featureApiService.js";
import { buildFeaturePayload } from "./services/apis/featurePayload.js";
import * as geometryEngine from "https://js.arcgis.com/4.32/@arcgis/core/geometry/geometryEngine.js";
import { queryByGeometry } from "./services/arcgis/queryService.js";
import { setupApplicationForm } from "./application/ApplicationForm.js";
// =================================================
// State
const state = {
  context: null,
  authorities: [],
  localities: [],
  roads: [],
  properties: [],
  streets: [],
  authority: "",
  locality: "",
  roadId: "",
  propertyId: "",
  streetId: "",
  selectedFeature: null,
  selectedFeatureType: "",
  error: "",
  loading: true
};
// =================================================
// Convert Features to Select Options
function toOptions(features, label) {
  return features.map((feature) => ({
    label: label(feature),
    value: String(feature.attributes?.OBJECTID),
    feature
  }));
}
// =================================================
// Render UI
function render() {
  const status = document.getElementById("status");
  const error = document.getElementById("error");
  status.hidden = !state.loading;
  error.hidden = !state.error;
  error.textContent = state.error;
  updateTerritorialAuthoritySelect(state.authorities, state.authority, state.loading);
  updateLocalitySelect(state.localities, state.locality, !state.authority || state.loading);
  updateRoadSelect(state.roads, state.roadId, !state.locality || state.loading);
  updatePropertySelect(state.properties, state.propertyId, !state.roadId || state.loading);
  updateStreetSelect(state.streets, state.streetId, !state.propertyId || state.loading);
  renderFeatureDetails(state.selectedFeature, state.selectedFeatureType);
}
function setError(message = "") {
  state.error = message;
  render();
}
// =================================================
// Load Territorial Authorities
async function loadTerritorialAuthorities() {
  if (!state.context) return;

  try {
    state.loading = true;
    state.error = "";
    render();

    const authorities = await getTerritorialAuthorities(state.context.layers.roads);

    state.authorities = authorities.map((authority) => ({
      label: authority,
      value: authority
    }));
  } catch (error) {
    console.error("Error loading territorial authorities:", error);
    state.error = "Could not load territorial authorities.";
  } finally {
    state.loading = false;
    render();
  }
}
// =================================================
// Graphics Helpers
function removeSelectedHighlight(view) {
  const oldSelected = view.graphics.find((graphic) => graphic.attributes?.__selected === true);
  if (oldSelected) view.graphics.remove(oldSelected);
}
// Remove only selection properties
function removeSelectionGraphics(view) {
  const graphics = view.graphics.filter((graphic) => graphic.attributes?.__selectionFeature === true).toArray();
  if (graphics.length) view.graphics.removeMany(graphics);
}
// =================================================
// Zoom + Highlight Selected Feature
async function selectFeature(option, featureType) {
  if (!state.context || !option?.feature?.geometry) return;

  const view = state.context.view;

  state.error = "";
  state.selectedFeature = option.feature;
  state.selectedFeatureType = featureType;

  clearPolygonSideMeasurements(view);

  if (featureType === "property" && option.feature.geometry?.type === "polygon") {
    showPolygonSideMeasurements(view, option.feature.geometry);
  }

  prepareFeatureForSave(option.feature, featureType);
  render();

  // Remove previous selected highlight
  removeSelectedHighlight(view);

  // Create selected highlight
  const highlight = option.feature.clone();
  highlight.symbol = getHighlightSymbol(option.feature, featureType, true);

  highlight.attributes = {
    ...highlight.attributes,
    __selected: featureType !== "property"
  };

  view.graphics.add(highlight);

  try {
    await zoomToGeometry(view, option.feature.geometry);

    option.feature.popupTemplate = PropertyPopup(option.feature);

    view.openPopup({
      features: [option.feature],
      location: getPopupLocation(option.feature.geometry)
    });
  } catch (error) {
    console.error("Error selecting feature:", error);
    setError("The feature was selected, but the map could not zoom to it.");
  }
}
// =================================================
// Territorial Authority Selected
async function onAuthorityChange(value) {
  if (!state.context) return;

  state.authority = value;
  state.locality = "";
  state.roadId = "";
  state.propertyId = "";
  state.streetId = "";
  state.localities = [];
  state.roads = [];
  state.properties = [];
  state.streets = [];
  state.selectedFeature = null;
  state.selectedFeatureType = "";
  state.error = "";
  // Clear old selection graphics
  removeSelectionGraphics(state.context.view);
  render();

  try {
    const localities = await getLocalitiesForAuthority(state.context.layers.roads, value);

    state.localities = localities.map((locality) => ({
      label: locality,
      value: locality
    }));

    state.error = localities.length ? "" : "No localities found for this territorial authority.";
    render();
  } catch (error) {
    console.error("Error loading localities:", error);
    setError("Could not load localities for this territorial authority.");
  }
}
// =================================================
// Locality Selected
async function onLocalityChange(value) {
  if (!state.context) return;

  state.locality = value;
  state.roadId = "";
  state.propertyId = "";
  state.streetId = "";
  state.roads = [];
  state.properties = [];
  state.streets = [];
  state.selectedFeature = null;
  state.selectedFeatureType = "";
  state.error = "";

  // Clear old selection graphics
  removeSelectionGraphics(state.context.view);
  render();

  try {
    const features = await getRoadsForLocality(state.context.layers.roads, state.authority, value);
    state.roads = toOptions(features, roadLabel);
    state.error = features.length ? "" : "No roads found for this locality.";
    render();
  } catch (error) {
    console.error("Error loading roads:", error);
    setError("Could not load roads for this locality.");
  }
}
// =================================================
// Road Selected
async function onRoadChange(value) {
  const option = state.roads.find((item) => item.value === value);
  if (!option || !state.context) return;

  state.roadId = value;
  state.propertyId = "";
  state.streetId = "";

  state.properties = [];
  state.streets = [];
  state.error = "";

  // Remove properties from previous road
  removeSelectionGraphics(state.context.view);

  render();

  await selectFeature(option, "road");

  try {
    const features = await getPropertiesForRoad(
      state.context.layers.properties,
      option.feature.geometry
    );

    state.properties = toOptions(features, propertyLabel);

    // Draw properties returned by current selection
    features.forEach((feature) => {
      const graphic = feature.clone();

      // Transparent fill so basemap stays visible
      graphic.symbol = {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: {
          color: [0, 100, 255, 1],
          width: 2
        }
      };

      // Mark this graphic for Sketch intersect
      graphic.attributes = {
        ...graphic.attributes,
        __selected: false,
        // __selectionFeature: true,
        // __featureType: "property"
      };

      state.context.view.graphics.add(graphic);
    });

    state.error = features.length
      ? ""
      : "No properties found within 15 meters of this road.";

    render();
  } catch (error) {
    console.error("Error loading properties for road:", error);
    setError("Could not load properties for this road.");
  }
}
// =================================================
// Property Selected
async function onPropertyChange(value) {
  const option = state.properties.find((item) => item.value === value);
  if (!option || !state.context) return;

  state.propertyId = value;
  state.streetId = "";
  state.streets = [];
  state.error = "";

  render();

  await selectFeature(option, "property");

  const roadOption = state.roads.find((item) => item.value === state.roadId);

  if (roadOption) {
    showPropertyRoadDistance(
      state.context.view,
      option.feature.geometry,
      roadOption.feature.geometry
    );
  }

  try {
    const features = await getAddressesForProperty(
      state.context.layers.addresses,
      option.feature.geometry
    );

    state.streets = toOptions(features, addressLabel);

    state.error = features.length
      ? ""
      : "No address points intersect this property.";

    render();
  } catch (error) {
    console.error("Error loading addresses:", error);
    setError("Could not load addresses for this property.");
  }
}
// =================================================
// Address Selected
async function onStreetChange(value) {
  const option = state.streets.find((item) => item.value === value);
  if (!option || !state.context) return;
  state.streetId = value;
  state.error = "";
  render();
  await selectFeature(option, "address");
}
// =================================================
// Setup Selects
setupTerritorialAuthoritySelect((value) => void onAuthorityChange(value));
setupLocalitySelect((value) => void onLocalityChange(value));
setupRoadSelect((value) => void onRoadChange(value));
setupPropertySelect((value) => void onPropertyChange(value));
setupStreetSelect((value) => void onStreetChange(value));
setupFeatureSave();
render();
// =================================================
// Prepare Feature For Save
function prepareFeatureForSave(feature, featureType) {
  if (!feature) {
    setFeatureForSave(null, "", null);
    return;
  }
  // Property
  if (featureType === "property" && feature.geometry?.type === "polygon") {
    const measurements = getParcelMeasurements(feature.geometry);
    setFeatureForSave(feature, featureType, measurements);
    return;
  }
  // Address
  if (featureType === "address") {
    setFeatureForSave(feature, featureType, null);
    return;
  }
  // Road
  if (featureType === "road") {
    setFeatureForSave(feature, featureType, null);
    return;
  }
  setFeatureForSave(null, "", null);
}
// =================================================
// Map Feature Click
function handleMapFeatureClick(feature, layer) {
  if (!feature || !layer) return;
  let featureType = "";
  if (layer === state.context?.layers.properties) {
    featureType = "property";
  } else if (layer === state.context?.layers.addresses) {
    featureType = "address";
  } else if (layer === state.context?.layers.roads) {
    featureType = "road";
  } else {
    return;
  }

  state.selectedFeature = feature;
  state.selectedFeatureType = featureType;
  clearPolygonSideMeasurements(state.context.view);
  if (featureType === "property" && feature.geometry?.type === "polygon") {
    showPolygonSideMeasurements(state.context.view, feature.geometry);
  }
  prepareFeatureForSave(feature, featureType);
  render();
}
// =================================================
// Initialize Map
initializeMap(
  // Ready
  (context) => {
    state.context = context;
    const sketchContext = setupMapSketch(context.view,context.map,handleDrawComplete);
    setupApplicationForm({view: context.view,addApplicationShapefile: sketchContext.addApplicationShapefile});
    setupCoordinateTool?.(context.view);
    void loadTerritorialAuthorities();
  },
  // Error
  (message) => {
    state.error = message;
    state.loading = false;
    render();
  },
  // Feature clicked
  handleMapFeatureClick
);
// =================================================>prisentge on map
function getIntersectPercent(propertyGeometry, drawGeometry) {
  try {
    if (!propertyGeometry || !drawGeometry || propertyGeometry.type !== "polygon" || drawGeometry.type !== "polygon") return 0;

    const intersection = geometryEngine.intersect(propertyGeometry, drawGeometry);
    if (!intersection) return 0;

    const propertyArea = Math.abs(geometryEngine.planarArea(propertyGeometry, "square-meters"));
    const intersectArea = Math.abs(geometryEngine.planarArea(intersection, "square-meters"));

    if (!propertyArea) return 0;

    return Math.min(100, (intersectArea / propertyArea) * 100);
  } catch (error) {
    console.error("Intersect percentage error:", error);
    return 0;
  }
}
// =================================================
function showIntersectResults(results) {
  const container = document.getElementById("intersect-results");
  const list = document.getElementById("intersect-results-list");
  list.innerHTML = "";

  if (!results.length) {
    container.hidden = true;
    return;
  }

  results.sort((a, b) => b.percent - a.percent);

  results.forEach(({ feature, percent }) => {
    const item = document.createElement("div");
    item.className = "intersect-result";

    const label = propertyLabel(feature);
    const value = percent.toFixed(2);

    item.innerHTML = `
      <div class="intersect-result-header">
        <span>${label}</span>
        <span class="intersect-percent">${value}%</span>
      </div>
      <div class="intersect-bar">
        <div class="intersect-bar-fill" style="width:${value}%"></div>
      </div>
    `;

    list.appendChild(item);
  });

  container.hidden = false;
}
// =================================================
// Sketch Intersect
async function handleDrawComplete(geometry) {
  if (!state.context || !geometry) return;

  try {
    // Query real Property layer using Sketch geometry
    const features = await queryByGeometry(state.context.layers.properties, geometry);

    console.log("QUERY INTERSECT RESULT:", features);

    if (!features.length) {
      window.alert("No features intersect this drawing.");
      return;
    }

    // Keep only properties from current user selection
    const selectedIds = new Set(state.properties.map((item) => String(item.feature?.attributes?.OBJECTID)));

    const intersected = features.filter((feature) => selectedIds.has(String(feature.attributes?.OBJECTID)));
    const results = intersected.map((feature) => ({
  feature,
  percent: getIntersectPercent(feature.geometry, geometry)
}));

showIntersectResults(results);

console.log("INTERSECT RESULTS:", results);

    console.log("CURRENT SELECTION:", state.properties.length);
    console.log("REAL QUERY INTERSECT:", intersected);

    if (!intersected.length) {
      window.alert("The drawing does not intersect any feature from the current selection.");
      return;
    }

    // Ask before sending
    const confirmed = window.confirm(`${intersected.length} feature(s) intersect the drawing.\n\nSend them to API?`);
    if (!confirmed) return;

    let saved = 0;
    let failed = 0;

    for (const feature of intersected) {
      try {
        const measurements = getParcelMeasurements(feature.geometry);
        const payload = buildFeaturePayload(feature, "property", measurements);

        console.log("INTERSECT API:", payload);

        await saveFeature(payload);
        saved += 1;
      } catch (error) {
        failed += 1;
        console.error("Save intersected feature error:", error);
      }
    }

    window.alert(failed === 0 ? `${saved} feature(s) sent successfully.` : `${saved} sent successfully. ${failed} failed.`);
  } catch (error) {
    console.error("Draw query intersect error:", error);
    setError("Could not query intersecting features.");
  }
}