export function renderNativeSelect(select, options, placeholder, value = "") {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  }
  select.value = value;
}
