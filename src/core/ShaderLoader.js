import * as THREE from 'three';

class ShaderLoader {
  constructor() {
    // Simple vertex shader that won't change
    this.vertexShaderSource = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
    `;
  }
  
  async loadFragmentShader(path) {
    try {
      // Use Vite's ?raw import for shader files
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load fragment shader: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error("Shader loading error:", error);
      throw error;
    }
  }
  
  createMaterial(fragmentShaderSource, uniforms) {
    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: this.vertexShaderSource,
      fragmentShader: fragmentShaderSource
    });
  }
}

export default ShaderLoader;