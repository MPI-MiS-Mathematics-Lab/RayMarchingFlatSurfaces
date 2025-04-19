// src/core/Engine.js
import * as THREE from 'three';
import ShaderGenerator from './ShaderGenerator.js';

class Engine {
  constructor(container) {
    this.container = container;
    this.lastTime = performance.now();
    this.uniforms = {
      iTime: { value: 0.0 },
      iResolution: { value: new THREE.Vector2() },
      rayMarchCamPos: { value: new THREE.Vector3() },
      rayMarchCamFront: { value: new THREE.Vector3() },
      rayMarchCamUp: { value: new THREE.Vector3(0, 1, 0) },
      iPixelRatio: { value: window.devicePixelRatio }
    };
    
    this.shaderGenerator = new ShaderGenerator();
    this.currentGeometryId = 'L_shape'; // Default geometry
    this.isShaderLoaded = false;
    this.currentPosition = new THREE.Vector3(0, 1, 0);
    
    this.initRenderer();
    this.initScene();
    this.initShaderGenerator();
  }
  
  async initShaderGenerator() {
    try {
      // Initialize the shader generator
      await this.shaderGenerator.initialize();
      
      // Load the default geometry
      this.loadGeometry(this.currentGeometryId);
      
    } catch (error) {
      console.error("Failed to initialize shader generator:", error);
      this.displayError(`Failed to initialize: ${error.message}`);
    }
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
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        void main() {
          gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0); // Default gray color while loading
        }
      `
    });
    
    this.quad = new THREE.Mesh(geometry, this.material);
    this.staticScene.add(this.quad);
  }
  
  displayError(message) {
    const errorElement = document.getElementById('error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
    console.error(message);
  }
  
  async loadGeometry(geometryId) {
    try {
      this.isShaderLoaded = false;
      
      // Display loading indication
      this.material.fragmentShader = `
        void main() {
          gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0); // Darker gray while loading
        }
      `;
      this.material.needsUpdate = true;
      
      // Generate shader for the selected geometry
      const { shader, initialPosition, description, name } = await this.shaderGenerator.generateShader(geometryId);
      
      // Update material with the new shader
      this.material.fragmentShader = shader;
      this.material.needsUpdate = true;
      
      // Store the current geometry ID
      this.currentGeometryId = geometryId;
      
      // Set the initial position
      if (initialPosition) {
        this.currentPosition.set(initialPosition[0], initialPosition[1], initialPosition[2]);
      }
      
      // Update the description in the UI
      const descriptionElement = document.getElementById('geometry-description');
      if (descriptionElement) {
        descriptionElement.textContent = description || name;
      }
      
      this.isShaderLoaded = true;
      console.log(`Geometry '${geometryId}' loaded successfully`);
      
      // Hide any error messages
      const errorElement = document.getElementById('error');
      if (errorElement) {
        errorElement.style.display = 'none';
      }
      
      return { initialPosition };
    } catch (error) {
      this.displayError(`Failed to load geometry '${geometryId}': ${error.message}`);
      console.error(`Failed to load geometry '${geometryId}':`, error);
      return { initialPosition: [0, 1, 0] };
    }
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
    if (updateCallback && this.isShaderLoaded) {
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
    this.uniforms.iPixelRatio.value = window.devicePixelRatio;
  }
  
  getDomElement() {
    return this.renderer.domElement;
  }
  
  getCurrentGeometryId() {
    return this.currentGeometryId;
  }
  
  getInitialPosition() {
    return this.currentPosition;
  }
}

export default Engine;