import * as THREE from 'three';
import Surface from './Surface.js';
import { polygonSDF, applyTranslation } from '../utils/Teleport.js';

class PentagonSurface extends Surface {
  constructor() {
    // Create the vertices and translations
    const vertices = PentagonSurface.createGeometry();
    const translations = PentagonSurface.createTranslations();
    
    super({
      fragmentShader: 'shader/double_pentagon_translation.frag',
      teleportConfig: {
        b: 2.0,
        wall_height: 2.0,
        eps: 0.0001,
        vertices: vertices,
        translations: translations
      },
      displayName: 'Double Pentagon Translation',
      initialPosition: new THREE.Vector3(0, 0, 0)
    });
  }
  
  static createGeometry() {
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
  
  static createTranslations() {
    const vertices = PentagonSurface.createGeometry();
    const translations = [];
    
    // Translation vectors are v_{i+5}-v_i where indices are modulo 8
    for (let i = 0; i < 8; i++) {
      const start = vertices[i];
      const end = vertices[(i + 5) % 8];
      translations.push(
        new THREE.Vector3(end.x - start.x, 0, end.y - start.y)
      );
    }
    
    return translations;
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
      
      // Return the new position
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

export default PentagonSurface;