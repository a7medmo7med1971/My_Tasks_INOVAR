import { saveFeature } from "../services/apis/featureApiService.js";
import { buildFeaturePayload } from "../services/apis/featurePayload.js";

// DOM
const section = document.getElementById("save-feature-section");
const button = document.getElementById("save-feature-button");
const message = document.getElementById("save-feature-message");

let currentFeature = null;
let currentFeatureType = "";
let currentMeasurements = null;

// Setup
export function setupFeatureSave() {
  button.addEventListener("click", handleSave);
}

// Set selected feature
export function setFeatureForSave(feature, featureType, measurements = null) {
  currentFeature = feature;
  currentFeatureType = featureType;
  currentMeasurements = measurements;
  message.textContent = "";

  const canSave = feature && ["property", "address", "road"].includes(featureType);
  section.hidden = !canSave;
}

// Save
async function handleSave() {
  if (!currentFeature) return;

  try {
    button.disabled = true;
    message.textContent = "Saving...";

    const payload = buildFeaturePayload(currentFeature, currentFeatureType, currentMeasurements);
    console.log("FEATURE API PAYLOAD:", payload);

    const result = await saveFeature(payload);

    if (result.duplicate) {
      message.textContent = "Feature already saved.";
      return;
    }

    message.textContent = "Feature saved successfully.";
  } catch (error) {
    console.error("Save feature error:", error);
    message.textContent = error.message ?? "Could not save feature.";
  } finally {
    button.disabled = false;
  }
}