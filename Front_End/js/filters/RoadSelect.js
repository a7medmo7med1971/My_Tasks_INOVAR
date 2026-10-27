import { renderNativeSelect } from "./SelectUtils.js";
const select = document.getElementById("road-select");
export function setupRoadSelect(onChange) { select.addEventListener("change", (event) => onChange(event.target.value)); }
export function updateRoadSelect(options, value, disabled) { renderNativeSelect(select, options, "Select a road", value); select.disabled = disabled; }
