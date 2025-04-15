import * as THREE from 'three';
import ShaderLoader from '../core/ShaderLoader.js';

class Surface {
  constructor(config = {}) {
    this.config = {
      fragmentShader: '',
      teleportConfig: {
        b: 2.0,
        wall_height: 2.0,
        eps: 0.001,
        vertices: [],
        translations: []
      },
      displayName: 'Surface',
      initialPosition: new THREE.Vector3(0, 0, 0),
      ...config
    };
    
    this.shaderLoader = new ShaderLoader();
    this.material = null;
    this.teleportThreshold = 0.05;
  }
  
  async loadShader() {
    return await this.shaderLoader.loadFragmentShader(this.config.fragmentShader);
  }
  
  async createMaterial(sharedUniforms) {
    try {
      const fragmentShaderSource = await this.loadShader();
      this.material = this.shaderLoader.createMaterial(fragmentShaderSource, sharedUniforms);
      return this.material;
    } catch (error) {
      console.error(`Failed to create material for ${this.config.displayName}:`, error);
      throw error;
    }
  }
  
  activate() {
    // Override in derived surfaces if needed
    console.log(`Activated ${this.config.displayName} surface`);
  }
  
  deactivate() {
    // Override in derived surfaces if needed
    console.log(`Deactivated ${this.config.displayName} surface`);
  }
  
  update(delta) {
    // Override in derived surfaces if needed
  }
  
  checkTeleport(position) {
    // Override in derived surfaces
    return { teleported: false };
  }
  
  isHeightInTeleportRange(height) {
    return height <= this.config.teleportConfig.wall_height && 
           height >= -this.config.teleportConfig.wall_height;
  }
  
  getInitialPosition() {
    return this.config.initialPosition.clone();
  }
}

export default Surface;