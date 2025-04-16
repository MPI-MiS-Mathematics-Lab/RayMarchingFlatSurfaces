import * as THREE from 'three';
import Engine from './core/Engine.js';
import Camera from './core/Camera.js';
import Input from './core/Input.js';
import Surface from './Surface.js';
import LegacyShaderSurface from './LegacyShaderSurface.js';
import UI from './utils/UI.js';
import FloorPlan from './utils/FloorPlan.js';
import InlineStats from './utils/InlineStats.js';

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
  
  async initComponents() {
    try {
      // Create engine
      this.engine = new Engine(this.canvasContainer);
      
      // Create camera
      this.camera = new Camera(this.canvasContainer);
      
      // Create input handler
      this.input = new Input(this.engine.getDomElement(), this.camera);
      
      // Create UI
      this.ui = new UI(this.canvasContainer);
      
      // Create floor plan
      this.floorPlan = new FloorPlan(this.canvasContainer);
      
      // Create and attach stats
      this.stats = new InlineStats();
      this.stats.attachTo(this.canvasContainer);
      
      // Load and register surfaces
      await this.loadSurfaces();
      
      console.log("Application components initialized successfully");
    } catch (error) {
      console.error("Failed to initialize application:", error);
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = "Initialization error: " + error.message;
    }
  }
  
  async loadSurfaces() {
    try {
      // Register legacy shaders
      const basicVertices = [
        new THREE.Vector3(2.0, 0, 2.0),
        new THREE.Vector3(-2.0, 0, 2.0),
        new THREE.Vector3(-2.0, 0, -2.0),
        new THREE.Vector3(2.0, 0, -2.0),
        new THREE.Vector3(2.0, 0, 2.0)
      ];
      
      // Register the basic shader
      this.engine.registerSurface("basic", new LegacyShaderSurface({
        id: "basic",
        name: "Free Roaming Scene",
        description: "Basic scene with simple square room",
        shaderPath: "./shader/basic.frag",
        vertices: basicVertices,
        initialPosition: new THREE.Vector3(0, 1, 0)
      }));
      
      // Register the L shader if available
      this.engine.registerSurface("L", new LegacyShaderSurface({
        id: "L",
        name: "L Surface",
        description: "L-shaped surface with teleportation",
        shaderPath: "./shader/L.frag",
        // L-shape vertices
        vertices: [
          new THREE.Vector3(0.0, 0, 0.0),
          new THREE.Vector3(2.0, 0, 0.0),
          new THREE.Vector3(2.0, 0, 1.0),
          new THREE.Vector3(1.0, 0, 1.0),
          new THREE.Vector3(1.0, 0, 2.0),
          new THREE.Vector3(0.0, 0, 2.0),
          new THREE.Vector3(0.0, 0, 0.0)
        ],
        initialPosition: new THREE.Vector3(0.5, 1, 0.5)
      }));
      
      // Register the double pentagon translation shader if available
      this.engine.registerSurface("double_pentagon_translation", new LegacyShaderSurface({
        id: "double_pentagon_translation",
        name: "Double Pentagon Translation",
        description: "Double pentagon with translation teleportation",
        shaderPath: "./shader/double_pentagon_translation.frag",
        // Pentagon vertices
        vertices: [
          new THREE.Vector3(3.61803399, 0, 0.00000000),
          new THREE.Vector3(2.23606798, 0, 1.90211303),
          new THREE.Vector3(0.00000000, 0, 1.17557050),
          new THREE.Vector3(-2.23606798, 0, 1.90211303),
          new THREE.Vector3(-3.61803399, 0, 0.00000000),
          new THREE.Vector3(-2.23606798, 0, -1.90211303),
          new THREE.Vector3(-0.00000000, 0, -1.17557050),
          new THREE.Vector3(2.23606798, 0, -1.90211303),
          new THREE.Vector3(3.61803399, 0, 0.00000000)
        ],
        initialPosition: new THREE.Vector3(0, 1, 0)
      }));
      
      // Register the double pentagon mirror shader if available
      this.engine.registerSurface("double_pentagon_mirror", new LegacyShaderSurface({
        id: "double_pentagon_mirror",
        name: "Double Pentagon Mirror",
        description: "Double pentagon with mirror reflections",
        shaderPath: "./shader/double_pentagon_mirror.frag",
        // Pentagon vertices (same as translation)
        vertices: [
          new THREE.Vector3(3.61803399, 0, 0.00000000),
          new THREE.Vector3(2.23606798, 0, 1.90211303),
          new THREE.Vector3(0.00000000, 0, 1.17557050),
          new THREE.Vector3(-2.23606798, 0, 1.90211303),
          new THREE.Vector3(-3.61803399, 0, 0.00000000),
          new THREE.Vector3(-2.23606798, 0, -1.90211303),
          new THREE.Vector3(-0.00000000, 0, -1.17557050),
          new THREE.Vector3(2.23606798, 0, -1.90211303),
          new THREE.Vector3(3.61803399, 0, 0.00000000)
        ],
        initialPosition: new THREE.Vector3(0, 1, 0)
      }));
      
      // Create a basic square polygon configuration
      const squareConfig = {
        "id": "square_json",
        "name": "Square Room (JSON)",
        "description": "A simple square room from JSON configuration",
        "vertices": [
          [2.0, 2.0],
          [-2.0, 2.0],
          [-2.0, -2.0],
          [2.0, -2.0],
          [2.0, 2.0]
        ],
        "edges": [
          {
            "id": 0,
            "type": "translation",
            "vector": [0.0, 0.0, -4.0]
          },
          {
            "id": 1,
            "type": "translation",
            "vector": [4.0, 0.0, 0.0]
          },
          {
            "id": 2,
            "type": "translation",
            "vector": [0.0, 0.0, 4.0]
          },
          {
            "id": 3,
            "type": "translation",
            "vector": [-4.0, 0.0, 0.0]
          }
        ],
        "initialPosition": [0.0, 1.0, 0.0],
        "wallHeight": 2.0,
        "teleportThreshold": 0.1,
        "teleportHeightRange": [0.0, 2.0],
        "decorations": [
          {
            "type": "sphere",
            "position": [0.0, 1.0, 0.0],
            "radius": 0.13,
            "animation": {
              "enabled": false
            }
          }
        ]
      };
      
      // Register the square JSON surface
      this.engine.registerSurfaceFromJSON(squareConfig);
      
      console.log("Registered surfaces successfully");
      
      // For troubleshooting, log the available surfaces
      console.log("Available surfaces:", Array.from(this.engine.surfaces.keys()));
      
      // Update surface selector UI with all surfaces
      this.updateSurfaceSelector();
    } catch (error) {
      console.error("Failed to load surfaces:", error);
      throw error;
    }
  }
  
  updateSurfaceSelector() {
    const select = document.getElementById('shader-select');
    
    // Clear existing options
    select.innerHTML = '';
    
    // Get all registered surfaces
    const surfaceIds = Array.from(this.engine.surfaces.keys());
    
    // Add options for each surface
    for (const id of surfaceIds) {
      const surface = this.engine.surfaces.get(id);
      const option = document.createElement('option');
      option.value = id;
      option.textContent = surface.name;
      select.appendChild(option);
    }
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
    
    // Add toggle FPS counter button
    const fpsToggleBtn = document.createElement('button');
    fpsToggleBtn.className = 'control-btn';
    fpsToggleBtn.id = 'toggle-fps';
    fpsToggleBtn.textContent = 'Toggle FPS';
    fpsToggleBtn.addEventListener('click', () => {
      this.stats.toggle();
    });
    controlsDiv.appendChild(fpsToggleBtn);
  }
  
  async changeSurface(surfaceId) {
    try {
      console.log(`Attempting to change to surface: ${surfaceId}`);
      console.log(`Available surfaces: ${Array.from(this.engine.surfaces.keys())}`);
      
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
  
  async start() {
    try {
      console.log("Starting application...");
      console.log("Available surfaces:", Array.from(this.engine.surfaces.keys()));
      
      // Change to initial surface (basic by default)
      await this.changeSurface('basic');
      
      // Start animation loop
      this.engine.animate((delta) => this.update(delta));
      console.log("Animation loop started");
    } catch (error) {
      console.error("Failed to start application:", error);
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = "Failed to start application: " + error.message;
    }
  }
  
  update(delta) {
    // Update stats
    this.stats.update();
    
    // Handle camera position update from input
    this.input.update(delta);
    
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