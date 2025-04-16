import * as THREE from 'three';

/**
 * ShaderLoader utility for loading and compiling shaders
 */
class ShaderLoader {
  constructor() {
    // Default vertex shader for full-screen quad
    this.vertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;
    
    // For debugging, provide a default fragment shader
    this.defaultFragShader = `
      uniform vec2 iResolution;
      uniform float iTime;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        vec3 color = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }
  
  /**
   * Load a fragment shader from a file path
   * @param {string} path - Path to the shader file
   * @returns {Promise<string>} - The loaded shader code
   */
  async loadFragmentShader(path) {
    try {
      console.log(`Attempting to load shader from path: ${path}`);
      
      // Try to fetch the shader file
      const response = await fetch(path);
      
      if (!response.ok) {
        console.warn(`Failed to load shader from ${path}: ${response.statusText}`);
        console.warn('Falling back to default fragment shader');
        return this.defaultFragShader;
      }
      
      const shaderText = await response.text();
      console.log(`Successfully loaded shader (${shaderText.length} bytes)`);
      return shaderText;
    } catch (error) {
      console.error(`Error loading shader from ${path}:`, error);
      console.warn('Falling back to default fragment shader');
      return this.defaultFragShader;
    }
  }
  
  /**
   * Create a Three.js shader material
   * @param {string} fragmentShaderSource - Fragment shader source code
   * @param {Object} uniforms - Shader uniforms
   * @returns {THREE.ShaderMaterial} - The created material
   */
  createMaterial(fragmentShaderSource, uniforms) {
    return new THREE.ShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader: fragmentShaderSource,
      uniforms: uniforms
    });
  }
}

export default ShaderLoader;