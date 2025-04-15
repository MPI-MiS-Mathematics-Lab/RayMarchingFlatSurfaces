import * as THREE from 'three';
import Engine from './core/Engine.js';
import Camera from './core/Camera.js';
import Input from './core/Input.js';
import LSurface from './surfaces/LSurface.js';
import PentagonSurface from './surfaces/PentagonSurface.js';
import PentagonMirrorSurface from './surfaces/PentagonMirrorSurface.js';
import UI from './utils/UI.js';
import FloorPlan from './utils/FloorPlan.js';

// Check for WebGL support first
if (!window.WebGLRenderingContext) {
  document.getElementById('error').style.display = 'block';
  document.getElementById('error').textContent = 'Your browser does not support WebGL';
}

class Application {
  constructor() {
    // Get the canvas container
    this.canvasContainer = document.querySelector('.canvas-container');
    
    // Initialize components
    this.initComponents();
    
    // Set up resize observer
    this.setupResizeObserver();
    
    // Set up fullscreen handling
    this.setupFullscreen();
    
    // Set up UI events
    this.setupUIEvents();
    
    // Start the application
    this.start();
  }
  
  initComponents() {
    try {
      // Create engine
      this.engine = new Engine(this.canvasContainer);
      
      // Create camera
      this.camera = new Camera(this.canvasContainer);
      
      // Create input handler
      this.input = new Input(this.engine.getDomElement(), this.camera.getCamera());
      
      // Create UI
      this.ui = new UI(this.canvasContainer);
      
      // Create floor plan
      this.floorPlan = new FloorPlan(this.canvasContainer);
      
      // Register surfaces
      this.registerSurfaces();
      
      console.log("Application components initialized successfully");
    } catch (error) {
      console.error("Failed to initialize application:", error);
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = "Initialization error: " + error.message;
    }
  }
  
  registerSurfaces() {
    // Register all available surfaces
    this.engine.registerSurface('L', new LSurface());
    this.engine.registerSurface('double_pentagon_translation', new PentagonSurface());
    this.engine.registerSurface('double_pentagon_mirror', new PentagonMirrorSurface());
  }
  
  setupResizeObserver() {
    // Create a ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        
        // Update camera aspect ratio
        this.camera.handleResize(width, height);
        
        // Resize renderer
        this.engine.resize(width, height);
        
        // Update UI
        this.ui.updateResolution(width, height, window.devicePixelRatio);
        
        // Update floor plan
        this.floorPlan.resize();
      }
    });
    
    // Start observing the container for resize events
    resizeObserver.observe(this.canvasContainer);
  }
  
  setupFullscreen() {
    // Handle fullscreen change
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement === this.canvasContainer) {
        // We've entered fullscreen, update size to match viewport
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update camera aspect ratio
        this.camera.handleResize(width, height);
        
        // Resize renderer
        this.engine.resize(width, height);
        
        // Update UI
        this.ui.updateResolution(width, height, window.devicePixelRatio);
        
        // Update floor plan
        this.floorPlan.resize();
      }
    });
    
    // Fullscreen button
    document.getElementById('fullscreen').addEventListener('click', () => {
      if (this.canvasContainer.requestFullscreen) {
        this.canvasContainer.requestFullscreen();
      } else if (this.canvasContainer.webkitRequestFullscreen) {
        this.canvasContainer.webkitRequestFullscreen();
      } else if (this.canvasContainer.msRequestFullscreen) {
        this.canvasContainer.msRequestFullscreen();
      }
    });
    
    // Reset size button
    document.getElementById('reset-size').addEventListener('click', () => {
      this.canvasContainer.style.width = '800px';
      this.canvasContainer.style.height = '600px';
    });
  }
  
  setupUIEvents() {
    // Handle shader selection change
    const shaderSelect = document.getElementById('shader-select');
    shaderSelect.addEventListener('change', (event) => {
      this.changeSurface(event.target.value);
    });
    
    // Add toggle floor plan button
    const controlsDiv = document.querySelector('.controls');
    const floorPlanToggleBtn = document.createElement('button');
    floorPlanToggleBtn.className = 'control-btn';
    floorPlanToggleBtn.id = 'toggle-floor-plan';
    floorPlanToggleBtn.textContent = 'Toggle Floor Plan';
    floorPlanToggleBtn.addEventListener('click', () => {
      this.floorPlan.toggle();
    });
    controlsDiv.appendChild(floorPlanToggleBtn);
  }
  
  async changeSurface(surfaceId) {
    try {
      const result = await this.engine.changeSurface(surfaceId);
      
      if (result.success) {
        // Reset camera position and orientation
        this.camera.reset(result.initialPosition);
        
        // Update UI
        this.ui.updateCurrentShader(result.surfaceName);
        
        // Update floor plan with new surface
        this.floorPlan.setSurface(this.engine.currentSurface);
        
        console.log(`Switched to ${result.surfaceName} surface`);
      }
    } catch (error) {
      console.error("Error changing surface:", error);
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = "Error changing surface: " + error.message;
    }
  }
  
  start() {
    // Change to initial surface (L by default)
    this.changeSurface('L').then(() => {
      // Start animation loop
      this.engine.animate((delta) => this.update(delta));
      console.log("Animation loop started");
    }).catch(error => {
      console.error("Failed to start application:", error);
    });
  }
  
  update(delta) {
    // Handle camera position update from input
    const positionUpdated = this.input.update(delta);
    
    // Handle vertical movement (change height)
    const verticalMovement = this.input.getVerticalMovement();
    const heightUpdated = this.camera.updateHeight(
      delta, 
      verticalMovement.moveUp, 
      verticalMovement.moveDown, 
      this.input.verticalSpeed
    );
    
    // Get current surface
    const currentSurface = this.engine.currentSurface;
    if (!currentSurface) return;
    
    // Get current position and height
    const position = this.camera.getPosition();
    const height = this.camera.getHeight();
    
    // Update UI for position and height
    this.ui.updateCameraInfo(position, height);
    if (heightUpdated) {
      this.ui.updateHeightInfo(height);
    }
    
    // Update floor plan with camera position
    const viewInfo = this.camera.getViewInfo();
    this.floorPlan.updateCameraPosition(viewInfo.position, viewInfo.front);
    
    // Check if height is within teleport range and update teleport status
    if (!currentSurface.isHeightInTeleportRange(height)) {
      this.ui.updateTeleportStatus('out-of-range');
    } else {
      // Height is in range, check if teleportation is needed
      const teleportResult = currentSurface.checkTeleport(position);
      
      if (teleportResult.teleported) {
        // Apply teleportation
        this.camera.setPosition(teleportResult.newPosition);
        this.ui.updateTeleportStatus('active');
      } else {
        // Always ready for teleport when in height range
        this.ui.updateTeleportStatus('ready');
      }
    }
    
    // Update shader uniforms with camera view info
    this.engine.uniforms.rayMarchCamPos.value.copy(viewInfo.position);
    this.engine.uniforms.rayMarchCamFront.value.copy(viewInfo.front);
    this.engine.uniforms.rayMarchCamUp.value.copy(viewInfo.up);
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Application();
});