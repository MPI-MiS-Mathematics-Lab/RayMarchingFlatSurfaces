// src/utils/UI.js
class UI {
  constructor(container) {
    this.container = container;
    this.createElements();
  }
  
  createElements() {
    // Create the info overlay
    this.infoOverlay = document.querySelector('.info');
    if (!this.infoOverlay) {
      this.infoOverlay = this.createOverlay({
        className: 'info',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '10px',
        borderRadius: '5px',
        zIndex: '100'
      });
      
      this.infoOverlay.innerHTML = `
        WASD - Move<br>
        Mouse - Look<br>
        E/Q - Up/Down<br>
        M - Toggle Floor Plan<br>
        Click on canvas to lock cursor
      `;
      
      this.container.appendChild(this.infoOverlay);
    }
    
    // Create camera info overlay
    this.cameraInfo = this.createOverlay({
      className: 'camera-info',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '10px',
      borderRadius: '5px',
      zIndex: '100',
      fontSize: '12px',
      textAlign: 'right'
    });
    
    // Create teleport status overlay
    this.teleportStatus = this.createOverlay({
      className: 'teleport-status',
      bottom: '10px',
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '5px 10px',
      borderRadius: '5px',
      zIndex: '100',
      fontSize: '12px'
    });
    
    // Create current shader overlay
    this.currentShaderInfo = this.createOverlay({
      className: 'current-shader-info',
      bottom: '50px',
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '5px 10px',
      borderRadius: '5px',
      zIndex: '100',
      fontSize: '12px'
    });
  }
  
  createOverlay(options) {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute',
      ...options
    });
    
    if (options.className) {
      overlay.className = options.className;
    }
    
    this.container.appendChild(overlay);
    return overlay;
  }
  
  updateCameraInfo(position, height) {
    if (!this.cameraInfo) return;
    
    // Format position to 2 decimal places
    const x = position.x.toFixed(2);
    const z = position.z.toFixed(2);
    const y = height.toFixed(2);
    
    this.cameraInfo.innerHTML = `
      Position: (${x}, ${y}, ${z})<br>
      Height: ${y}
    `;
  }
  
  updateHeightInfo(height) {
    // This is already handled in updateCameraInfo
  }
  
  updateTeleportStatus(status) {
    if (!this.teleportStatus) return;
    
    let text = '';
    let color = '';
    
    switch (status) {
      case 'ready':
        text = 'Teleport: Ready';
        color = '#6bf';
        break;
      case 'active':
        text = 'Teleport: Active';
        color = '#6f6';
        break;
      case 'out-of-range':
        text = 'Teleport: Out of Range';
        color = '#f66';
        break;
      case 'shader-teleport':
        text = 'Teleport: Handled by Shader';
        color = '#f96';
        break;
      default:
        text = 'Teleport: Unknown';
        color = '#999';
    }
    
    this.teleportStatus.textContent = text;
    this.teleportStatus.style.color = color;
  }
  
  updateResolution(width, height, pixelRatio) {
    const resolutionElement = document.getElementById('resolution');
    if (resolutionElement) {
      const effectiveWidth = Math.round(width * pixelRatio);
      const effectiveHeight = Math.round(height * pixelRatio);
      resolutionElement.textContent = `${width}×${height} (${effectiveWidth}×${effectiveHeight} with ${pixelRatio}x DPR)`;
    }
  }
  
  updateCurrentShader(name) {
    if (this.currentShaderInfo) {
      this.currentShaderInfo.textContent = `Surface: ${name || 'Unknown'}`;
    }
  }
}

export default UI;