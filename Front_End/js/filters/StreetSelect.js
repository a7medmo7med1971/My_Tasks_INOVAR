import { renderNativeSelect } from "./SelectUtils.js";
const select = document.getElementById("street-select");
export function setupStreetSelect(onChange) { select.addEventListener("change", (event) => onChange(event.target.value)); }
export function updateStreetSelect(options, value, disabled) { renderNativeSelect(select, options, "Select an address", value); select.disabled = disabled; }
