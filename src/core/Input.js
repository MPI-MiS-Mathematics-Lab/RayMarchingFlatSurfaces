// src/core/Input.js
import * as THREE from 'three';

class Input {
  constructor(domElement, camera) {
    this.domElement = domElement;
    this.camera = camera;
    
    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.shiftPressed = false;
    this.rotationQuaternion = new THREE.Quaternion();
    this.isPointerLocked = false;
    
    // Movement settings
    this.movementSpeed = 3.0;
    this.verticalSpeed = 1.5;
    this.rotationSpeed = 0.002;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Mouse movement handler
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Pointer lock handlers
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.domElement.requestPointerLock();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });
    
    // Keyboard controls
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }
  
  onMouseMove(event) {
    if (!this.isPointerLocked) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    // Apply yaw rotation (around global Y axis)
    if (movementX !== 0) {
      this.rotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -movementX * this.rotationSpeed);
      this.camera.quaternion.premultiply(this.rotationQuaternion);
    }
    
    // Apply pitch rotation (around local X axis)
    if (movementY !== 0) {
      // Get the camera's right vector (local X axis)
      const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      this.rotationQuaternion.setFromAxisAngle(rightVector, -movementY * this.rotationSpeed);
      this.camera.quaternion.premultiply(this.rotationQuaternion);
    }
    
    // Normalize the quaternion to prevent drift
    this.camera.quaternion.normalize();
  }
  
  onKeyDown(event) {
    if (!this.isPointerLocked) return;
    
    switch (event.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'KeyE': this.moveUp = true; break;
      case 'KeyQ': this.moveDown = true; break;
      case 'ShiftLeft': 
      case 'ShiftRight': 
        this.shiftPressed = true; 
        break;
    }
  }
  
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'KeyE': this.moveUp = false; break;
      case 'KeyQ': this.moveDown = false; break;
      case 'ShiftLeft': 
      case 'ShiftRight': 
        this.shiftPressed = false; 
        break;
    }
  }
  
  update(delta) {
    if (!this.isPointerLocked) return false;
    
    // Handle horizontal movement (WASD)
    if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
      // Create input vector based on which keys are pressed
      const inputDir = new THREE.Vector3(
        (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0),
        0,
        (this.moveBackward ? 1 : 0) - (this.moveForward ? 1 : 0)
      );
      
      // Only proceed if there's input
      if (inputDir.lengthSq() > 0) {
        // Normalize to prevent faster diagonal movement
        inputDir.normalize();
        
        // Get the camera's forward and right vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        
        // Project these vectors onto the horizontal plane
        forward.y = 0;
        right.y = 0;
        
        // Normalize them (critical to maintain consistent speed)
        if (forward.lengthSq() > 0.001) forward.normalize();
        if (right.lengthSq() > 0.001) right.normalize();
        
        // Calculate movement vector based on input and camera orientation
        const moveVector = new THREE.Vector3(0, 0, 0);
        moveVector.addScaledVector(forward, -inputDir.z); // Forward/backward
        moveVector.addScaledVector(right, inputDir.x); // Left/right
        
        // Apply speed and time factors
        const speed = this.shiftPressed ? this.movementSpeed * 2 : this.movementSpeed;
        moveVector.multiplyScalar(speed * delta);
        
        // Apply movement to camera position
        this.camera.position.add(moveVector);
        
        return true;
      }
    }
    
    return false;
  }
  
  getVerticalMovement() {
    return {
      moveUp: this.moveUp,
      moveDown: this.moveDown
    };
  }
  
  isLocked() {
    return this.isPointerLocked;
  }
}

export default Input;