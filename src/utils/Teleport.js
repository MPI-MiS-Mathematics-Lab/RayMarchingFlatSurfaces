// src/utils/Teleport.js
import * as THREE from 'three';

class Teleport {
  constructor() {
    this.geometryData = null;
    this.vertices = [];
    this.edges = [];
    this.epsilon = 0.0001; // Small value for floating point comparisons
    this.lastPosition = new THREE.Vector3();
    this.isInitialized = false;
    this.wallHeight = 2.0; // Default wall height (kept for backward compatibility)
    this.enabled = false; // Flag to enable/disable teleportation
  }

  // Load geometry data from the geometry file
  setGeometry(geometryData) {
    if (!geometryData) return;
    
    this.geometryData = geometryData;
    
    // Convert vertices to THREE.Vector2 for easier calculations
    this.vertices = this.geometryData.vertices.map(v => new THREE.Vector2(v[0], v[1]));
    
    // Store edges
    this.edges = this.geometryData.edges || [];
    
    // Store wall height if provided - kept for compatibility but won't be used
    if (geometryData.wallHeight !== undefined) {
      this.wallHeight = geometryData.wallHeight;
    } else {
      this.wallHeight = 2.0; // Default wall height
    }
    
    // Reset position tracking
    this.isInitialized = false;
    
    console.log(`Teleport: Wall height set to ${this.wallHeight} (Note: Height constraints removed)`);
    console.log(`Teleport: Loaded ${this.vertices.length} vertices and ${this.edges.length} edges`);
    
    return this.geometryData;
  }

  // Set whether teleportation is enabled
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`Teleportation ${this.enabled ? 'enabled' : 'disabled'}`);
  }

  // Get current teleportation enabled state
  isEnabled() {
    return this.enabled;
  }

  // Check if point is inside the polygon using ray casting algorithm
  isPointInside(point) {
    if (!this.vertices.length) return true;
    
    let inside = false;
    
    // Use vertices.length - 1 to skip the duplicate closing vertex if it exists
    const effectiveLength = this.hasClosingVertex() ? this.vertices.length - 1 : this.vertices.length;
    
    for (let i = 0, j = effectiveLength - 1; i < effectiveLength; j = i++) {
      const vi = this.vertices[i];
      const vj = this.vertices[j];
      
      // Ray casting algorithm
      if (((vi.y > point.y) !== (vj.y > point.y)) &&
          (point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  // Check if the first and last vertices are the same (closed polygon)
  hasClosingVertex() {
    if (this.vertices.length < 2) return false;
    
    const first = this.vertices[0];
    const last = this.vertices[this.vertices.length - 1];
    
    return Math.abs(first.x - last.x) < this.epsilon && 
           Math.abs(first.y - last.y) < this.epsilon;
  }

  // Find the closest edge to a point
  findClosestEdge(point) {
    if (!this.vertices.length) return -1;
    
    let closestEdge = -1;
    let closestDistance = Infinity;
    
    // Use vertices.length - 1 to skip the duplicate closing vertex if it exists
    const effectiveLength = this.hasClosingVertex() ? this.vertices.length - 1 : this.vertices.length;
    
    for (let i = 0, j = effectiveLength - 1; i < effectiveLength; j = i++) {
      const v1 = this.vertices[j];
      const v2 = this.vertices[i];
      
      // Calculate distance from point to line segment
      const l2 = v1.distanceToSquared(v2);
      
      if (l2 === 0) {
        const dist = point.distanceTo(v1);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestEdge = j;
        }
        continue;
      }
      
      let t = ((point.x - v1.x) * (v2.x - v1.x) + (point.y - v1.y) * (v2.y - v1.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      
      const projection = new THREE.Vector2(
        v1.x + t * (v2.x - v1.x),
        v1.y + t * (v2.y - v1.y)
      );
      
      const distance = point.distanceTo(projection);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestEdge = j;
      }
    }
    
    return closestEdge;
  }

  // Check if camera hits any edge and teleport if needed
  checkAndTeleport(position, direction, camera) {
    // If teleportation is disabled, just update last position and return
    if (!this.enabled) {
      if (this.isInitialized) {
        this.lastPosition.copy(position);
      } else {
        this.lastPosition.copy(position);
        this.isInitialized = true;
      }
      return false;
    }
    
    if (!this.geometryData || !this.vertices.length) return false;
    
    // Create a 2D point from the position (ignoring Y)
    const point2D = new THREE.Vector2(position.x, position.z);
    
    // Initialize if needed
    if (!this.isInitialized) {
      this.lastPosition.copy(position);
      this.isInitialized = true;
    }
    
    // Check if we're inside the polygon
    const isInside = this.isPointInside(point2D);
    
    // If we're outside the polygon, handle based on edge type
    // HEIGHT CHECK REMOVED - always process teleportation regardless of Y position
    if (!isInside) {
      // Find which edge we're closest to
      const edgeIndex = this.findClosestEdge(point2D);
      
      if (edgeIndex >= 0 && edgeIndex < this.edges.length) {
        const edge = this.edges[edgeIndex];
        const type = edge && edge.type ? edge.type.toLowerCase() : 'none';
        
        console.log(`Teleport: Near edge ${edgeIndex}, type: ${type}`);
        
        // Apply action based on edge type
        let handled = false;
        
        switch (type) {
          case 'translation':
            // For translation, teleport as before
            handled = this.handleTranslation(edgeIndex, position, direction, camera);
            break;
          case 'mirror':
            // For mirror, just block movement (push back)
            position.copy(this.lastPosition);
            handled = true;
            break;
          case 'affine':
            // For affine, do nothing - let the player continue moving
            handled = this.handleAffine(edgeIndex, position, direction, camera);
            break;
          default:
            // For other/unsupported types, push back
            position.copy(this.lastPosition);
            handled = true;
            break;
        }
        
        if (handled) {
          // Update camera position
          camera.setPosition(position);
          return true;
        }
      } else {
        console.warn(`Teleport: Edge index ${edgeIndex} out of bounds (edges length: ${this.edges.length})`);
        // If edge index is invalid, just push back
        position.copy(this.lastPosition);
        camera.setPosition(position);
        return true;
      }
    } else {
      // If we're inside, update last position
      this.lastPosition.copy(position);
    }
    
    return false;
  }

  // Handler for translation edges
  handleTranslation(edgeIndex, position, direction, camera) {
    const edge = this.edges[edgeIndex];
    if (!edge || !edge.vector) return false;
    
    const vector = edge.vector;
    
    // Create a translation vector - adjusted for 2D format [x, z]
    const translationVector = new THREE.Vector3(
      vector[0] || 0, 
      0,              // Y is always 0 in our 2D format
      vector[1] || 0  // Z is now at index 1
    );
    
    // Apply translation to position
    position.add(translationVector);
    
    console.log(`Teleport: Applied translation [${translationVector.x}, ${translationVector.z}]`);
    
    return true;
  }

  // Handler for mirror edges
  handleMirror(edgeIndex, position, direction, camera) {
    const edge = this.edges[edgeIndex];
    if (!edge) return false;
    
    let normal;
    
    if (edge.normal) {
      // Use provided normal - adjusted for 2D format [x, z]
      normal = new THREE.Vector3(
        edge.normal[0] || 0, 
        0,                  // Y is always 0 in our 2D format 
        edge.normal[1] || 0 // Z is now at index 1
      ).normalize();
    } else {
      // Calculate normal from vertices
      const i = edgeIndex;
      const j = (i + 1) % this.vertices.length;
      
      const vertexStart = this.vertices[i];
      const vertexEnd = this.vertices[j];
      
      // Edge vector (in 2D, x-z plane)
      const dx = vertexEnd.x - vertexStart.x;
      const dz = vertexEnd.y - vertexStart.y;
      
      // Normal vector (-dz, 0, dx) - perpendicular to edge in x-z plane
      normal = new THREE.Vector3(-dz, 0, dx).normalize();
    }
    
    // Reflect direction
    const reflectedDir = direction.clone().reflect(normal);
    
    // Update camera orientation to match the reflected direction
    const rotationAxis = new THREE.Vector3().crossVectors(direction, reflectedDir).normalize();
    const rotationAngle = direction.angleTo(reflectedDir);
    
    if (rotationAngle > this.epsilon) {
      const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotationAngle);
      camera.getCamera().quaternion.premultiply(rotationQuaternion);
    }
    
    // Slightly push away from the edge along the reflected direction
    position.addScaledVector(reflectedDir, 0.1);
    
    return true;
  }

  // Handler for affine edges - actually use it for affine transformations
  handleAffine(edgeIndex, position, direction, camera) {
    const edge = this.edges[edgeIndex];
    if (!edge || !edge.transform) return false;
    
    const transform = edge.transform;
    const matrix = transform.matrix || [1, 0, 0, 1];
    const translation = transform.translation || [0, 0];
    
    // Create transformation matrix
    const a = matrix[0] || 1;
    const b = matrix[1] || 0;
    const c = matrix[2] || 0;
    const d = matrix[3] || 1;
    const tx = translation[0] || 0;
    const tz = translation[1] || 0; // This is correct for 2D [x,z] format
    
    console.log(`Teleport: Applying affine transform with matrix [${a}, ${b}, ${c}, ${d}] and translation [${tx}, ${tz}]`);
    
    // Create a 4x4 transformation matrix
    const transformMatrix = new THREE.Matrix4().set(
      a, 0, b, tx,
      0, 1, 0, 0,
      c, 0, d, tz,
      0, 0, 0, 1
    );
    
    // Save original Y position
    const originalY = position.y;
    
    // Apply transformation to position
    position.applyMatrix4(transformMatrix);
    
    // Restore Y position (we don't want to change height)
    position.y = originalY;
    
    // Transform direction (no translation)
    const dirMatrix = new THREE.Matrix4().set(
      a, 0, b, 0,
      0, 1, 0, 0,
      c, 0, d, 0,
      0, 0, 0, 1
    );
    
    const newDirection = direction.clone().applyMatrix4(dirMatrix).normalize();
    
    // Update camera orientation to match the new direction
    const rotationAxis = new THREE.Vector3().crossVectors(direction, newDirection).normalize();
    const rotationAngle = direction.angleTo(newDirection);
    
    if (rotationAngle > this.epsilon && rotationAxis.lengthSq() > this.epsilon) {
      const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotationAngle);
      camera.getCamera().quaternion.premultiply(rotationQuaternion);
    }
    
    console.log(`Teleport: Applied affine transformation, new position: [${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}]`);
    
    return true;
  }
}

export default Teleport;