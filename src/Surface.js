import * as THREE from 'three';
import ShaderLoader from './core/ShaderLoader.js';
import ShaderBuilder from './utils/ShaderBuilder.js';

/**
 * Generic Surface class that loads and configures surfaces from JSON
 * This class replaces the individual surface classes in the previous architecture
 * Simplified version without camera teleportation
 */
class Surface {
  /**
   * Create a surface from a JSON configuration
   * @param {Object} config - Surface configuration object
   */
  constructor(config) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.shaderLoader = new ShaderLoader();
    this.material = null;
    
    // Convert 2D vertices to 3D (y → z) for floor plan visualization
    this.vertices3D = config.vertices.map(v => new THREE.Vector3(v[0], 0, v[1]));
    
    console.log(`Created surface: ${this.id} with ${this.vertices3D.length} vertices`);
  }
  
  /**
   * Load the shader for this surface
   */
  async loadShader() {
    try {
      // Load the base shader template
      console.log('Attempting to load shader template');
      const template = await this.shaderLoader.loadFragmentShader('./shader/base.frag');
      console.log('Successfully loaded shader template');
      
      // Generate the customized shader for this surface
      console.log('Generating customized shader');
      const shader = ShaderBuilder.createShader(template, this.config);
      console.log('Successfully generated shader');
      
      return shader;
    } catch (error) {
      console.error(`Error loading shader for surface ${this.id}:`, error);
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
      console.error(`Error creating material for surface ${this.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Activate this surface
   */
  activate() {
    // Nothing to do here for the base class
  }
  
  /**
   * Deactivate this surface
   */
  deactivate() {
    // Nothing to do here for the base class
  }
  
  /**
   * Update surface state
   * @param {number} delta - Time delta since last frame
   */
  update(delta) {
    // Nothing to do here for the base class
  }
  
  /**
   * Get the recommended initial position for this surface
   * @returns {THREE.Vector3} - Initial position
   */
  getInitialPosition() {
    if (this.config.initialPosition) {
      return new THREE.Vector3(
        this.config.initialPosition[0],
        this.config.initialPosition[1],
        this.config.initialPosition[2]
      );
    }
    
    // Default position at the center
    return new THREE.Vector3(0, 1, 0);
  }
  
  /**
   * Get the 3D vertices for floor plan visualization
   * @returns {Array<THREE.Vector3>} - Array of 3D vertices
   */
  getVertices() {
    return this.vertices3D;
  }
}

export default Surface;