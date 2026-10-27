
import Graphic from "https://js.arcgis.com/4.32/@arcgis/core/Graphic.js";
import Point from "https://js.arcgis.com/4.32/@arcgis/core/geometry/Point.js";
import Polyline from "https://js.arcgis.com/4.32/@arcgis/core/geometry/Polyline.js";
import Polygon from "https://js.arcgis.com/4.32/@arcgis/core/geometry/Polygon.js";
import SpatialReference from "https://js.arcgis.com/4.32/@arcgis/core/geometry/SpatialReference.js";
import * as geometryEngine from "https://js.arcgis.com/4.32/@arcgis/core/geometry/geometryEngine.js";
import * as projection from "https://js.arcgis.com/4.32/@arcgis/core/geometry/projection.js";

let pendingGraphics = [];
let pendingFile = null;
let buildingArea = 0;
let mapContext = null;

export function setupApplicationForm(context) {
  mapContext = context;

  const openButton = document.getElementById("new-application-button");
  const modal = document.getElementById("application-modal");
  const closeButton = document.getElementById("application-close");
  const cancelButton = document.getElementById("application-cancel");
  const submitButton = document.getElementById("application-submit");
  const fileInput = document.getElementById("application-shapefile");

  openButton?.addEventListener("click", () => openModal(modal));
  closeButton?.addEventListener("click", () => closeModal(modal));
  cancelButton?.addEventListener("click", () => closeModal(modal));
  fileInput?.addEventListener("change", async () => await handleShapefile(fileInput.files?.[0]));
  submitButton?.addEventListener("click", async () => await submitApplication(modal));
}

// Open modal
function openModal(modal) {
  document.getElementById("application-error").textContent = "";
  modal.hidden = false;
}

// Read Shapefile without adding to map
async function handleShapefile(file) {
  const status = document.getElementById("shapefile-status");
  const areaInput = document.getElementById("building-area");
  const error = document.getElementById("application-error");

  pendingGraphics = [];
  pendingFile = null;
  buildingArea = 0;
  areaInput.value = "";
  error.textContent = "";

  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".zip")) {
    error.textContent = "Please upload a ZIP Shapefile.";
    return;
  }

  if (!window.shp) {
    error.textContent = "Shapefile library is not loaded.";
    return;
  }

  try {
    status.textContent = "Reading Shapefile...";

    const buffer = await file.arrayBuffer();
    const result = await window.shp(buffer);
    const collections = Array.isArray(result) ? result : [result];

    await projection.load();

    const sourceSR = new SpatialReference({ wkid: 4326 });
    const targetSR = mapContext.view.spatialReference;

    for (const collection of collections) {
      if (!collection?.features) continue;

      for (const feature of collection.features) {
        const geometry = geoJSONToArcGISGeometry(feature.geometry, sourceSR);
        if (!geometry) continue;

        const projectedGeometry = targetSR?.wkid === 4326 ? geometry : projection.project(geometry, targetSR);
        if (!projectedGeometry) continue;

        const graphic = new Graphic({
          geometry: projectedGeometry,
          attributes: { ...(feature.properties || {}), __uploadedShapefile: true },
          symbol: getShapefileSymbol(projectedGeometry)
        });

        setBuildingExtent(graphic);
        graphic.popupTemplate = createBuildingPopup(graphic.attributes);

        pendingGraphics.push(graphic);

        if (projectedGeometry.type === "polygon") buildingArea += Math.abs(geometryEngine.planarArea(projectedGeometry, "square-meters"));
      }
    }

    if (!pendingGraphics.length) throw new Error("No valid features found.");

    pendingFile = file;
    areaInput.value = buildingArea.toFixed(2);
    status.textContent = `${pendingGraphics.length} feature(s) loaded successfully.`;
  } catch (err) {
    console.error("Application Shapefile error:", err);
    pendingGraphics = [];
    pendingFile = null;
    buildingArea = 0;
    areaInput.value = "";
    status.textContent = "";
    error.textContent = "Could not read the Shapefile.";
  }
}

// Submit application
async function submitApplication(modal) {
  const applicationType = document.getElementById("application-type").value;
  const propertyUse = document.getElementById("property-use").value;
  const applicantType = document.getElementById("applicant-type").value;
  const reason = document.getElementById("application-reason").value.trim();
  const error = document.getElementById("application-error");
  const submitButton = document.getElementById("application-submit");

  if (!applicationType || !propertyUse || !applicantType || !reason) {
    error.textContent = "Please complete all required fields.";
    return;
  }

  if (!pendingFile || !pendingGraphics.length) {
    error.textContent = "Please upload a valid Building Shapefile.";
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    error.textContent = "";

    const application = {
      applicationType,
      propertyUse,
      applicantType,
      reason,
      buildingArea: Number(buildingArea.toFixed(2)),
      shapefileName: pendingFile.name
    };

    console.log("APPLICATION:", application);

    // Show Shapefile only after submit
    await mapContext.addApplicationShapefile(pendingGraphics);

    modal.hidden = true;

    console.log("Application submitted successfully.");
  } catch (err) {
    console.error("Submit application error:", err);
    error.textContent = "Could not submit application.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Application";
  }
}

// Building extent
function setBuildingExtent(graphic) {
  const extent = graphic.geometry?.extent;
  if (!extent) return;

  graphic.attributes = { ...graphic.attributes, EXT_NORTH: extent.ymax?.toFixed(2) ?? "", EXT_SOUTH: extent.ymin?.toFixed(2) ?? "", EXT_EAST: extent.xmax?.toFixed(2) ?? "", EXT_WEST: extent.xmin?.toFixed(2) ?? "" };
}

// Building popup
function createBuildingPopup(attributes) {
  const ignoredFields = ["__uploadedShapefile", "EXT_NORTH", "EXT_SOUTH", "EXT_EAST", "EXT_WEST"];
  const fieldInfos = Object.keys(attributes).filter((field) => !ignoredFields.includes(field)).map((field) => ({ fieldName: field, label: field }));

  return {
    title: "Building Details",
    content: [
      { type: "fields", fieldInfos },
      { type: "text", text: `<b>Building Extent</b><br>North: {EXT_NORTH}<br>South: {EXT_SOUTH}<br>East: {EXT_EAST}<br>West: {EXT_WEST}` }
    ]
  };
}

// GeoJSON -> ArcGIS
function geoJSONToArcGISGeometry(geometry, spatialReference) {
  if (!geometry) return null;

  if (geometry.type === "Point") return new Point({ x: geometry.coordinates[0], y: geometry.coordinates[1], spatialReference });
  if (geometry.type === "LineString") return new Polyline({ paths: [geometry.coordinates], spatialReference });
  if (geometry.type === "MultiLineString") return new Polyline({ paths: geometry.coordinates, spatialReference });
  if (geometry.type === "Polygon") return new Polygon({ rings: geometry.coordinates, spatialReference });

  if (geometry.type === "MultiPolygon") {
    const rings = [];
    geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => rings.push(ring)));
    return new Polygon({ rings, spatialReference });
  }

  return null;
}

// Shapefile symbol
function getShapefileSymbol(geometry) {
  if (geometry.type === "point") return { type: "simple-marker", color: [0, 122, 194, 0.9], size: 8, outline: { color: "white", width: 1 } };
  if (geometry.type === "polyline") return { type: "simple-line", color: [0, 122, 194, 1], width: 2 };
  if (geometry.type === "polygon") return { type: "simple-fill", color: [0, 122, 194, 0.15], outline: { color: [0, 122, 194, 1], width: 2 } };
  return null;
}

// Close modal
function closeModal(modal) {
  modal.hidden = true;
}
