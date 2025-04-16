/**
 * UI class for managing overlay information and status displays
 */
class UI {
  constructor(container) {
    this.container = container;
    this.createElements();
  }
  
  /**
   * Create UI elements
   */
  createElements() {
    // Camera info display
    this.cameraInfo = this.createOverlay({
      id: 'camera-info',
      text: 'Position: (0, 0, 0)',
      position: 'top-left',
      offset: { top: 60, left: 10 }
    });
    
    // Height info display
    this.heightInfo = this.createOverlay({
      id: 'height-info',
      text: 'Height: 0.0',
      position: 'top-left',
      offset: { top: 80, left: 10 }
    });
    
    // Teleport status display
    this.teleportStatus = this.createOverlay({
      id: 'teleport-status',
      text: 'Teleport: Inactive',
      position: 'top-left',
      offset: { top: 100, left: 10 }
    });
    
    // Resolution display
    this.resolutionDisplay = document.getElementById('resolution');
    
    // Current shader display
    this.currentShaderDisplay = document.getElementById('current-shader');
  }
  
  /**
   * Create an overlay element
   * @param {Object} options - Options for the overlay
   * @returns {HTMLElement} - Created overlay element
   */
  createOverlay(options) {
    const overlay = document.createElement('div');
    overlay.id = options.id;
    overlay.textContent = options.text;
    overlay.style.position = 'absolute';
    overlay.style.color = 'white';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.padding = '5px';
    overlay.style.borderRadius = '3px';
    overlay.style.fontSize = '12px';
    overlay.style.fontFamily = 'monospace';
    overlay.style.zIndex = '100';
    
    // Position the overlay
    if (options.position === 'top-left') {
      overlay.style.top = `${options.offset.top}px`;
      overlay.style.left = `${options.offset.left}px`;
    } else if (options.position === 'top-right') {
      overlay.style.top = `${options.offset.top}px`;
      overlay.style.right = `${options.offset.right}px`;
    } else if (options.position === 'bottom-left') {
      overlay.style.bottom = `${options.offset.bottom}px`;
      overlay.style.left = `${options.offset.left}px`;
    } else if (options.position === 'bottom-right') {
      overlay.style.bottom = `${options.offset.bottom}px`;
      overlay.style.right = `${options.offset.right}px`;
    }
    
    this.container.appendChild(overlay);
    return overlay;
  }
  
  /**
   * Update camera position info
   * @param {THREE.Vector3} position - Camera position
   */
  updateCameraInfo(position, height) {
    this.cameraInfo.textContent = `Position: (${position.x.toFixed(2)}, ${height.toFixed(2)}, ${position.z.toFixed(2)})`;
  }
  
  /**
   * Update height info
   * @param {number} height - Camera height
   */
  updateHeightInfo(height) {
    this.heightInfo.textContent = `Height: ${height.toFixed(2)}`;
  }
  
  /**
   * Update teleport status
   * @param {string} status - Teleport status
   */
  updateTeleportStatus(status) {
    let text = 'Teleport: ';
    let color = 'white';
    
    switch (status) {
      case 'ready':
        text += 'Ready';
        color = '#4CAF50'; // Green
        break;
      case 'active':
        text += 'Active';
        color = '#FF9800'; // Orange
        break;
      case 'out-of-range':
        text += 'Out of Range';
        color = '#F44336'; // Red
        break;
      case 'shader-teleport':
        text += 'Shader Handled';
        color = '#2196F3'; // Blue
        break;
      default:
        text += 'Inactive';
        color = 'white';
    }
    
    this.teleportStatus.textContent = text;
    this.teleportStatus.style.color = color;
  }
  
  /**
   * Update resolution display
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {number} pixelRatio - Device pixel ratio
   */
  updateResolution(width, height, pixelRatio) {
    if (this.resolutionDisplay) {
      const renderWidth = Math.floor(width * pixelRatio);
      const renderHeight = Math.floor(height * pixelRatio);
      this.resolutionDisplay.textContent = `${width}×${height} (${renderWidth}×${renderHeight})`;
    }
  }
  
  /**
   * Update current shader display
   * @param {string} name - Shader name
   */
  updateCurrentShader(name) {
    if (this.currentShaderDisplay) {
      this.currentShaderDisplay.textContent = name;
    }
  }
}

export default UI;