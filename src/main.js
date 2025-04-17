// src/main.js
import Engine from './core/Engine.js';
import Camera from './core/Camera.js';
import Input from './core/Input.js';
import SimpleFloorPlan from './utils/FloorPlan.js'; // Import the SimpleFloorPlan
import Teleport from './utils/Teleport.js'; // Import the Teleport class
import Stats from 'three/addons/libs/stats.module.js';
import * as THREE from 'three';


document.addEventListener('DOMContentLoaded', async () => {
  // Get the container element
  const container = document.querySelector('.canvas-container');
  if (!container) {
    console.error("Container element not found");
    return;
  }
  
  // Initialize the engine
  const engine = new Engine(container);
  
  // Initialize the camera
  const camera = new Camera(container);
  
  // Initialize the input controller
  const input = new Input(engine.getDomElement(), camera.getCamera());
  
  // Initialize the floor plan
  const floorPlan = new SimpleFloorPlan(container);
  
  // Initialize the teleport handler
  const teleport = new Teleport();
  
  // Load the initial geometry for the floor plan
  floorPlan.loadGeometry(engine.getCurrentGeometryId());
  
  // Create stats panel
  const stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = '10px';
  stats.dom.style.right = '10px';
  stats.dom.style.left = 'auto';
  container.appendChild(stats.dom);
  
  // Create position display
  const positionDisplay = document.createElement('div');
  positionDisplay.id = 'position-display';
  positionDisplay.style.position = 'absolute';
  positionDisplay.style.bottom = '10px';
  positionDisplay.style.right = '10px';
  positionDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  positionDisplay.style.color = 'white';
  positionDisplay.style.padding = '5px';
  positionDisplay.style.borderRadius = '4px';
  positionDisplay.style.fontFamily = 'monospace';
  positionDisplay.style.fontSize = '12px';
  container.appendChild(positionDisplay);

  // Handle the teleport toggle
  const teleportToggle = document.getElementById('teleport-toggle');
  if (teleportToggle) {
    // Initialize teleport to match the toggle's initial state
    teleport.setEnabled(teleportToggle.checked);
    
    // Update teleport status indicator
    const updateTeleportStatus = (enabled) => {
      const statusElement = document.getElementById('teleport-status');
      if (statusElement) {
        statusElement.textContent = `Teleport: ${enabled ? 'ON' : 'OFF'}`;
        statusElement.style.color = enabled ? '#5a8' : '#e55';
      }
    };
    
    // Initialize status
    updateTeleportStatus(teleportToggle.checked);
    
    // Add event listener for toggle changes
    teleportToggle.addEventListener('change', (event) => {
      const isEnabled = event.target.checked;
      teleport.setEnabled(isEnabled);
      
      // Update status text in the UI
      const toggleLabel = teleportToggle.parentElement.nextElementSibling;
      if (toggleLabel) {
        toggleLabel.textContent = isEnabled ? 'Enable Teleportation' : 'Disable Teleportation';
      }
      
      // Update the status indicator
      updateTeleportStatus(isEnabled);
    });
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    updateResolutionDisplay(container);
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    engine.resize(width, height);
    camera.handleResize(width, height);
    floorPlan.resize(); // Resize floor plan
  });
  
  // Update resolution information when container is resized
  const resizeObserver = new ResizeObserver(() => {
    updateResolutionDisplay(container);
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    engine.resize(width, height);
    camera.handleResize(width, height);
    floorPlan.resize(); // Resize floor plan
  });
  
  resizeObserver.observe(container);
  
  // Setup fullscreen button
  const fullscreenBtn = document.getElementById('fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    });
  }
  
  // Setup reset size button
  const resetSizeBtn = document.getElementById('reset-size');
  if (resetSizeBtn) {
    resetSizeBtn.addEventListener('click', () => {
      container.style.width = '800px';
      container.style.height = '600px';
      updateResolutionDisplay(container);
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      engine.resize(width, height);
      camera.handleResize(width, height);
      floorPlan.resize(); // Resize floor plan
    });
  }
  
  // Setup geometry selector dropdown
  const geometrySelect = document.getElementById('geometry-select');
  if (geometrySelect) {
    geometrySelect.addEventListener('change', async (event) => {
      const geometryId = event.target.value;
      
      try {
        // Load new geometry
        const { initialPosition } = await engine.loadGeometry(geometryId);
        
        // Update floor plan with the new geometry
        floorPlan.loadGeometry(geometryId);
        
        // Set the current geometry for the teleport system
        teleport.setGeometry(await engine.shaderGenerator.loadGeometryFile(geometryId));
        
        // Reset camera position to initial position for the new geometry
        if (initialPosition) {
          const pos = new THREE.Vector3(
            initialPosition[0],
            initialPosition[1],
            initialPosition[2]
          );
          camera.reset(pos);
        }
      } catch (error) {
        console.error(`Failed to load geometry: ${error.message}`);
      }
    });
    
    // Set initial value to match the engine's default
    geometrySelect.value = engine.getCurrentGeometryId();
  }
  
  // Initial geometry loading for teleport
  try {
    const currentGeometryId = engine.getCurrentGeometryId();
    teleport.setGeometry(await engine.shaderGenerator.loadGeometryFile(currentGeometryId));
  } catch (error) {
    console.error(`Failed to load initial geometry for teleport: ${error.message}`);
  }
  
  // Animation loop update function
  const update = (delta) => {
    // Begin stats measurement
    stats.begin();
    
    // Update camera height based on input
    const verticalMovement = input.getVerticalMovement();
    camera.updateHeight(
      delta,
      verticalMovement.moveUp,
      verticalMovement.moveDown,
      input.verticalSpeed
    );
    
    // Get previous position
    const prevPosition = camera.getPosition().clone();
    
    // Update camera position based on input
    input.update(delta);
    
    // Get updated camera view info for ray marching
    const viewInfo = camera.getViewInfo();
    
    // Check for teleportation
    const didTeleport = teleport.checkAndTeleport(
      viewInfo.position, 
      viewInfo.front, 
      camera
    );
    
    // If teleported, get updated view info
    if (didTeleport) {
      const updatedInfo = camera.getViewInfo();
      viewInfo.position.copy(updatedInfo.position);
      viewInfo.front.copy(updatedInfo.front);
      viewInfo.up.copy(updatedInfo.up);
    }
    
    // Update uniforms with camera data
    engine.uniforms.rayMarchCamPos.value.copy(viewInfo.position);
    engine.uniforms.rayMarchCamFront.value.copy(viewInfo.front);
    engine.uniforms.rayMarchCamUp.value.copy(viewInfo.up);
    
    // Update floor plan with camera position
    floorPlan.updateCameraPosition(viewInfo.position, viewInfo.front);
    
    // Update position display
    const pos = viewInfo.position;
    positionDisplay.textContent = `X: ${pos.x.toFixed(2)} Y: ${pos.y.toFixed(2)} Z: ${pos.z.toFixed(2)}`;
    
    // End stats measurement
    stats.end();
  };
  
  // Start the animation loop
  engine.animate(update);
  
  // Initial resolution display update
  updateResolutionDisplay(container);
});

// Helper function to update resolution display
function updateResolutionDisplay(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const pixelRatio = window.devicePixelRatio;
  
  const resolutionElement = document.getElementById('resolution');
  const actualResolutionElement = document.getElementById('actual-resolution');
  const pixelRatioElement = document.getElementById('pixel-ratio');
  
  if (resolutionElement) {
    resolutionElement.textContent = `${width}×${height}`;
  }
  
  if (actualResolutionElement) {
    actualResolutionElement.textContent = `${Math.round(width * pixelRatio)}×${Math.round(height * pixelRatio)}`;
  }
  
  if (pixelRatioElement) {
    pixelRatioElement.textContent = pixelRatio.toFixed(2);
  }
}