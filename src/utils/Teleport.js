import * as THREE from 'three';

/**
 * Determine if a point is to the left of a line
 * @param {THREE.Vector3} a - Line start point
 * @param {THREE.Vector3} b - Line end point
 * @param {THREE.Vector3} p - Test point
 * @returns {boolean} - True if point is to the left of the line
 */
export function isLeft(a, b, p) {
  return ((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)) > 0;
}

/**
 * Check if a point is inside a polygon using the winding number algorithm
 * @param {THREE.Vector3} p - Test point
 * @param {Array<THREE.Vector3>} polygon - Array of polygon vertices
 * @returns {boolean} - True if point is inside the polygon
 */
export function isInsidePolygon(p, polygon) {
  let wn = 0; // the winding number counter
  
  // Loop through all edges of the polygon
  for (let i = 0; i < polygon.length - 1; i++) {
    // Edge from polygon[i] to polygon[i+1]
    if (polygon[i].z <= p.z) {
      // Start y <= P.y
      if (polygon[i+1].z > p.z) {
        // An upward crossing
        if (isLeft(polygon[i], polygon[i+1], p)) {
          // P left of edge
          ++wn; // Have a valid up intersect
        }
      }
    } else {
      // Start y > P.y (no test needed)
      if (polygon[i+1].z <= p.z) {
        // A downward crossing
        if (!isLeft(polygon[i], polygon[i+1], p)) {
          // P right of edge
          --wn; // Have a valid down intersect
        }
      }
    }
  }
  
  return wn !== 0;
}

/**
 * Calculate distance from point to line segment
 * @param {THREE.Vector3} p - Test point
 * @param {THREE.Vector3} v1 - Line segment start
 * @param {THREE.Vector3} v2 - Line segment end
 * @returns {number} - Distance from point to line segment
 */
export function distToLineSegment(p, v1, v2) {
  const l2 = v1.distanceToSquared(v2);
  
  if (l2 === 0) return p.distanceTo(v1);
  
  // Consider the line extending the segment, parameterized as v1 + t (v2 - v1)
  // We find projection of point p onto the line. 
  // It falls where t = [(p-v1) . (v2-v1)] / |v2-v1|^2
  // We clamp t from [0,1] to handle points outside the segment v1-v2
  
  const v1v2 = new THREE.Vector3().subVectors(v2, v1);
  const pv1 = new THREE.Vector3().subVectors(p, v1);
  
  const t = Math.max(0, Math.min(1, pv1.dot(v1v2) / l2));
  
  const projection = new THREE.Vector3().copy(v1).addScaledVector(v1v2, t);
  
  return p.distanceTo(projection);
}

/**
 * Calculate signed distance to a polygon and find closest edge
 * @param {THREE.Vector3} p - Test point
 * @param {Array<THREE.Vector3>} polygonVertices - Array of polygon vertices
 * @returns {Object} - Distance and edge index
 */
export function polygonSDF(p, polygonVertices) {
  let minDist = Infinity;
  let minEdge = -1;
  
  // Find closest edge
  for (let i = 0; i < polygonVertices.length - 1; i++) {
    const dist = distToLineSegment(p, polygonVertices[i], polygonVertices[i+1]);
    if (dist < minDist) {
      minDist = dist;
      minEdge = i;
    }
  }
  
  // Sign the distance based on whether the point is inside or outside
  const sign = isInsidePolygon(p, polygonVertices) ? -1 : 1;
  
  return {
    distance: sign * minDist,
    edgeIndex: minEdge
  };
}

/**
 * Apply a translation transformation
 * @param {THREE.Vector3} pos - Position to transform
 * @param {Array<number>} translation - Translation vector [x, y, z]
 * @returns {THREE.Vector3} - New position after translation
 */
export function applyTranslation(pos, translation) {
  return new THREE.Vector3(
    pos.x + translation[0],
    pos.y + translation[1],
    pos.z + translation[2]
  );
}

/**
 * Apply a mirror reflection transformation
 * @param {THREE.Vector3} pos - Position to transform
 * @param {Array<number>} normal - Mirror normal vector [x, y, z]
 * @returns {THREE.Vector3} - New position after reflection
 */
export function applyReflection(pos, normal) {
  // Create a normalized normal vector
  const n = new THREE.Vector3(normal[0], normal[1], normal[2]).normalize();
  
  // Calculate the reflection: pos - 2 * (pos · n) * n
  const dot = pos.dot(n);
  return new THREE.Vector3().copy(pos).sub(n.multiplyScalar(2 * dot));
}