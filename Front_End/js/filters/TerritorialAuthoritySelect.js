let options = [];
let value = "";
let onChange = null;
const trigger = document.getElementById("authority-trigger");
const triggerLabel = document.getElementById("authority-trigger-label");
const arrow = document.getElementById("authority-arrow");
const menu = document.getElementById("authority-menu");
const search = document.getElementById("authority-search");
const optionsContainer = document.getElementById("authority-options");
const root = document.getElementById("authority-filter");
// ==================================================
// Render Options
function renderOptions() {
  const term = search.value.trim().toLowerCase();
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(term),
    ) ;
    optionsContainer.innerHTML = "";
    if (!filtered.length) {
    optionsContainer.innerHTML = `
    <div class="searchable-select-empty">
        No territorial authorities found
    </div>
    `;
    return;
}

for (const option of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `searchable-select-option ${
    option.value === value ? "selected" : ""
    }`;
    button.textContent = option.label;
    button.addEventListener("click", () => {
    value = option.value;
    triggerLabel.textContent = option.label;
    search.value = "";
    menu.hidden = true;
    arrow.textContent = "▼";
    onChange?.(option.value);
    });

    optionsContainer.appendChild(button);
  }
}
// ==================================================
// Open / Close
trigger.addEventListener("click", () => {
  if (trigger.disabled) {
    return;
  }
  menu.hidden = !menu.hidden;
  arrow.textContent = menu.hidden ? "▼" : "▲";
  if (!menu.hidden) {
    renderOptions();
    search.focus();
  }
});
search.addEventListener("input", renderOptions);

document.addEventListener("mousedown", (event) => {
  if (!root.contains(event.target)) {
    menu.hidden = true;
    arrow.textContent = "▼";
  }
});

export function setupTerritorialAuthoritySelect(handler) {
  onChange = handler;
}
// ==================================================
// Update
export function updateTerritorialAuthoritySelect(
  newOptions,
  newValue,
  disabled,
) {
  options = newOptions;
  value = newValue;
  trigger.disabled = disabled;
  triggerLabel.textContent =
    options.find((option) => option.value === value)?.label ??
    "Select a territorial authority";
  renderOptions();
}
