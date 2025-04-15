import * as THREE from 'three';
import Surface from './Surface.js';
import { polygonSDF } from '../utils/Teleport.js';

class PentagonMirrorSurface extends Surface {
  constructor() {
    // Reuse the same geometry as PentagonSurface for the floor plan
    const vertices = PentagonMirrorSurface.createGeometry();
    
    super({
      fragmentShader: 'shader/double_pentagon_mirror.frag',
      teleportConfig: {
        b: 2.0,
        wall_height: 5.0,
        eps: 0.0001,
        vertices: vertices
        // No translations for mirror surface (handled in shader)
      },
      displayName: 'Double Pentagon Mirror',
      initialPosition: new THREE.Vector3(0, 0, 5)
    });
  }
  
  static createGeometry() {
    // Same as PentagonSurface
    return [
      new THREE.Vector2(3.61803399, 0.00000000),
      new THREE.Vector2(2.23606798, 1.90211303),
      new THREE.Vector2(2.22044605e-16, 1.17557050),
      new THREE.Vector2(-2.23606798, 1.90211303),
      new THREE.Vector2(-3.61803399, 0.00000000),
      new THREE.Vector2(-2.23606798, -1.90211303),
      new THREE.Vector2(-0.00000000, -1.17557050),
      new THREE.Vector2(2.23606798, -1.90211303),
      new THREE.Vector2(3.61803399, 0.00000000)  // Closing the loop
    ];
  }
  
  // For the mirror surface, teleportation is entirely handled in the shader
  // We just need this for floor plan display
  checkTeleport(position) {
    // Still check if position is outside polygon for UI feedback
    const vertices = this.config.teleportConfig.vertices;
    const sdfResult = polygonSDF(position, vertices);
    
    // We don't apply any transformation, just detect when outside
    if (sdfResult.distance > 0 && sdfResult.distance < this.teleportThreshold) {
      return {
        teleported: false, // No teleport by JS
        outsidePolygon: true // But we are outside
      };
    }
    
    return {
      teleported: false,
      outsidePolygon: false
    };
  }
}

export default PentagonMirrorSurface;