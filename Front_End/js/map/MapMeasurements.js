import Graphic from "https://js.arcgis.com/4.32/@arcgis/core/Graphic.js";
import Point from "https://js.arcgis.com/4.32/@arcgis/core/geometry/Point.js";
import Polyline from "https://js.arcgis.com/4.32/@arcgis/core/geometry/Polyline.js";
import { calculateParcelSides, calculatePropertyRoadDistance } from "../services/arcgis/geometryService.js";

export function showPolygonSideMeasurements(view, polygon) {
  clearPolygonSideMeasurements(view);
  if (!view || !polygon || polygon.type !== "polygon") return;

  const result = calculateParcelSides(polygon);

  result.sides.forEach((side) => {
    const dx = side.end[0] - side.start[0];
    const dy = side.end[1] - side.start[1];
    const sideLength = Math.hypot(dx, dy);
    let angle = -(Math.atan2(dy, dx) * 180 / Math.PI);
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    const offset = 1;

    const offsetX = (-dy / sideLength) * offset;
    const offsetY = (dx / sideLength) * offset;
    const x = side.midpoint[0] + offsetX;
    const y = side.midpoint[1] + offsetY;

    const point = new Point({ x: side.midpoint[0] + offsetX, y: side.midpoint[1] + offsetY, spatialReference: polygon.spatialReference,x ,y});
    const graphic = new Graphic({
      geometry: point,
      symbol: {
        type: "text",
        text: `${side.length.toFixed(2)} m`,
        color: "black",
        haloColor: "white",
        haloSize: 2,
        angle: angle,
        font: { size: 11, weight: "bold" }
      },
      attributes: { __measurementLabel: true, side: side.side, length: side.length }
    });

    view.graphics.add(graphic);
  });
}

export function clearPolygonSideMeasurements(view) {
  if (!view) return;
  const graphics = view.graphics.filter((graphic) => graphic.attributes?.__measurementLabel === true).toArray();
  view.graphics.removeMany(graphics);
}
///////////////////////
export function showPropertyRoadDistance(view, polygon, road) {
  clearPropertyRoadDistance(view);
  if (!view || !polygon || !road) return;

  const result = calculatePropertyRoadDistance(polygon, road);
  if (!result) return;

  const line = new Polyline({ paths: [[result.propertyPoint, result.roadPoint]], spatialReference: polygon.spatialReference });

  const lineGraphic = new Graphic({
    geometry: line,
    symbol: { type: "simple-line", width: 2, style: "dash" },
    attributes: { __propertyRoadDistance: true }
  });

  const midpoint = [(result.propertyPoint[0] + result.roadPoint[0]) / 2, (result.propertyPoint[1] + result.roadPoint[1]) / 2];
  const dx = result.roadPoint[0] - result.propertyPoint[0];
  const dy = result.roadPoint[1] - result.propertyPoint[1];

  let angle = -(Math.atan2(dy, dx) * 180 / Math.PI);
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;

  const point = new Point({ x: midpoint[0], y: midpoint[1], spatialReference: polygon.spatialReference });

  const labelGraphic = new Graphic({
    geometry: point,
    symbol: { type: "text", text: `${result.distance.toFixed(2)} m`, color: "red", haloColor: "white", haloSize: 2, angle, yoffset: 10, font: { size: 15, weight: "bold" } },
    attributes: { __propertyRoadDistance: true, distance: result.distance }
  });

  view.graphics.addMany([lineGraphic, labelGraphic]);
}

export function clearPropertyRoadDistance(view) {
  if (!view) return;
  const graphics = view.graphics.filter((graphic) => graphic.attributes?.__propertyRoadDistance === true).toArray();
  view.graphics.removeMany(graphics);
}