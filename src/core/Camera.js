// src/core/Camera.js
import * as THREE from 'three';

class Camera {
  constructor(container) {
    // Camera settings
    this.FOV = 75;
    this.NEAR = 0.1;
    this.FAR = 1000;
    
    // Height settings
    this.MIN_HEIGHT = -5;
    this.DEFAULT_HEIGHT = 0;
    this.currentHeight = this.DEFAULT_HEIGHT;
    
    // Create the camera
    this.camera = new THREE.PerspectiveCamera(
      this.FOV, 
      container.clientWidth / container.clientHeight, 
      this.NEAR, 
      this.FAR
    );
    
    // Set initial position
    this.camera.position.set(0, 0, 0);
    
    // Handle resize
    this.container = container;
  }
  
  handleResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  
  getCamera() {
    return this.camera;
  }
  
  setPosition(position) {
    this.camera.position.copy(position);
  }
  
  getPosition() {
    return this.camera.position.clone();
  }
  
  resetOrientation() {
    this.camera.quaternion.set(0, 0, 0, 1);
  }
  
  setHeight(height) {
    this.currentHeight = Math.max(this.MIN_HEIGHT, height);
  }
  
  getHeight() {
    return this.currentHeight;
  }
  
  resetHeight() {
    this.currentHeight = this.DEFAULT_HEIGHT;
    return this.currentHeight;
  }
  
  updateHeight(delta, moveUp, moveDown, speed) {
    if (moveUp) {
      this.currentHeight += speed * delta;
    }
    if (moveDown) {
      this.currentHeight -= speed * delta;;
    }
    return this.currentHeight;
  }
  
  // Get camera information for shaders
  getViewInfo() {
    // Create a view position with the current height
    const viewPosition = this.camera.position.clone();
    viewPosition.y = this.currentHeight;
    
    // Calculate camera front vector from quaternion
    const cameraFront = new THREE.Vector3(0, 0, -1);
    cameraFront.applyQuaternion(this.camera.quaternion);
    
    // Calculate camera up vector from quaternion
    const cameraUp = new THREE.Vector3(0, 1, 0);
    cameraUp.applyQuaternion(this.camera.quaternion);
    
    return {
      position: viewPosition,
      front: cameraFront,
      up: cameraUp
    };
  }
  
  reset(position) {
    this.camera.position.copy(position);
    this.camera.quaternion.set(0, 0, 0, 1);
    this.currentHeight = position.y;
  }
}

export default Camera;