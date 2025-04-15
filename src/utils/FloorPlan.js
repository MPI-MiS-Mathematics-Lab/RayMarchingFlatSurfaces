// src/utils/FloorPlan.js
import * as THREE from 'three';

class FloorPlan {
  constructor(container) {
    this.container = container;
    this.svgNS = "http://www.w3.org/2000/svg";
    this.createElements();
    this.currentSurface = null;
    this.cameraPosition = new THREE.Vector2();
    this.mapScale = 20; // pixels per unit
    this.cameraMarkerSize = 8; // pixels
    this.viewAngle = 0; // Camera view angle in radians
    this.visible = true; // Track visibility state
    this.edgeLabels = []; // Store edge label elements
  }
  
  createElements() {
    // Create the floor plan container
    this.floorPlanContainer = document.createElement('div');
    this.floorPlanContainer.className = 'floor-plan-container';
    this.floorPlanContainer.style.position = 'absolute';
    this.floorPlanContainer.style.bottom = '10px';
    this.floorPlanContainer.style.right = '10px';
    this.floorPlanContainer.style.width = '200px';
    this.floorPlanContainer.style.height = '200px';
    this.floorPlanContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.floorPlanContainer.style.border = '1px solid #555';
    this.floorPlanContainer.style.borderRadius = '5px';
    this.floorPlanContainer.style.zIndex = '100';
    this.floorPlanContainer.style.overflow = 'hidden';
    
    // Create title
    this.title = document.createElement('div');
    this.title.style.padding = '5px';
    this.title.style.fontSize = '12px';
    this.title.style.fontWeight = 'bold';
    this.title.style.borderBottom = '1px solid #555';
    this.title.textContent = 'Floor Plan';
    this.floorPlanContainer.appendChild(this.title);
    
    // Create SVG for the floor plan
    this.svg = document.createElementNS(this.svgNS, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', 'calc(100% - 25px)');
    this.svg.style.display = 'block';
    this.floorPlanContainer.appendChild(this.svg);
    
    // Create group for transformations
    this.svgGroup = document.createElementNS(this.svgNS, 'g');
    this.svg.appendChild(this.svgGroup);
    
    // Create polygon for the surface
    this.polygon = document.createElementNS(this.svgNS, 'polygon');
    this.polygon.setAttribute('fill', 'none');
    this.polygon.setAttribute('stroke', '#6af');
    this.polygon.setAttribute('stroke-width', '2');
    this.svgGroup.appendChild(this.polygon);
    
    // Create group for edge labels
    this.edgeLabelsGroup = document.createElementNS(this.svgNS, 'g');
    this.svgGroup.appendChild(this.edgeLabelsGroup);
    
    // Create camera marker
    this.cameraMarker = document.createElementNS(this.svgNS, 'circle');
    this.cameraMarker.setAttribute('r', this.cameraMarkerSize);
    this.cameraMarker.setAttribute('fill', '#ff3');
    this.svgGroup.appendChild(this.cameraMarker);
    
    // Create camera direction indicator
    this.directionIndicator = document.createElementNS(this.svgNS, 'path');
    this.directionIndicator.setAttribute('stroke', '#ff3');
    this.directionIndicator.setAttribute('stroke-width', '2');
    this.directionIndicator.setAttribute('fill', 'none');
    this.svgGroup.appendChild(this.directionIndicator);
    
    // Add to the container
    this.container.appendChild(this.floorPlanContainer);
    
    // Set initial transformation
    this.updateTransform();
  }
  
  setSurface(surface) {
    console.log("FloorPlan: Setting new surface", surface ? surface.config?.displayName : 'undefined');
    
    if (!surface || !surface.config || !surface.config.teleportConfig || !surface.config.teleportConfig.vertices) {
      console.warn('Invalid surface for floor plan', surface);
      return;
    }
    
    this.currentSurface = surface;
    
    // Get vertices and log them for debugging
    const vertices = surface.config.teleportConfig.vertices;
    console.log(`FloorPlan: Surface has ${vertices.length} vertices`);
    
    // Update polygon points - Flipping the X coordinate by changing its sign
    const pointsStr = vertices.map(v => `${-v.x * this.mapScale},${-v.y * this.mapScale}`).join(' ');
    this.polygon.setAttribute('points', pointsStr);
    
    // Calculate bounds for auto-centering
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const vertex of vertices) {
      // Use negated X values for bounds calculation
      minX = Math.min(minX, -vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, -vertex.x);
      maxY = Math.max(maxY, vertex.y);
    }
    
    // Calculate center and size for auto-centering
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;
    const boxSize = Math.max(width, height) * 1.2; // Add 20% margin
    
    // Store for transform calculations
    this.centerX = centerX;
    this.centerY = centerY;
    this.boxSize = boxSize;
    
    // Update transform
    this.updateTransform();
    
    // Update the title to match the current surface
    this.title.textContent = `Floor Plan: ${surface.config.displayName || 'Unknown'}`;
    
    // Add edge numbers
    this.createEdgeLabels(vertices);
    
    console.log("FloorPlan: Surface updated successfully");
  }
  
  createEdgeLabels(vertices) {
    // Clear any existing edge labels
    while (this.edgeLabelsGroup.firstChild) {
      this.edgeLabelsGroup.removeChild(this.edgeLabelsGroup.firstChild);
    }
    this.edgeLabels = [];
    
    // Create a label for each edge (except the last one if it's a duplicate closing point)
    const numEdges = vertices.length - (vertices[0].equals(vertices[vertices.length - 1]) ? 1 : 0);
    
    for (let i = 0; i < numEdges; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % numEdges];
      
      // Calculate midpoint of the edge for label placement
      const midX = -(v1.x + v2.x) / 2 * this.mapScale; // Negate for flipped X
      const midY = -(v1.y + v2.y) / 2 * this.mapScale;
      
      // Create the label text element
      const label = document.createElementNS(this.svgNS, 'text');
      label.setAttribute('x', midX);
      label.setAttribute('y', midY);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('fill', '#fff');
      label.setAttribute('font-size', '10px');
      label.setAttribute('font-weight', 'bold');
      label.textContent = i.toString();
      
      // Create circle background for better visibility
      const circle = document.createElementNS(this.svgNS, 'circle');
      circle.setAttribute('cx', midX);
      circle.setAttribute('cy', midY);
      circle.setAttribute('r', '7');
      circle.setAttribute('fill', 'rgba(0, 0, 0, 0.7)');
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '1');
      
      // Add to group
      this.edgeLabelsGroup.appendChild(circle);
      this.edgeLabelsGroup.appendChild(label);
      
      // Store reference
      this.edgeLabels.push({ label, circle });
    }
  }
  
  updateTransform() {
    if (!this.centerX && this.centerX !== 0) return;
    
    const svgRect = this.svg.getBoundingClientRect();
    const svgWidth = svgRect.width;
    const svgHeight = svgRect.height;
    
    // Calculate scale to fit the box
    const scaleX = svgWidth / (this.boxSize * this.mapScale);
    const scaleY = svgHeight / (this.boxSize * this.mapScale);
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate translation to center
    const translateX = svgWidth / 2 - this.centerX * this.mapScale * scale;
    const translateY = svgHeight / 2 + this.centerY * this.mapScale * scale;
    
    // Apply transformation
    this.svgGroup.setAttribute('transform', `translate(${translateX},${translateY}) scale(${scale})`);
  }
  
  updateCameraPosition(position, frontVector) {
    if (!this.currentSurface) return;
    
    // Update camera position - flipping the X coordinate
    this.cameraPosition.x = position.x;
    this.cameraPosition.y = position.z; // Using Z as Y in 2D
    this.cameraMarker.setAttribute('cx', -this.cameraPosition.x * this.mapScale);
    this.cameraMarker.setAttribute('cy', -this.cameraPosition.y * this.mapScale);
    
    // Update view angle from front vector
    if (frontVector) {
      this.viewAngle = Math.atan2(frontVector.z, frontVector.x);
      
      // Calculate direction indicator points - with flipped X
      const radius = this.cameraMarkerSize * 2;
      const x1 = -this.cameraPosition.x * this.mapScale;
      const y1 = -this.cameraPosition.y * this.mapScale;
      // Need to adjust angle for x-flipped coordinate system
      const x2 = x1 - Math.cos(this.viewAngle) * radius;
      const y2 = y1 - Math.sin(this.viewAngle) * radius;
      
      // Update direction indicator
      this.directionIndicator.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
    }
  }
  
  resize() {
    this.updateTransform();
  }
  
  toggle() {
    this.visible = !this.visible;
    this.floorPlanContainer.style.display = this.visible ? 'block' : 'none';
    return this.visible;
  }
  
  show() {
    this.visible = true;
    this.floorPlanContainer.style.display = 'block';
  }
  
  hide() {
    this.visible = false;
    this.floorPlanContainer.style.display = 'none';
  }
  
  isVisible() {
    return this.visible;
  }
}

export default FloorPlan;