let options = [];
let value = "";
let onChange = null;

const trigger =document.getElementById("property-trigger");
const triggerLabel =document.getElementById("property-trigger-label");
const arrow = document.getElementById("property-arrow");
const menu =document.getElementById("property-menu");
const search =document.getElementById("property-search");
const optionsContainer =document.getElementById("property-options");
const root =document.getElementById("property-filter");
  
function renderOptions() {const term = search.value.trim().toLowerCase();
const filtered = options.filter((option) =>option.label.toLowerCase().includes(term));
optionsContainer.innerHTML = "";
    
  if (!filtered.length) {
    optionsContainer.innerHTML = `
      <div class="searchable-select-empty">
        No properties found
      </div>
    `;
    return;
  }

  for (const option of filtered) {
    const button =document.createElement("button");
    button.type = "button";
    button.className =
      `searchable-select-option ${
        option.value === value
          ? "selected"
          : ""
      }`;

    button.textContent = option.label;
    button.addEventListener("click", () => {
      value = option.value;
      triggerLabel.textContent =option.label;
      search.value = "";
      menu.hidden = true;
      arrow.textContent = "▼";
      onChange?.(option.value);
    });
    optionsContainer.appendChild(button);
  }
}
trigger.addEventListener("click", () => {
  if (trigger.disabled) return;
  menu.hidden = !menu.hidden;
  arrow.textContent =
    menu.hidden ? "▼" : "▲";
  if (!menu.hidden) {
    renderOptions();
    search.focus();
  }
});
search.addEventListener(
  "input",
  renderOptions
);

document.addEventListener(
  "mousedown",
  (event) => {
    if (!root.contains(event.target)) {
      menu.hidden = true;
      arrow.textContent = "▼";
    }
  }
);

export function setupPropertySelect(handler) {
  onChange = handler;
}

export function updatePropertySelect(
  newOptions,
  newValue,
  disabled
) {
  options = newOptions;
  value = newValue;
  trigger.disabled = disabled;
  triggerLabel.textContent =
    options.find(
      (option) => option.value === value
    )?.label ?? "Select a property";

  renderOptions();
}