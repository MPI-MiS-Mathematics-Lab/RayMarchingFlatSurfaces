/**
 * Simple inline stats display for FPS and render time
 */
class InlineStats {
    constructor() {
      this.container = null;
      this.statsElement = null;
      this.frames = 0;
      this.lastTime = performance.now();
      this.fpsUpdateInterval = 1000; // Update every second
      this.visible = true;
      this.fps = 0;
      this.frameTime = 0;
      
      this.createStatsElement();
    }
    
    /**
     * Create the stats DOM element
     */
    createStatsElement() {
      this.statsElement = document.createElement('div');
      this.statsElement.style.position = 'absolute';
      this.statsElement.style.top = '10px';
      this.statsElement.style.right = '10px';
      this.statsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      this.statsElement.style.color = '#0f0';
      this.statsElement.style.padding = '5px';
      this.statsElement.style.borderRadius = '3px';
      this.statsElement.style.fontFamily = 'monospace';
      this.statsElement.style.fontSize = '12px';
      this.statsElement.style.zIndex = '1000';
      this.statsElement.style.userSelect = 'none';
      this.statsElement.style.pointerEvents = 'none';
      this.statsElement.textContent = 'FPS: 0 | Frame Time: 0.0 ms';
    }
    
    /**
     * Attach the stats element to a container
     * @param {HTMLElement} container - Container to attach to
     */
    attachTo(container) {
      if (this.container) {
        this.container.removeChild(this.statsElement);
      }
      
      this.container = container;
      this.container.appendChild(this.statsElement);
    }
    
    /**
     * Update stats on each frame
     */
    update() {
      this.frames++;
      
      const currentTime = performance.now();
      const elapsed = currentTime - this.lastTime;
      
      // Update frame time immediately
      this.frameTime = elapsed;
      
      // Update FPS counter every second
      if (elapsed >= this.fpsUpdateInterval) {
        this.fps = Math.round((this.frames * 1000) / elapsed);
        this.frames = 0;
        this.lastTime = currentTime;
        
        // Update display if visible
        if (this.visible) {
          this.statsElement.textContent = `FPS: ${this.fps} | Frame Time: ${this.frameTime.toFixed(1)} ms`;
        }
      }
    }
    
    /**
     * Toggle stats visibility
     */
    toggle() {
      this.visible = !this.visible;
      this.statsElement.style.display = this.visible ? 'block' : 'none';
    }
    
    /**
     * Show the stats
     */
    show() {
      this.visible = true;
      this.statsElement.style.display = 'block';
    }
    
    /**
     * Hide the stats
     */
    hide() {
      this.visible = false;
      this.statsElement.style.display = 'none';
    }
  }
  
  export default InlineStats;