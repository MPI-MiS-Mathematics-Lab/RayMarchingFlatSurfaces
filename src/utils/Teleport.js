import * as THREE from 'three';

// Helper function to determine if a point is to the left of a line
export function isLeft(a, b, p) {
  return (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
}

// Check if point is inside polygon using winding number algorithm
export function isInsidePolygon(p, polygon) {
  let winding = 0;
  
  // Convert 3D point to 2D point in the XZ plane
  const p2D = new THREE.Vector2(p.x, p.z);
  
  for (let i = 0; i < polygon.length - 1; i++) {
    const v1 = polygon[i];
    const v2 = polygon[i + 1];
    
    if (v1.y <= p2D.y) {
      if (v2.y > p2D.y && isLeft(v1, v2, p2D) > 0)
        winding += 1;
    } else {
      if (v2.y <= p2D.y && isLeft(v1, v2, p2D) < 0)
        winding -= 1;
    }
  }
  
  return Math.abs(winding) > 0;
}

// Calculate distance from point to line segment
export function distToLineSegment(p, v1, v2) {
  const lineVec = v2.clone().sub(v1);
  const lineLength = lineVec.length();
  
  if (lineLength === 0) {
    // The line is actually a point
    return p.clone().sub(v1).length();
  }
  
  // Convert 3D point to 2D point in the XZ plane if needed
  const p2D = p instanceof THREE.Vector2 ? p.clone() : new THREE.Vector2(p.x, p.z);
  
  // Calculate normalized projection of p onto the line
  const pv1 = new THREE.Vector2(p2D.x - v1.x, p2D.y - v1.y);
  const dot = pv1.x * lineVec.x + pv1.y * lineVec.y;
  const t = Math.max(0, Math.min(1, dot / (lineLength * lineLength)));
  
  // Calculate the closest point on the line
  const closest = new THREE.Vector2(
    v1.x + t * lineVec.x,
    v1.y + t * lineVec.y
  );
  
  // Return the distance from p to the closest point
  return Math.sqrt(
    Math.pow(p2D.x - closest.x, 2) + 
    Math.pow(p2D.y - closest.y, 2)
  );
}

// Calculate the polygon SDF for any surface
export function polygonSDF(p, polygonVertices) {
  // This corresponds to the EdgeSDF struct in the shader
  let result = {
    distance: 1000000.0,
    edgeIndex: -1
  };
  
  // Convert 3D point to 2D point in the XZ plane
  const p2D = new THREE.Vector2(p.x, p.z);
  
  // Find closest edge
  for (let i = 0; i < polygonVertices.length - 1; i++) {
    const v1 = polygonVertices[i];
    const v2 = polygonVertices[i + 1];
    const d = distToLineSegment(p2D, v1, v2);
    
    if (d < result.distance) {
      result.distance = d;
      result.edgeIndex = i;
    }
  }
  
  // Determine if inside or outside
  const inside = isInsidePolygon(p, polygonVertices);
  
  // Apply sign (negative inside, positive outside)
  result.distance = inside ? -result.distance : result.distance;
  
  return result;
}

// Apply translation based on which edge was hit
export function applyTranslation(pos, edgeIndex, translations) {
  if (edgeIndex >= 0 && edgeIndex < translations.length) {
    // Create new position to hold the result
    const translatedPos = pos.clone();
    
    // Get the translation vector for this edge
    const translation = translations[edgeIndex];
    
    // Apply translation
    translatedPos.add(translation);
    
    return translatedPos;
  }
  
  // If invalid edge index, return original position
  return pos.clone();
}