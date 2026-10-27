
import GraphicsLayer from "https://js.arcgis.com/4.32/@arcgis/core/layers/GraphicsLayer.js";
import Sketch from "https://js.arcgis.com/4.32/@arcgis/core/widgets/Sketch.js";
import Graphic from "https://js.arcgis.com/4.32/@arcgis/core/Graphic.js";
import Point from "https://js.arcgis.com/4.32/@arcgis/core/geometry/Point.js";
import Polyline from "https://js.arcgis.com/4.32/@arcgis/core/geometry/Polyline.js";
import Polygon from "https://js.arcgis.com/4.32/@arcgis/core/geometry/Polygon.js";
import SpatialReference from "https://js.arcgis.com/4.32/@arcgis/core/geometry/SpatialReference.js";
import * as geometryEngine from "https://js.arcgis.com/4.32/@arcgis/core/geometry/geometryEngine.js";
import * as projection from "https://js.arcgis.com/4.32/@arcgis/core/geometry/projection.js";

export function setupMapSketch(view, map, onGeometryComplete) {
  const sketchLayer = new GraphicsLayer({ title: "Drawings" });
  const shapefileLayer = new GraphicsLayer({ title: "Uploaded Shapefile" });
  const measurementLayer = new GraphicsLayer({ title: "Drawing Measurements", listMode: "hide" });
  map.addMany([sketchLayer, shapefileLayer, measurementLayer]);

  const sketch = new Sketch({ view, layer: sketchLayer, creationMode: "single", layout: "vertical", availableCreateTools: ["point", "polyline", "polygon", "rectangle", "circle"] });
  view.ui.add(sketch, "top-right");
  

  sketch.on("create", (event) => {
    if (event.state === "start") measurementLayer.removeAll();

    if (event.state === "active") {
      const geometry = event.graphic?.geometry;
      if (geometry) showLiveMeasurements(geometry, measurementLayer);
    }

    if (event.state === "complete") {
      const geometry = event.graphic.geometry;
      showLiveMeasurements(geometry, measurementLayer);
      onGeometryComplete?.(geometry);
    }//business flow

    if (event.state === "cancel") measurementLayer.removeAll();
  });

  // Clear measurements
  sketch.on("delete", () => {
    measurementLayer.removeAll();
  });

  setupShapefileTools(view, sketchLayer, shapefileLayer, measurementLayer);

// Add application Shapefile
const addApplicationShapefile = async (graphics) => {
  if (!graphics?.length) return;
  shapefileLayer.removeAll();
  graphics.forEach((graphic) => shapefileLayer.add(graphic));
  measurementLayer.removeAll();
  await view.goTo(graphics);
};
  return { sketch, sketchLayer, shapefileLayer, measurementLayer ,addApplicationShapefile };
}

// =================================================
// Shapefile Tools
function setupShapefileTools(view, sketchLayer, shapefileLayer, measurementLayer) {
  const downloadButton = document.getElementById("download-shapefile");
  const uploadButton = document.getElementById("upload-shapefile-button");
  const uploadInput = document.getElementById("upload-shapefile-input");

  if (downloadButton) downloadButton.addEventListener("click", () => downloadShapefile(sketchLayer));
  if (uploadButton && uploadInput) uploadButton.addEventListener("click", () => uploadInput.click());

  if (uploadInput) {
    uploadInput.addEventListener("change", async () => {
      const file = uploadInput.files?.[0];
      if (!file) return;

      try {
        await uploadShapefile(file, view, shapefileLayer, measurementLayer);
      } catch (error) {
        console.error("Shapefile upload error:", error);
        window.alert("Could not upload Shapefile.");
      } finally {
        uploadInput.value = "";
      }
    });
  }
}

// =================================================
// Download Shapefile
async function downloadShapefile(sketchLayer) {
  try {
    const graphics = sketchLayer.graphics.toArray().filter((graphic) => graphic.geometry);

    if (!graphics.length) {
      window.alert("Draw something first.");
      return;
    }

    if (!window.shpwrite) {
      window.alert("Shapefile export library is not loaded.");
      return;
    }

    await projection.load();

    const wgs84 = new SpatialReference({ wkid: 4326 });
    const features = [];

    for (let i = 0; i < graphics.length; i += 1) {
      const graphic = graphics[i];
      const projectedGeometry = projection.project(graphic.geometry, wgs84);

      if (!projectedGeometry) continue;

      const geojsonGeometry = arcgisGeometryToGeoJSON(projectedGeometry);

      if (!geojsonGeometry) continue;

      features.push({
        type: "Feature",
        geometry: geojsonGeometry,
        properties: {
          id: i + 1,
          type: graphic.geometry.type
        }
      });
    }

    if (!features.length) {
      window.alert("No valid drawings to export.");
      return;
    }

    const featureCollection = {
      type: "FeatureCollection",
      features
    };

    window.shpwrite.download(featureCollection, {
      folder: "drawings",
      filename: "drawings",
      outputType: "blob",
      compression: "DEFLATE"
    });
  } catch (error) {
    console.error("Shapefile download error:", error);
    window.alert("Could not create Shapefile.");
  }
}

// =================================================
// Upload Shapefile
// =================================================

async function uploadShapefile(file, view, shapefileLayer, measurementLayer) {
  if (!window.shp) throw new Error("Shapefile library is not loaded.");

  const buffer = await file.arrayBuffer();
  const result = await window.shp(buffer);
  const collections = Array.isArray(result) ? result : [result];

  await projection.load();

  const sourceSR = new SpatialReference({ wkid: 4326 });
  const targetSR = view.spatialReference;
  const uploadedGraphics = [];

  // Clear old Shapefile
  shapefileLayer.removeAll();

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
        symbol: getSketchSymbol(projectedGeometry)
      });

      shapefileLayer.add(graphic);
      uploadedGraphics.push(graphic);
    }
  }

  if (!uploadedGraphics.length) {
    window.alert("No valid features found in Shapefile.");
    return;
  }

  // Shapefile extent
 // Building extent and ArcGIS popup
uploadedGraphics.forEach((graphic) => {
  const extent = graphic.geometry.extent;
  graphic.attributes = { ...graphic.attributes, EXT_NORTH: extent?.ymax?.toFixed(2) ?? "", EXT_SOUTH: extent?.ymin?.toFixed(2) ?? "", EXT_EAST: extent?.xmax?.toFixed(2) ?? "", EXT_WEST: extent?.xmin?.toFixed(2) ?? "" };
  graphic.popupTemplate = createShapefilePopup(graphic.attributes);
});
 

  measurementLayer.removeAll();

  if (uploadedGraphics.length === 1) showLiveMeasurements(uploadedGraphics[0].geometry, measurementLayer);

  await view.goTo(uploadedGraphics);
}

// =================================================
// Shapefile Popup
function createShapefilePopup(attributes) {
  const ignoredFields = ["__uploadedShapefile", "EXT_NORTH", "EXT_SOUTH", "EXT_EAST", "EXT_WEST"];
  const fieldInfos = Object.keys(attributes).filter((field) => !ignoredFields.includes(field)).map((field) => ({ fieldName: field, label: field }));

  return {
    title: "Building Details",
    content: [
      {
        type: "fields",
        fieldInfos
      },
      {
        type: "text",
        text: `<b>Building Extent</b><br>North: {EXT_NORTH}<br>South: {EXT_SOUTH}<br>East: {EXT_EAST}<br>West: {EXT_WEST}`
      }
    ]
  };
}

// =================================================
// ArcGIS -> GeoJSON
function arcgisGeometryToGeoJSON(geometry) {
  if (!geometry) return null;

  if (geometry.type === "point") {
    return {
      type: "Point",
      coordinates: [geometry.x, geometry.y]
    };
  }

  if (geometry.type === "polyline") {
    if (geometry.paths.length === 1) {
      return {
        type: "LineString",
        coordinates: geometry.paths[0]
      };
    }

    return {
      type: "MultiLineString",
      coordinates: geometry.paths
    };
  }

  if (geometry.type === "polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.rings
    };
  }

  return null;
}

// =================================================
// GeoJSON -> ArcGIS
function geoJSONToArcGISGeometry(geometry, spatialReference) {
  if (!geometry) return null;

  if (geometry.type === "Point") {
    return new Point({
      x: geometry.coordinates[0],
      y: geometry.coordinates[1],
      spatialReference
    });
  }

  if (geometry.type === "LineString") {
    return new Polyline({
      paths: [geometry.coordinates],
      spatialReference
    });
  }

  if (geometry.type === "MultiLineString") {
    return new Polyline({
      paths: geometry.coordinates,
      spatialReference
    });
  }

  if (geometry.type === "Polygon") {
    return new Polygon({
      rings: geometry.coordinates,
      spatialReference
    });
  }

  if (geometry.type === "MultiPolygon") {
    const rings = [];

    geometry.coordinates.forEach((polygon) => {
      polygon.forEach((ring) => rings.push(ring));
    });

    return new Polygon({
      rings,
      spatialReference
    });
  }

  return null;
}

// =================================================
// Uploaded Symbols
function getSketchSymbol(geometry) {
  if (geometry.type === "point") {
    return {
      type: "simple-marker",
      color: [0, 122, 194, 0.9],
      size: 8,
      outline: {
        color: "white",
        width: 1
      }
    };
  }

  if (geometry.type === "polyline") {
    return {
      type: "simple-line",
      color: [0, 122, 194, 1],
      width: 2
    };
  }

  if (geometry.type === "polygon") {
    return {
      type: "simple-fill",
      color: [0, 122, 194, 0.15],
      outline: {
        color: [0, 122, 194, 1],
        width: 2
      }
    };
  }

  return null;
}

// =================================================
// Measurements
// =================================================

function showLiveMeasurements(geometry, layer) {
  layer.removeAll();

  if (!geometry) return;

  if (geometry.type === "point") {
    addText(layer, geometry, `X: ${geometry.x.toFixed(2)}\nY: ${geometry.y.toFixed(2)}`, 0);
    return;
  }

  if (geometry.type === "polyline") {
    showPolylineMeasurements(geometry, layer);
    return;
  }

  if (geometry.type === "polygon") showPolygonMeasurements(geometry, layer);
}

function showPolylineMeasurements(polyline, layer) {
  const path = polyline.paths?.[0];

  if (!path || path.length < 2) return;

  for (let i = 0; i < path.length - 1; i += 1) {
    addSegmentMeasurement(layer, path[i], path[i + 1], polyline.spatialReference);
  }

  const length = geometryEngine.planarLength(polyline, "meters");
  const last = path[path.length - 1];

  addText(
    layer,
    new Point({
      x: last[0],
      y: last[1],
      spatialReference: polyline.spatialReference
    }),
    `Total: ${length.toFixed(2)} m`,
    18
  );
}

function showPolygonMeasurements(polygon, layer) {
  const ring = polygon.rings?.[0];

  if (!ring || ring.length < 2) return;

  for (let i = 0; i < ring.length - 1; i += 1) {
    addSegmentMeasurement(layer, ring[i], ring[i + 1], polygon.spatialReference);
  }

  const area = Math.abs(
    geometryEngine.planarArea(polygon, "square-meters")
  );

  const perimeter = geometryEngine.planarLength(
    polygon,
    "meters"
  );

  const center = polygon.centroid;

  if (center) {
    addText(
      layer,
      center,
      `Area: ${area.toFixed(2)} m²\nPerimeter: ${perimeter.toFixed(2)} m`,
      0
    );
  }
}

function addSegmentMeasurement(layer, start, end, spatialReference) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);

  if (!length) return;

  const midpoint = new Point({
    x: (start[0] + end[0]) / 2,
    y: (start[1] + end[1]) / 2,
    spatialReference
  });

  let angle = -(Math.atan2(dy, dx) * 180 / Math.PI);

  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;

  addText(
    layer,
    midpoint,
    `${length.toFixed(2)} m`,
    10,
    angle
  );
}

function addText(layer, point, text, yoffset = 0, angle = 0) {
  layer.add(
    new Graphic({
      geometry: point,
      symbol: {
        type: "text",
        text,
        color: "black",
        haloColor: "white",
        haloSize: 2,
        angle,
        yoffset,
        font: {
          size: 11,
          weight: "bold"
        }
      },
      attributes: {
        __sketchMeasurement: true
      }
    })
  );
}
