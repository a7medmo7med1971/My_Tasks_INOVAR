export function getHighlightSymbol(feature, featureType = "", selected = true) {
  // ==========================================
  // PROPERTY
  // Blue
  // ==========================================
  if (featureType === "property") {
    return {
      type: "simple-fill",

      color: selected ? [0, 100, 255, 0.25] : [0, 100, 255, 0.1],

      outline: {
        color: [0, 100, 255, 1],
        width: selected ? 4 : 2,
      },
    };
  }
  // PARCEL
  // Yellow
  // ==========================================
  if (featureType === "parcel") {
    return {
      type: "simple-fill",

      color: selected ? [255, 230, 0, 0.35] : [255, 230, 0, 0.1],

      outline: {
        color: selected ? [255, 170, 0, 1] : [255, 220, 0, 0.9],

        width: selected ? 4 : 2,
      },
    };
  }

  // ADDRESS
  // Red
  // ==========================================
  if (featureType === "address") {
    return {
      type: "simple-marker",

      style: "circle",

      color: [255, 0, 0, 1],

      size: selected ? 14 : 8,

      outline: {
        color: [255, 255, 255, 1],
        width: 2,
      },
    };
  }

  // ROAD
  // Cyan
  // ==========================================
  if (featureType === "road") {
    return {
      type: "simple-line",

      color: [0, 255, 255, 1],

      width: selected ? 6 : 3,
    };
  }
  // FALLBACK
  // ==========================================

  const geometryType = feature.geometry?.type;

  if (geometryType === "polygon") {
    return {
      type: "simple-fill",
      color: [255, 0, 255, 0.2],
      outline: {
        color: [255, 0, 255, 1],
        width: 3,
      },
    };
  }

  if (geometryType === "point") {
    return {
      type: "simple-marker",
      style: "circle",
      color: [255, 0, 0, 1],
      size: 12,
      outline: {
        color: [255, 255, 255, 1],
        width: 2,
      },
    };
  }

  return {
    type: "simple-line",
    color: [255, 0, 255, 1],
    width: 4,
  };
}
