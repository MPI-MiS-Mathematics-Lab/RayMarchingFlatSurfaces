import * as THREE from 'three';

/**
 * Camera class for handling position, orientation, and height
 */
class Camera {
  /**
   * Create a camera
   * @param {HTMLElement} container - Container element
   */
  constructor(container) {
    // Create a ThreeJS camera for internal use
    this.initCamera(container);
    
    // Local position and orientation
    this.position = new THREE.Vector3(0, 1, 0);
    this.direction = new THREE.Vector3(0, 0, -1);
    this.up = new THREE.Vector3(0, 1, 0);
    
    // Height constraints
    this.minHeight = 0.1;
    this.maxHeight = 3.0;
    
    // Pitch constraints (in radians)
    this.minPitch = -Math.PI / 2 + 0.01; // Just above looking straight down
    this.maxPitch = Math.PI / 2 - 0.01;  // Just below looking straight up
    
    // Current pitch and yaw
    this.pitch = 0;
    this.yaw = 0;
    
    console.log('Camera initialized');
  }
  
  /**
   * Initialize the Three.js camera
   * @param {HTMLElement} container - Container element
   */
  initCamera(container) {
    // Get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Create perspective camera
    this.threeCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  }
  
  /**
   * Handle container resize
   * @param {number} width - New width
   * @param {number} height - New height
   */
  handleResize(width, height) {
    // Update camera aspect ratio
    this.threeCamera.aspect = width / height;
    this.threeCamera.updateProjectionMatrix();
  }
  
  /**
   * Get the Three.js camera
   * @returns {THREE.PerspectiveCamera} - The ThreeJS camera object
   */
  getCamera() {
    return this.threeCamera;
  }
  
  /**
   * Set camera position
   * @param {THREE.Vector3} position - New position
   */
  setPosition(position) {
    this.position.copy(position);
  }
  
  /**
   * Get camera position
   * @returns {THREE.Vector3} - Current position
   */
  getPosition() {
    return this.position.clone();
  }
  
  /**
   * Set camera height
   * @param {number} height - New height
   */
  setHeight(height) {
    const clampedHeight = Math.max(this.minHeight, Math.min(height, this.maxHeight));
    this.position.y = clampedHeight;
  }
  
  /**
   * Get camera height
   * @returns {number} - Current height
   */
  getHeight() {
    return this.position.y;
  }
  
  /**
   * Update camera height based on input
   * @param {number} delta - Time since last update
   * @param {boolean} moveUp - Should move up
   * @param {boolean} moveDown - Should move down
   * @param {number} speed - Movement speed
   * @returns {boolean} - True if height was changed
   */
  updateHeight(delta, moveUp, moveDown, speed) {
    let heightChanged = false;
    
    // Calculate move distance
    const moveDistance = speed * delta;
    
    // Apply height change
    if (moveUp) {
      this.setHeight(this.position.y + moveDistance);
      heightChanged = true;
    }
    if (moveDown) {
      this.setHeight(this.position.y - moveDistance);
      heightChanged = true;
    }
    
    return heightChanged;
  }
  
  /**
   * Rotate camera around Y axis
   * @param {number} angle - Angle in radians
   */
  rotateY(angle) {
    // Update yaw
    this.yaw += angle;
    
    // Update direction based on pitch and yaw
    this.updateDirection();
  }
  
  /**
   * Rotate camera around X axis (controls pitch)
   * @param {number} angle - Angle in radians
   */
  rotateX(angle) {
    // Update pitch with constraints
    this.pitch += angle;
    this.pitch = Math.max(this.minPitch, Math.min(this.pitch, this.maxPitch));
    
    // Update direction based on pitch and yaw
    this.updateDirection();
  }
  
  /**
   * Update direction vector based on pitch and yaw
   */
  updateDirection() {
    // Calculate direction based on pitch and yaw
    this.direction.x = Math.sin(this.yaw) * Math.cos(this.pitch);
    this.direction.y = Math.sin(this.pitch);
    this.direction.z = Math.cos(this.yaw) * Math.cos(this.pitch);
    this.direction.normalize();
  }
  
  /**
   * Move camera forward along direction vector
   * @param {number} distance - Distance to move
   */
  moveForward(distance) {
    // Create a horizontal movement vector (no vertical movement)
    const horizontalDir = new THREE.Vector3(this.direction.x, 0, this.direction.z).normalize();
    
    // Move position along horizontal direction
    this.position.x += horizontalDir.x * distance;
    this.position.z += horizontalDir.z * distance;
  }
  
  /**
   * Move camera right, perpendicular to direction vector
   * @param {number} distance - Distance to move
   */
  moveRight(distance) {
    // Calculate right vector (cross product of direction and up)
    const right = new THREE.Vector3().crossVectors(this.direction, this.up).normalize();
    
    // Move position along right vector (only x and z components)
    this.position.x += right.x * distance;
    this.position.z += right.z * distance;
  }
  
  /**
   * Get camera view info for shaders
   * @returns {Object} - Object with position, front and up vectors
   */
  getViewInfo() {
    return {
      position: this.position.clone(),
      front: this.direction.clone(),
      up: this.up.clone()
    };
  }
  
  /**
   * Reset camera position and orientation
   * @param {THREE.Vector3} position - New position
   */
  reset(position) {
    // Reset position
    this.position.copy(position);
    
    // Reset orientation
    this.pitch = 0;
    this.yaw = 0;
    this.updateDirection();
  }
}

export default Camera;