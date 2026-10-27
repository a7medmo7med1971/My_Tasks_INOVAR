import {getGeometryCoordinates} from "../services/arcgis/geometryService.js";
import {renderParcelMeasurements} from "./ParcelMeasurements.js";

export function renderFeatureDetails(feature,featureType = "")
 {
  const container =document.getElementById("feature-details");

  if (!feature) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  // ------------------------------------------
  // Coordinates
  // ------------------------------------------
  const coordinates = feature.geometry
    ? `
      <p class="coordinates">
        <strong>Coordinates:</strong>
        ${getGeometryCoordinates(feature.geometry)}
      </p>
    `
    : "";
  // ------------------------------------------
  // Polygon measurements
  // Property + Parcel ONLY
  let measurements = "";
  const shouldShowMeasurements =(featureType === "property" ||featureType === "parcel") &&
    feature.geometry?.type === "polygon";

  if (shouldShowMeasurements) {measurements = renderParcelMeasurements(feature.geometry);}
  // ------------------------------------------
  // Render
  container.innerHTML = `
    <h3>Selected feature details</h3>
    ${coordinates}
    ${measurements}
  `;
  container.hidden = false;
}