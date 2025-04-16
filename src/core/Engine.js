import * as THREE from 'three';
import Surface from '../Surface.js';

/**
 * Engine class for managing Three.js scene, renderer, and surfaces
 * Simplified version without camera teleportation
 */
class Engine {
  /**
   * Create a new Engine
   * @param {HTMLElement} container - Container for the renderer
   */
  constructor(container) {
    this.container = container;
    this.surfaces = new Map();
    this.currentSurface = null;
    this.currentSurfaceId = null;
    
    // Create shared uniforms that will be passed to all shaders
    this.uniforms = {
      iResolution: { value: new THREE.Vector2() },
      iTime: { value: 0 },
      rayMarchCamPos: { value: new THREE.Vector3() },
      rayMarchCamFront: { value: new THREE.Vector3() },
      rayMarchCamUp: { value: new THREE.Vector3() }
    };
    
    // Initialize renderer and scene
    this.initRenderer();
    this.initScene();
    
    // Track time for animations
    this.clock = new THREE.Clock();
    
    console.log("Engine initialized");
  }
  
  /**
   * Initialize the WebGL renderer
   */
  initRenderer() {
    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // Get container dimensions
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    // Set renderer size
    this.renderer.setSize(width, height);
  }
  
  /**
   * Initialize the Three.js scene
   */
  initScene() {
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera (only used for rendering, not for camera position)
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create a plane that covers the entire screen
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    
    // We'll create a material later when a surface is selected
    this.screenQuad = new THREE.Mesh(planeGeometry);
    this.scene.add(this.screenQuad);
  }
  
  /**
   * Register a surface with the engine
   * @param {string} id - Unique identifier for the surface
   * @param {Surface} surface - Surface object
   */
  registerSurface(id, surface) {
    this.surfaces.set(id, surface);
  }
  
  /**
   * Register a surface from a JSON configuration
   * @param {Object} config - Surface configuration object
   */
  registerSurfaceFromJSON(config) {
    const surface = new Surface(config);
    this.registerSurface(config.id, surface);
  }
  
  /**
   * Change to a different surface
   * @param {string} surfaceId - ID of the surface to activate
   * @returns {Promise<Object>} - Result of the surface change
   */
  async changeSurface(surfaceId) {
    // Make sure the surface exists
    if (!this.surfaces.has(surfaceId)) {
      console.error(`Surface ${surfaceId} not found`);
      return { success: false };
    }
    
    // Deactivate current surface if one is active
    if (this.currentSurface) {
      this.currentSurface.deactivate();
    }
    
    // Get the new surface
    const surface = this.surfaces.get(surfaceId);
    
    try {
      // Create material for the surface
      const material = await surface.createMaterial(this.uniforms);
      
      // Update the screen quad with the new material
      this.screenQuad.material = material;
      
      // Set as current surface
      this.currentSurface = surface;
      this.currentSurfaceId = surfaceId;
      
      // Activate the new surface
      surface.activate();
      
      return {
        success: true,
        surfaceName: surface.name,
        initialPosition: surface.getInitialPosition()
      };
    } catch (error) {
      console.error(`Error changing to surface ${surfaceId}:`, error);
      return { success: false };
    }
  }
  
  /**
   * Update shader uniforms
   */
  updateShaderUniforms() {
    // Update time uniform
    this.uniforms.iTime.value = this.clock.getElapsedTime();
    
    // Other uniforms will be updated in the animation loop from the camera
  }
  
  /**
   * Get the DOM element for the renderer
   * @returns {HTMLCanvasElement} - The canvas element
   */
  getDomElement() {
    return this.renderer.domElement;
  }
  
  /**
   * Start the animation loop
   * @param {Function} updateCallback - Function to call before rendering each frame
   */
  animate(updateCallback) {
    const animate = () => {
      // Request next frame
      requestAnimationFrame(animate);
      
      // Call the update callback
      if (updateCallback) {
        const delta = this.clock.getDelta();
        updateCallback(delta);
      }
      
      // Update uniforms
      this.updateShaderUniforms();
      
      // Update current surface if one is active
      if (this.currentSurface) {
        this.currentSurface.update(this.clock.getDelta());
      }
      
      // Render the scene
      this.renderer.render(this.scene, this.camera);
    };
    
    // Start the animation loop
    animate();
  }
  
  /**
   * Handle renderer resize
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    // Update renderer size
    this.renderer.setSize(width, height);
    
    // Update resolution uniform
    this.uniforms.iResolution.value.set(width, height);
  }
}

export default Engine;