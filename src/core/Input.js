import * as THREE from 'three';

/**
 * Input handler for camera movement
 */
class Input {
  /**
   * Create an input handler
   * @param {HTMLElement} domElement - DOM element for events
   * @param {Camera} camera - Camera object to control
   */
  constructor(domElement, camera) {
    this.domElement = domElement;
    this.camera = camera;
    
    // Movement keys
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false
    };
    
    // Mouse state
    this.mouse = {
      x: 0,
      y: 0,
      locked: false
    };
    
    // Movement speeds
    this.movementSpeed = 2.0; // Units per second
    this.verticalSpeed = 1.0; // Units per second
    this.rotationSpeed = 2.0; // Radians per pixel
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('Input handler initialized');
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Mouse events
    this.domElement.addEventListener('click', () => {
      if (!this.mouse.locked) {
        this.domElement.requestPointerLock();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.mouse.locked = document.pointerLockElement === this.domElement;
    });
    
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }
  
  /**
   * Handle mouse movement
   * @param {MouseEvent} event - Mouse movement event
   */
  onMouseMove(event) {
    if (!this.mouse.locked) return;
    
    // Make sure the camera object is valid
    if (!this.camera) return;
    
    // Get movement deltas with sensitivity applied
    const sensitivity = 0.002;
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    const deltaX = movementX * sensitivity;
    const deltaY = movementY * sensitivity;
    
    // Make sure the camera has rotation methods
    if (typeof this.camera.rotateY === 'function' && typeof this.camera.rotateX === 'function') {
      // Apply rotation to camera
      this.camera.rotateY(-deltaX);
      this.camera.rotateX(-deltaY);
    } else {
      console.warn('Camera does not have rotation methods');
    }
  }
  
  /**
   * Handle key down event
   * @param {KeyboardEvent} event - Key down event
   */
  onKeyDown(event) {
    this.setKey(event.code, true);
  }
  
  /**
   * Handle key up event
   * @param {KeyboardEvent} event - Key up event
   */
  onKeyUp(event) {
    this.setKey(event.code, false);
  }
  
  /**
   * Set key state
   * @param {string} code - Key code
   * @param {boolean} pressed - Is the key pressed
   */
  setKey(code, pressed) {
    switch (code) {
      case 'KeyW':
        this.keys.forward = pressed;
        break;
      case 'KeyS':
        this.keys.backward = pressed;
        break;
      case 'KeyA':
        this.keys.left = pressed;
        break;
      case 'KeyD':
        this.keys.right = pressed;
        break;
      case 'KeyE':
        this.keys.up = pressed;
        break;
      case 'KeyQ':
        this.keys.down = pressed;
        break;
    }
  }
  
  /**
   * Update camera position based on input
   * @param {number} delta - Time since last update in seconds
   * @returns {boolean} - True if position was updated
   */
  update(delta) {
    if (!this.camera) return false;
    
    let moved = false;
    
    // Make sure camera has necessary methods
    if (typeof this.camera.moveForward !== 'function' || 
        typeof this.camera.moveRight !== 'function') {
      console.warn('Camera does not have movement methods');
      return false;
    }
    
    // Calculate move distance based on speed and delta time
    const moveDistance = this.movementSpeed * delta;
    
    // Apply movement
    if (this.keys.forward) {
      this.camera.moveForward(moveDistance);
      moved = true;
    }
    if (this.keys.backward) {
      this.camera.moveForward(-moveDistance);
      moved = true;
    }
    if (this.keys.left) {
      this.camera.moveRight(-moveDistance);
      moved = true;
    }
    if (this.keys.right) {
      this.camera.moveRight(moveDistance);
      moved = true;
    }
    
    return moved;
  }
  
  /**
   * Get vertical movement state
   * @returns {Object} - Object with moveUp and moveDown booleans
   */
  getVerticalMovement() {
    return {
      moveUp: this.keys.up,
      moveDown: this.keys.down
    };
  }
}

export default Input;