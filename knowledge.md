# Ray Marching Flat Surfaces - Modular Architecture

## Overview
WebGL visualization of ray marching on non-Euclidean surfaces using Three.js and GLSL shaders. This project demonstrates how to implement ray marching techniques for exploring locally flat surfaces with interesting global properties, creating non-Euclidean spaces that behave differently than our normal 3D environment.

## Project Structure
```
/RayMarchingFlatSurfaces/
├── src/
│   ├── core/
│   │   ├── Engine.js
│   │   ├── Input.js
│   │   ├── Camera.js
│   │   └── ShaderLoader.js
│   ├── surfaces/
│   │   ├── Surface.js
│   │   ├── LSurface.js
│   │   ├── PentagonSurface.js
│   │   └── PentagonMirrorSurface.js
│   ├── utils/
│   │   ├── Teleport.js
│   │   ├── UI.js
│   │   └── FloorPlan.js        
│   └── main.js
├── shader/                  # Your GLSL shader files (at project root)
│   ├── L.frag
│   ├── double_pentagon_mirror.frag
│   └── double_pentagon_translation.frag
├── index.html
├── vite.config.js
└── package.json
```

## Core Rendering Flow
1. The application uses **two cameras**:
   - **Static Camera**: Always fixed, renders a full-screen quad with the shader
   - **Dynamic Camera**: Used only for position and orientation, provides uniforms to the shader

2. **Ray Marching Process**:
   - Dynamic camera position and orientation are passed as uniforms to the fragment shader
   - Fragment shader performs ray marching from the camera position
   - When rays hit edges, transformations are applied in the shader

3. **Camera Teleportation**:
   - Camera position is checked against the current surface's polygon (in XZ plane)
   - If camera is outside the polygon, the closest edge is found
   - Transformation associated with that edge is applied to teleport the camera
   - Process repeats until camera is inside the polygon
   - 2D floor plan visualization shows the camera position and polygon edges with numbering

## Key Components

### Engine
Manages Three.js setup, scene, renderer, and animation loop:
```javascript
class Engine {
  constructor(container) {
    // Initialize Three.js components and shader uniforms
  }
  
  initRenderer() {
    // Set up WebGL renderer
  }
  
  initScene() {
    // Create scene with full-screen quad for shaders
  }
  
  registerSurface(id, surface) {
    // Register a surface with a unique ID
  }
  
  async changeSurface(surfaceId) {
    // Switch to a different surface
  }
  
  updateShaderUniforms() {
    // Update shader uniforms with camera information
  }
  
  animate(updateCallback) {
    // Run animation loop
  }
  
  resize(width, height) {
    // Handle window/container resize
  }
}
```

### Camera
Manages camera position, orientation, and height:
```javascript
class Camera {
  constructor(container) {
    // Initialize camera and height settings
  }
  
  handleResize(width, height) {
    // Update camera aspect ratio
  }
  
  setPosition(position) {
    // Set camera position (XZ plane)
  }
  
  getPosition() {
    // Get current camera position
  }
  
  setHeight(height) {
    // Set camera height (Y position)
  }
  
  getHeight() {
    // Get current camera height
  }
  
  updateHeight(delta, moveUp, moveDown, speed) {
    // Update camera height based on input
  }
  
  getViewInfo() {
    // Get camera position, front and up vectors for shader
  }
  
  reset(position) {
    // Reset camera position and orientation
  }
}
```

### Input
Handles user input for camera movement and interaction:
```javascript
class Input {
  constructor(domElement, camera) {
    // Set up input handling for the provided camera
  }
  
  setupEventListeners() {
    // Add event listeners for mouse and keyboard
  }
  
  onMouseMove(event) {
    // Handle mouse movement for camera rotation
  }
  
  onKeyDown(event) {
    // Handle key presses
  }
  
  onKeyUp(event) {
    // Handle key releases
  }
  
  update(delta) {
    // Update camera position based on input
  }
  
  getVerticalMovement() {
    // Get vertical movement state (up/down)
  }
}
```

### ShaderLoader
Handles loading and compiling shaders:
```javascript
class ShaderLoader {
  constructor() {
    // Initialize with standard vertex shader
  }
  
  async loadFragmentShader(path) {
    // Load fragment shader from file
  }
  
  createMaterial(fragmentShaderSource, uniforms) {
    // Create Three.js shader material
  }
}
```

### Surface (Base Class)
Template for all mathematical surfaces:
```javascript
class Surface {
  constructor(config) {
    // Initialize with configuration options
  }
  
  async loadShader() {
    // Load surface-specific shader
  }
  
  async createMaterial(sharedUniforms) {
    // Create material with shared uniforms
  }
  
  activate() {
    // Activate this surface
  }
  
  deactivate() {
    // Deactivate this surface
  }
  
  update(delta) {
    // Update surface state if needed
  }
  
  checkTeleport(position) {
    // Check and handle teleportation
  }
  
  isHeightInTeleportRange(height) {
    // Check if height is valid for teleportation
  }
  
  getInitialPosition() {
    // Get recommended starting position
  }
}
```

### Specific Surface Implementation
Example for the L-shaped surface:
```javascript
class LSurface extends Surface {
  constructor() {
    // Initialize with L-surface specific config
  }
  
  static createGeometry(b) {
    // Create L-shape polygon vertices
  }
  
  static createTranslations(b) {
    // Create translation vectors for each edge
  }
  
  checkTeleport(position) {
    // L-surface specific teleportation logic
  }
}
```

### Teleport Utilities
Functions for teleportation calculations:
```javascript
// Helper function to determine if a point is to the left of a line
export function isLeft(a, b, p) {
  // Vector math for point-line relationship
}

// Check if point is inside polygon
export function isInsidePolygon(p, polygon) {
  // Winding number algorithm
}

// Calculate distance from point to line segment
export function distToLineSegment(p, v1, v2) {
  // Point-line segment distance calculation
}

// Calculate signed distance function for polygon
export function polygonSDF(p, polygonVertices) {
  // Find closest edge and calculate signed distance
}

// Apply translation based on edge
export function applyTranslation(pos, edgeIndex, translations) {
  // Apply appropriate translation vector
}
```

### UI
Manages user interface elements:
```javascript
class UI {
  constructor(container) {
    // Initialize UI elements
  }
  
  createElements() {
    // Create overlay UI elements
  }
  
  createOverlay(options) {
    // Create an overlay element with options
  }
  
  updateCameraInfo(position, height) {
    // Update camera position display
  }
  
  updateHeightInfo(height) {
    // Update height display
  }
  
  updateTeleportStatus(status) {
    // Update teleportation status display
  }
  
  updateResolution(width, height, pixelRatio) {
    // Update resolution display
  }
  
  updateCurrentShader(name) {
    // Update current shader/surface display
  }
}
```

### FloorPlan
Provides a 2D visualization of the current surface and camera position:
```javascript
class FloorPlan {
  constructor(container) {
    // Initialize SVG container and elements
  }
  
  createElements() {
    // Create SVG elements for the floor plan
  }
  
  setSurface(surface) {
    // Update the floor plan to show the current surface
  }
  
  createEdgeLabels(vertices) {
    // Add numbered labels to each edge of the polygon
  }
  
  updateTransform() {
    // Update SVG transformations for proper scaling and centering
  }
  
  updateCameraPosition(position, frontVector) {
    // Update camera marker and direction indicator
  }
  
  resize() {
    // Handle container resizing
  }
  
  toggle() {
    // Toggle floor plan visibility
  }
  
  show() {
    // Show the floor plan
  }
  
  hide() {
    // Hide the floor plan
  }
}
```

## Main Application
Brings everything together in the main.js file:
```javascript
class Application {
  constructor() {
    // Initialize application components
  }
  
  initComponents() {
    // Create Engine, Camera, Input, UI and FloorPlan
  }
  
  registerSurfaces() {
    // Register available surfaces
  }
  
  setupResizeObserver() {
    // Handle container resizing
  }
  
  setupFullscreen() {
    // Handle fullscreen mode
  }
  
  setupUIEvents() {
    // Set up UI interaction including floor plan toggle
  }
  
  async changeSurface(surfaceId) {
    // Change to selected surface and update floor plan
  }
  
  start() {
    // Start the application
  }
  
  update(delta) {
    // Update application state and floor plan
  }
}
```

## Animation Loop Flow
The main animation loop handles the core logic flow:

```javascript
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
    } else if (teleportResult.outsidePolygon) {
      // For mirror surfaces: outside polygon but teleport handled in shader
      this.ui.updateTeleportStatus('shader-teleport');
    } else {
      // Always ready for teleport when in height range
      this.ui.updateTeleportStatus('ready');
    }
  }
  
  // Update shader uniforms with camera view info
  const viewInfo = this.camera.getViewInfo();
  this.engine.uniforms.rayMarchCamPos.value.copy(viewInfo.position);
  this.engine.uniforms.rayMarchCamFront.value.copy(viewInfo.front);
  this.engine.uniforms.rayMarchCamUp.value.copy(viewInfo.up);
  
  // Update floor plan with camera position
  this.floorPlan.updateCameraPosition(viewInfo.position, viewInfo.front);
}
```

## Shader Implementation Details

### Wall Representation
- Walls are implemented as thin boxes with epsilon thickness 
- This approach uses efficient box SDF functions rather than plane SDFs
- Each edge of the polygon has a corresponding box SDF
```glsl
// Example from L.frag
float df = sdBox(p - vec3(0.,0.,2.*b + eps), vec3(b, wall_height, eps)); // Edge 6
df = opUnion(df, sdBox(p - vec3(-b-eps,0., b), vec3(eps, wall_height, 1.*b))); // Edge 8
```

### Ray Teleportation in Shaders
- When a ray hits a wall in the shader, specific edge detection is needed
- Each collision with a wall requires custom position adjustment
```glsl
// Example from L.frag
if(sdBox(pos - vec3(0.,0.,2.*b+eps), vec3(b, wall_height, eps)) < eps) { // Edge 6
    pos.z = -2. * b + 2.*eps;
    pos += h * ray;
    collision_count += 1.;            
}
```

### Camera vs. Ray Teleportation
- Camera teleportation: Handled in JavaScript using polygon SDF and transformations
- Ray teleportation: Handled in GLSL with explicit box tests for each edge
- Both use the same conceptual transformations but with different implementations
- The FloorPlan visualization helps correlate edge indices between JS and GLSL code

## Surface Teleportation Logic
Each surface implements its own teleportation logic:

```javascript
checkTeleport(position) {
  const vertices = this.config.teleportConfig.vertices;
  const translations = this.config.teleportConfig.translations;
  
  // Get SDF result (distance and edge index)
  const sdfResult = polygonSDF(position, vertices);
  
  // If outside polygon and close to edge, teleport
  if (sdfResult.distance > 0 && sdfResult.distance < this.teleportThreshold) {
    // Apply appropriate translation
    const newPosition = applyTranslation(position, sdfResult.edgeIndex, translations);
    
    // Return the new position with teleport status
    return {
      teleported: true,
      newPosition: newPosition
    };
  }
  
  return {
    teleported: false
  };
}
```

## User Interface Features

### Floor Plan Visualization
- Provides a 2D top-down view of the current surface in the XZ plane
- Shows numbered edges corresponding to the indices used in teleportation logic
- Updates camera position and facing direction in real-time
- Can be toggled on/off with the 'M' key or via UI button
- Helps visualize teleportation points and understand the surface geometry
- Flips X coordinates horizontally to match visualization expectations

### Controls
The application provides the following controls:
- **WASD**: Move in the XZ plane
- **E/Q**: Move up/down (Y axis)
- **Mouse**: Look around
- **M**: Toggle floor plan visibility
- Surface selector: Change between different surfaces
- Fullscreen button: Enter/exit fullscreen mode
- Reset Size button: Reset the canvas to default size

## Building and Development

### Development
Run the development server:
```
npm run dev
```

### Production Build
Build for production:
```
npm run build
```

Preview the production build:
```
npm run preview
```

## Implementation Notes
1. Each surface handles its own geometry, shader, and teleportation logic
2. Uniform camera controls interface across all surfaces
3. All surfaces receive the same basic uniforms
4. Switching between surfaces is handled through the Engine
5. Each shader follows consistent structure with surface-specific SDFs
6. For production, shader files should be placed in the public directory
7. Camera teleportation and ray teleportation use the same mathematical principles but are implemented differently
8. The floor plan visualization makes edge identification easier by showing numbered labels
9. Mirror surfaces share the same polygon geometry as their translation counterparts for visualization purposes