import CoordinateConversion from "https://js.arcgis.com/4.32/@arcgis/core/widgets/CoordinateConversion.js";
import Expand from "https://js.arcgis.com/4.32/@arcgis/core/widgets/Expand.js";
// Coordinate Conversion Tool
export function setupCoordinateTool(view) {
  if (!view) {return null;}
  // Esri Coordinate Conversion Widget
  const coordinateConversion =
    new CoordinateConversion({
      view,
      multipleConversions: true
    });
  const expand =new Expand({
      view,
      content:coordinateConversion,
      expanded:false,
      group:"top-left"
    });
  view.ui.add(expand,"top-left");
  return {
    coordinateConversion,
    expand
  };
}