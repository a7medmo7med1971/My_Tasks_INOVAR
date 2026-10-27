import {calculateParcelSides} from "../services/arcgis/geometryService.js";
export default function PropertyPopup(feature) {
  const attributes = feature.attributes ?? {};
  const geometry = feature.geometry;
  const fieldInfos = Object.keys(attributes).map((fieldName) => ({
    fieldName,
    label: fieldName,
    visible: true
  }));

  const content = [{type: "fields",fieldInfos}];
  // Add calculated measurements under the attributes
  if (geometry?.type === "polygon") {
    const result = calculateParcelSides(geometry);
    const sidesHtml = result.sides
      .map(
        (side) => `
          <div style="
            display:flex;
            justify-content:space-between;
            padding:6px 0;
            border-bottom:1px solid #eee;
          ">
            <strong>Side ${side.side}</strong>
            <span>${side.length.toFixed(2)} m</span>
          </div>
        `
      ).join("");
    content.push({
      type: "text",

      text: `
        <div style="margin-top:12px">

          <h4 style="margin-bottom:10px">
            Geometry Measurements
          </h4>

          <div style="
            display:flex;
            justify-content:space-between;
            padding:6px 0;
          ">
            <strong>Area</strong>
            <span>${result.area.toFixed(2)} m²</span>
          </div>

          <div style="
            display:flex;
            justify-content:space-between;
            padding:6px 0;
          ">
            <strong>Perimeter</strong>
            <span>${result.perimeter.toFixed(2)} m</span>
          </div>

          ${sidesHtml}

        </div>
      `
    });
  }
  return {
    title:
      attributes.RatingAuthority ??
      attributes.StreetName ??
      attributes.PropertyID ??
      "Feature",
    content
  };
}