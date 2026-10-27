const API_BASE_URL ="http://localhost/backend/api/features";

export async function saveFeature(payload) {
const response = await fetch(API_BASE_URL,{method: "POST",headers: {"Content-Type": "application/json"},body: JSON.stringify(payload)});
  // Duplicate
  if (response.status === 409) {
    return {
      success: false,
      duplicate: true,
      message: "This feature is already saved."
    };
  }
  // Other API error
  if (!response.ok) {
    let message ="Could not save feature.";
    try {
      const error = await response.json();
      message =error.message ?? error.title ?? message;
    } catch {
      // Ignore invalid JSON error response
    }
    throw new Error(message);
  }
  const data =await response.json();
  return {
    success: true,
    duplicate: false,
    data
  };
}