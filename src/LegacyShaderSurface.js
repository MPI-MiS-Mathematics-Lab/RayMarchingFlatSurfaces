import * as THREE from 'three';
import ShaderLoader from './core/ShaderLoader.js';

/**
 * LegacyShaderSurface class for loading and using existing shader files directly
 */
class LegacyShaderSurface {
  /**
   * Create a legacy shader surface
   * @param {Object} config - Configuration object
   */
  constructor(config) {
    this.id = config.id;
    this.name = config.name || 'Legacy Shader';
    this.description = config.description || 'A shader loaded directly from file';
    this.shaderPath = config.shaderPath;
    this.vertices3D = config.vertices || [];
    this.initialPosition = config.initialPosition || new THREE.Vector3(0, 1, 0);
    
    this.shaderLoader = new ShaderLoader();
    this.material = null;
    
    console.log(`Created legacy shader surface: ${this.id} from ${this.shaderPath}`);
  }
  
  /**
   * Load the shader directly from file
   */
  async loadShader() {
    try {
      // Load the shader file directly
      console.log(`Loading legacy shader from: ${this.shaderPath}`);
      const shader = await this.shaderLoader.loadFragmentShader(this.shaderPath);
      console.log('Successfully loaded legacy shader');
      
      return shader;
    } catch (error) {
      console.error(`Error loading legacy shader ${this.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Create the material for this surface
   * @param {Object} sharedUniforms - Shared uniforms from the engine
   * @returns {Promise<THREE.ShaderMaterial>} - The created material
   */
  async createMaterial(sharedUniforms) {
    try {
      // Load the shader code
      const fragmentShader = await this.loadShader();
      
      // Create material with shared uniforms
      this.material = this.shaderLoader.createMaterial(fragmentShader, sharedUniforms);
      
      return this.material;
    } catch (error) {
      console.error(`Error creating material for legacy shader ${this.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Activate this surface
   */
  activate() {
    // Nothing to do here for legacy shaders
  }
  
  /**
   * Deactivate this surface
   */
  deactivate() {
    // Nothing to do here for legacy shaders
  }
  
  /**
   * Update surface state
   * @param {number} delta - Time delta since last frame
   */
  update(delta) {
    // Nothing to do here for legacy shaders
  }
  
  /**
   * Get the recommended initial position for this surface
   * @returns {THREE.Vector3} - Initial position
   */
  getInitialPosition() {
    return this.initialPosition;
  }
  
  /**
   * Get the 3D vertices for floor plan visualization
   * @returns {Array<THREE.Vector3>} - Array of 3D vertices
   */
  getVertices() {
    return this.vertices3D;
  }
}

export default LegacyShaderSurface;