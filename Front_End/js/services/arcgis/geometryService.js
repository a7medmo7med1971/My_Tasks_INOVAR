import * as geometryEngine from "https://js.arcgis.com/4.32/@arcgis/core/geometry/geometryEngine.js";

const COLLINEAR_TOLERANCE_DEGREES = 0.5;

function segmentAngle(start, end) {
  return Math.atan2(end[1] - start[1], end[0] - start[0]);
}
function angleDifference(angle1, angle2) {
  let diff = Math.abs(angle1 - angle2);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff;
}
function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}
function simplifyRingToSides(ring) {
  if (ring.length < 4) return ring;
  const points = ring.slice();
  const first = points[0];
  const last = points[points.length - 1];
  const isClosed = first[0] === last[0] && first[1] === last[1];
  if (isClosed) points.pop();
  if (points.length < 3) return points;

  const corners = [];
  for (let i = 0; i < points.length; i += 1) {
    const previous = points[(i - 1 + points.length) % points.length];
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const incomingAngle = segmentAngle(previous, current);
    const outgoingAngle = segmentAngle(current, next);
    const differenceDegrees = radiansToDegrees(angleDifference(incomingAngle, outgoingAngle));
    if (differenceDegrees > COLLINEAR_TOLERANCE_DEGREES) corners.push(current);
  }
  return corners;
}

export function calculateParcelSides(polygon) {
  const ring = polygon.rings[0];
  if (!ring || ring.length < 4) return { sides: [], perimeter: 0, area: 0 };
  const corners = simplifyRingToSides(ring);
  if (corners.length < 3) return { sides: [], perimeter: 0, area: Math.abs(geometryEngine.planarArea(polygon, "square-meters")) };

  const sides = [];
  for (let i = 0; i < corners.length; i += 1) {
    const start = corners[i];
    const end = corners[(i + 1) % corners.length];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const midpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    sides.push({ side: i + 1, length, start, end, midpoint });//lable on poiygon 
  }

  const perimeter = ring.slice(0, -1).reduce((total, point, index) => {
    const next = ring[index + 1];
    return total + Math.hypot(next[0] - point[0], next[1] - point[1]);
  }, 0);

  return { sides, perimeter, area: Math.abs(geometryEngine.planarArea(polygon, "square-meters")) };
}

export function getGeometryCoordinates(geometry) { // user display coordinates .
  if (geometry.type === "point") {
    return `X: ${geometry.x.toFixed(3)}, Y: ${geometry.y.toFixed(3)} (WKID ${geometry.spatialReference?.wkid ?? "unknown"})`;
  }
  let point;
  if (geometry.type === "polygon") point = geometry.centroid;
  else if (geometry.type === "polyline") point = geometry.extent.center;
  else point = geometry.extent?.center;
  if (!point) return "Coordinates unavailable";
  return `X: ${point.x.toFixed(3)}, Y: ${point.y.toFixed(3)} (center; WKID ${point.spatialReference?.wkid ?? "unknown"})`;
}

export function getPopupLocation(geometry) {
  if (geometry.type === "point") return geometry;
  if (geometry.type === "polygon") return geometry.centroid;
  if (geometry.type === "polyline") return geometry.extent.center;
  return geometry.extent.center;
}

/////calculatePropertyRoadDistance  it is verry important/////
export function calculatePropertyRoadDistance(polygon, polyline) {
  if (!polygon || polygon.type !== "polygon" || !polyline || polyline.type !== "polyline") return null;
// must payload polygon = Property and polyline = Road
  let minimum = null;
  const rings = polygon.rings ?? [];
  const paths = polyline.paths ?? [];

  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i += 1) {
      const propertyStart = ring[i];
      const propertyEnd = ring[i + 1];

      for (const path of paths) {
        for (let j = 0; j < path.length - 1; j += 1) {
          const roadStart = path[j];
          const roadEnd = path[j + 1];
          const result = closestPointsBetweenSegments(propertyStart, propertyEnd, roadStart, roadEnd); //measurement line

          if (!minimum || result.distance < minimum.distance) minimum = result;
        }
      }
    }
  }

  return minimum;
}

function closestPointsBetweenSegments(a, b, c, d) { //candidates-->recomdations
  const candidates = [
    closestPointToSegment(a, c, d), /// whats closer points on road segment
    closestPointToSegment(b, c, d),
    closestPointToSegment(c, a, b),/// whats closer points on properties segment
    closestPointToSegment(d, a, b)
  ];

  const results = [ // convert own candidates
    { propertyPoint: a, roadPoint: candidates[0].point, distance: candidates[0].distance },
    { propertyPoint: b, roadPoint: candidates[1].point, distance: candidates[1].distance },
    { propertyPoint: candidates[2].point, roadPoint: c, distance: candidates[2].distance },
    { propertyPoint: candidates[3].point, roadPoint: d, distance: candidates[3].distance }
  ];

  return results.reduce((minimum, current) => current.distance < minimum.distance ? current : minimum);
}

function closestPointToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy; //length squared not use square root

  if (lengthSquared === 0) return { point: [start[0], start[1]], distance: Math.hypot(point[0] - start[0], point[1] - start[1]) };

  let t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared; //vector projection algorithims
  t = Math.max(0, Math.min(1, t));

  const closest = [start[0] + t * dx, start[1] + t * dy]; //vector geometry.
  return { point: closest, distance: Math.hypot(point[0] - closest[0], point[1] - closest[1]) };
}