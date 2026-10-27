import {calculateParcelSides} from "../services/arcgis/geometryService.js";
// ==================================================
// Get measurements for API
export function getParcelMeasurements(polygon) {
  if (!polygon || polygon.type !== "polygon") {
    return null;
  }
  const result =calculateParcelSides(polygon);
  return {
    areaSquareMeters:result.area,
    perimeterMeters:result.perimeter,
    sides:
      result.sides.map((side) => ({
        side: side.side,
        lengthMeters: side.length
      }))
  };
}
// ==================================================
// Render measurements displlay
export function renderParcelMeasurements(polygon) {
  const result =calculateParcelSides(polygon);
  return `
    <section class="measurements">
      <h3>Parcel measurements</h3>

      <p>
        <strong>Perimeter:</strong>
        ${result.perimeter.toFixed(2)} m
      </p>

      <p>
        <strong>Area:</strong>
        ${result.area.toFixed(2)} m²
      </p>

      <div class="side-list">
        ${result.sides
          .map(
            (side) =>
              `<p>
                Side ${side.side}:
                ${side.length.toFixed(2)} m
              </p>`
          )
          .join("")}
      </div>
    </section>
  `;
}