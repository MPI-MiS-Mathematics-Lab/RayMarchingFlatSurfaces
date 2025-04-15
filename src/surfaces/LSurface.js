import * as THREE from 'three';
import Surface from './Surface.js';
import { polygonSDF, applyTranslation } from '../utils/Teleport.js';

class LSurface extends Surface {
  constructor() {
    const b = 2.0;
    super({
      fragmentShader: 'shader/L.frag',
      teleportConfig: {
        b: b,
        wall_height: 2.0,
        eps: 0.001,
        vertices: LSurface.createGeometry(b),
        translations: LSurface.createTranslations(b)
      },
      displayName: 'L Surface',
      initialPosition: new THREE.Vector3(0, 0, 0)
    });
  }
  
  static createGeometry(b) {
    return [
      new THREE.Vector2(-b, -2*b),  // Bottom left
      new THREE.Vector2(b, -2*b),   // Bottom center
      new THREE.Vector2(3*b, -2*b), // Bottom right
      new THREE.Vector2(3*b, 0),    // Middle right
      new THREE.Vector2(b, 0),      // Middle center
      new THREE.Vector2(b, 2*b),    // Top right
      new THREE.Vector2(-b, 2*b),   // Top left
      new THREE.Vector2(-b, -2*b)   // Back to start (closing the polygon)
    ];
  }
  
  static createTranslations(b) {
    return [
      new THREE.Vector3(0, 0, 4*b),     // Edge 0: Bottom left to bottom center - teleport up 4b
      new THREE.Vector3(0, 0, 2*b),  // Edge 1: Bottom center to bottom right - teleport left 2b & up 2b
      new THREE.Vector3(-4*b, 0, 0),    // Edge 2: Bottom right to middle right - teleport left 4b
      new THREE.Vector3(0, 0, -2*b),     // Edge 3: Middle right to middle center - teleport up 2b
      new THREE.Vector3(-2*b, 0, 0),    // Edge 4: Middle center to top right - teleport left 2b
      new THREE.Vector3(0, 0, -4*b),    // Edge 5: Top right to top left - teleport down 4b
      new THREE.Vector3(2*b, 0, 0),   // Edge 6: Top left to bottom left - teleport right 2b & down 2b
      new THREE.Vector3(4*b, 0, 0),   // Edge 7: Top left to bottom left - teleport right 2b & down 2b

    ];
  }
  
  checkTeleport(position) {
    const vertices = this.config.teleportConfig.vertices;
    const translations = this.config.teleportConfig.translations;
    
    // Get SDF result
    const sdfResult = polygonSDF(position, vertices);
    
    // If we're outside the polygon and close to an edge, teleport
    if (sdfResult.distance > 0 && sdfResult.distance < this.teleportThreshold) {
      // Apply appropriate translation
      const newPosition = applyTranslation(position, sdfResult.edgeIndex, translations);
      
      // Return the new position (original caller should apply it)
      return {
        teleported: true,
        newPosition: newPosition
      };
    }
    
    return {
      teleported: false
    };
  }
}

export default LSurface;