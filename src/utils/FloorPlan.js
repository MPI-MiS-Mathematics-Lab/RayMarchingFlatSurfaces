/**
 * FloorPlan utility for visualizing the current surface and camera position
 * Simplified version that only visualizes polygon and camera position without teleport logic
 */
class FloorPlan {
    constructor(container) {
      this.container = container;
      this.visible = false;
      this.scale = 40; // Pixels per unit
      
      // Create elements
      this.createElements();
      
      // Initially hide the floor plan
      this.hide();
    }
    
    /**
     * Create SVG elements for the floor plan
     */
    createElements() {
      // Create SVG container
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.style.position = 'absolute';
      this.svg.style.bottom = '10px';
      this.svg.style.right = '10px';
      this.svg.style.width = '200px';
      this.svg.style.height = '200px';
      this.svg.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      this.svg.style.border = '1px solid #555';
      this.svg.style.borderRadius = '5px';
      this.svg.style.zIndex = '50';
      
      // Create a group for all elements with a transform for proper scaling and orientation
      this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.svg.appendChild(this.group);
      
      // Create polygon element for the surface
      this.polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      this.polygon.setAttribute('fill', 'none');
      this.polygon.setAttribute('stroke', '#4CAF50');
      this.polygon.setAttribute('stroke-width', '2');
      this.group.appendChild(this.polygon);
      
      // Create camera marker
      this.cameraMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this.cameraMarker.setAttribute('r', '5');
      this.cameraMarker.setAttribute('fill', '#FF5722');
      this.group.appendChild(this.cameraMarker);
      
      // Create direction indicator
      this.directionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      this.directionLine.setAttribute('stroke', '#FFC107');
      this.directionLine.setAttribute('stroke-width', '2');
      this.group.appendChild(this.directionLine);
      
      // Add to container
      this.container.appendChild(this.svg);
      
      // Initial transform update
      this.updateTransform();
    }
    
    /**
     * Set the current surface for visualization
     * @param {Surface} surface - Current surface object
     */
    setSurface(surface) {
      if (!surface) return;
      
      // Get vertices from surface
      const vertices = surface.getVertices();
      
      // Set polygon points
      const points = vertices.map(v => {
        // Note: we flip x coordinate to match visualization expectations
        return `${-v.x * this.scale},${v.z * this.scale}`;
      }).join(' ');
      
      this.polygon.setAttribute('points', points);
      
      // Create edge labels if needed
      this.createEdgeLabels(vertices);
      
      // Update transform to center the polygon
      this.updateTransform();
    }
    
    /**
     * Create numbered labels for each edge of the polygon
     * @param {Array<THREE.Vector3>} vertices - Surface vertices
     */
    createEdgeLabels(vertices) {
      // Remove any existing labels
      const existingLabels = this.svg.querySelectorAll('.edge-label');
      existingLabels.forEach(label => label.remove());
      
      // Create a label for each edge
      for (let i = 0; i < vertices.length - 1; i++) {
        const v1 = vertices[i];
        const v2 = vertices[i + 1];
        
        // Calculate midpoint of the edge
        const midX = -(v1.x + v2.x) / 2 * this.scale;
        const midZ = (v1.z + v2.z) / 2 * this.scale;
        
        // Create text element
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', midX);
        label.setAttribute('y', midZ);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('fill', 'white');
        label.setAttribute('font-size', '10');
        label.setAttribute('class', 'edge-label');
        label.textContent = i.toString();
        
        this.group.appendChild(label);
      }
    }
    
    /**
     * Update SVG transform to center the polygon
     */
    updateTransform() {
      // Get SVG dimensions
      const width = parseInt(this.svg.style.width, 10);
      const height = parseInt(this.svg.style.height, 10);
      
      // Set transform to center the visualization
      this.group.setAttribute('transform', `translate(${width/2}, ${height/2})`);
    }
    
    /**
     * Update camera position in the floor plan
     * @param {THREE.Vector3} position - Camera position
     * @param {THREE.Vector3} frontVector - Camera direction vector
     */
    updateCameraPosition(position, frontVector) {
      if (!this.visible) return;
      
      // Update camera marker position (flip X to match visualization)
      this.cameraMarker.setAttribute('cx', -position.x * this.scale);
      this.cameraMarker.setAttribute('cy', position.z * this.scale);
      
      // Update direction line
      // Start point is the camera position
      this.directionLine.setAttribute('x1', -position.x * this.scale);
      this.directionLine.setAttribute('y1', position.z * this.scale);
      
      // End point is in the direction of frontVector (only use X and Z components)
      // Normalize and scale by a fixed amount
      const dirLength = 15; // Length of direction indicator
      
      // Project to XZ plane and normalize
      const dirNorm = Math.sqrt(frontVector.x * frontVector.x + frontVector.z * frontVector.z);
      const dirX = frontVector.x / dirNorm;
      const dirZ = frontVector.z / dirNorm;
      
      this.directionLine.setAttribute('x2', -(position.x + dirX * dirLength / this.scale) * this.scale);
      this.directionLine.setAttribute('y2', (position.z + dirZ * dirLength / this.scale) * this.scale);
    }
    
    /**
     * Handle container resizing
     */
    resize() {
      // Recalculate transform
      this.updateTransform();
    }
    
    /**
     * Toggle floor plan visibility
     */
    toggle() {
      if (this.visible) {
        this.hide();
      } else {
        this.show();
      }
    }
    
    /**
     * Show the floor plan
     */
    show() {
      this.visible = true;
      this.svg.style.display = 'block';
    }
    
    /**
     * Hide the floor plan
     */
    hide() {
      this.visible = false;
      this.svg.style.display = 'none';
    }
  }
  
  export default FloorPlan;