import * as THREE from 'three';

class Engine {
  constructor(container) {
    this.container = container;
    this.surfaces = new Map();
    this.currentSurface = null;
    this.currentSurfaceId = null;
    this.lastTime = performance.now();
    this.uniforms = {
      iTime: { value: 0.0 },
      iResolution: { value: new THREE.Vector2() },
      rayMarchCamPos: { value: new THREE.Vector3() },
      rayMarchCamFront: { value: new THREE.Vector3() },
      rayMarchCamUp: { value: new THREE.Vector3(0, 1, 0) },
      iPixelRatio: { value: window.devicePixelRatio }
    };
    
    this.initRenderer();
    this.initScene();
  }
  
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    
    this.renderer.setClearColor(0x333333);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);
    
    // Update resolution uniform
    this.uniforms.iResolution.value.set(
      width * window.devicePixelRatio,
      height * window.devicePixelRatio
    );
  }
  
  initScene() {
    // Static scene for the quad with shader
    this.staticScene = new THREE.Scene();
    
    // Static camera for rendering the quad
    this.staticCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.staticCamera.position.z = 1;
    
    // Create a full-screen quad for ray marching
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x333333 }));
    this.staticScene.add(this.quad);
  }
  
  registerSurface(id, surface) {
    this.surfaces.set(id, surface);
  }
  
  async changeSurface(surfaceId) {
    if (!this.surfaces.has(surfaceId)) {
      console.error(`Surface '${surfaceId}' not registered`);
      return false;
    }
    
    // Deactivate current surface if there is one
    if (this.currentSurface) {
      this.currentSurface.deactivate();
    }
    
    // Set new surface as current
    this.currentSurfaceId = surfaceId;
    this.currentSurface = this.surfaces.get(surfaceId);
    
    // Create material and activate the surface
    await this.currentSurface.createMaterial(this.uniforms);
    this.quad.material = this.currentSurface.material;
    
    // Reset camera position to the recommended starting position for this surface
    const startPos = this.currentSurface.getInitialPosition();
    
    return {
      success: true,
      initialPosition: startPos,
      surfaceName: this.currentSurface.config.displayName
    };
  }
  
  animate(updateCallback) {
    // Request next frame
    requestAnimationFrame(() => this.animate(updateCallback));
    
    // Calculate delta time
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Update time uniform for shaders
    this.uniforms.iTime.value += delta;
    
    // Call the update callback (for camera/input handling)
    if (updateCallback) {
      updateCallback(delta);
    }
    
    // Render using the static camera and scene (with shader quad)
    this.renderer.render(this.staticScene, this.staticCamera);
  }
  
  resize(width, height) {
    this.renderer.setSize(width, height);
    this.uniforms.iResolution.value.set(
      width * window.devicePixelRatio,
      height * window.devicePixelRatio
    );
  }
  
  getDomElement() {
    return this.renderer.domElement;
  }
}

export default Engine;