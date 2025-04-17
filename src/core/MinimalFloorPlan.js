// src/core/MinimalFloorPlan.js
import * as THREE from 'three';

class MinimalFloorPlan {
  constructor(container) {
    this.container = container;
    this.svgNS = "http://www.w3.org/2000/svg";
    this.currentGeometryId = null;
    this.cameraPosition = new THREE.Vector2();
    this.viewAngle = 0;
    this.visible = true;
    
    this.createElements();
  }
  
  createElements() {
    // Create container
    this.floorPlanContainer = document.createElement('div');
    this.floorPlanContainer.style.position = 'absolute';
    this.floorPlanContainer.style.bottom = '10px';
    this.floorPlanContainer.style.left = '10px';
    this.floorPlanContainer.style.width = '150px';
    this.floorPlanContainer.style.height = '150px';
    this.floorPlanContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.floorPlanContainer.style.borderRadius = '5px';
    this.floorPlanContainer.style.zIndex = '100';
    this.floorPlanContainer.style.overflow = 'hidden';
    this.floorPlanContainer.style.border = '1px solid #666'; // Add border for visibility
    
    // Create SVG
    this.svg = document.createElementNS(this.svgNS, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.floorPlanContainer.appendChild(this.svg);
    
    // Create group for transformations
    this.svgGroup = document.createElementNS(this.svgNS, 'g');
    this.svg.appendChild(this.svgGroup);
    
    // Create polygon for the floor plan
    this.polygon = document.createElementNS(this.svgNS, 'polygon');
    this.polygon.setAttribute('fill', 'rgba(100, 175, 255, 0.3)');
    this.polygon.setAttribute('stroke', '#6af');
    this.polygon.setAttribute('stroke-width', '1');
    this.svgGroup.appendChild(this.polygon);
    
    // Create camera marker
    this.cameraMarker = document.createElementNS(this.svgNS, 'circle');
    this.cameraMarker.setAttribute('r', '4');
    this.cameraMarker.setAttribute('fill', '#ff3');
    this.svgGroup.appendChild(this.cameraMarker);
    
    // Create camera direction indicator
    this.directionIndicator = document.createElementNS(this.svgNS, 'path');
    this.directionIndicator.setAttribute('stroke', '#ff3');
    this.directionIndicator.setAttribute('stroke-width', '1');
    this.directionIndicator.setAttribute('fill', 'none');
    this.svgGroup.appendChild(this.directionIndicator);
    
    // Create toggle button
    this.toggleButton = document.createElement('button');
    this.toggleButton.style.position = 'absolute';
    this.toggleButton.style.bottom = '10px';
    this.toggleButton.style.left = '170px';
    this.toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.toggleButton.style.color = 'white';
    this.toggleButton.style.border = 'none';
    this.toggleButton.style.borderRadius = '3px';
    this.toggleButton.style.padding = '5px';
    this.toggleButton.style.cursor = 'pointer';
    this.toggleButton.style.fontSize = '12px';
    this.toggleButton.textContent = 'Hide Map';
    this.toggleButton.addEventListener('click', () => this.toggle());
    
    // Add to the container
    this.container.appendChild(this.floorPlanContainer);
    this.container.appendChild(this.toggleButton);
  }
  
  async loadGeometry(geometryId) {
    try {
      console.log(`Loading geometry: ${geometryId}`);
      
      // Corrected path to match your file structure
      const path = `../../geometries/${geometryId}.json`;
      console.log(`Fetching from: ${path}`);
      
      // Fetch JSON file
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load geometry: ${response.statusText}`);
      }
      
      const geometryData = await response.json();
      console.log(`Loaded geometry data with ${geometryData.vertices ? geometryData.vertices.length : 0} vertices`);
      
      this.updatePolygon(geometryData);
      return geometryData;
    } catch (error) {f
      console.error('Error loading floor plan geometry:', error);
      return null;
    }
  }
  
  updatePolygon(geometryData) {
    if (!geometryData || !geometryData.vertices || geometryData.vertices.length === 0) {
      console.warn('Invalid geometry data for floor plan', geometryData);
      return;
    }
    
    this.currentGeometryId = geometryData.id;
    
    // Get vertices
    const vertices = geometryData.vertices;
    console.log(`Processing ${vertices.length} vertices`);
    
    // Calculate scale factor and center for auto-centering
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const vertex of vertices) {
      minX = Math.min(minX, vertex[0]);
      minY = Math.min(minY, vertex[1]);
      maxX = Math.max(maxX, vertex[0]);
      maxY = Math.max(maxY, vertex[1]);
    }
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;
    const size = Math.max(width, height);
    
    console.log(`Bounds: [${minX}, ${minY}] to [${maxX}, ${maxY}]`);
    console.log(`Center: [${centerX}, ${centerY}], Size: ${size}`);
    
    // Calculate scale to fit in the container with some padding
    const svgRect = this.svg.getBoundingClientRect();
    this.svgWidth = svgRect.width;
    this.svgHeight = svgRect.height;
    const scale = Math.min(this.svgWidth, this.svgHeight) * 0.8 / size;
    
    console.log(`SVG dimensions: ${this.svgWidth}x${this.svgHeight}, Scale: ${scale}`);
    
    // Update polygon points
    const pointsStr = vertices.map(v => {
      // Center and scale the coordinates
      const x = (v[0] - centerX) * scale + this.svgWidth / 2;
      const y = (v[1] - centerY) * scale + this.svgHeight / 2;
      return `${x},${y}`;
    }).join(' ');
    
    console.log(`Setting polygon points: ${pointsStr.substring(0, 100)}...`);
    
    this.polygon.setAttribute('points', pointsStr);
    
    // Store for camera position updates
    this.centerX = centerX;
    this.centerY = centerY;
    this.scale = scale;
  }
  
  updateCameraPosition(position, frontVector) {
    if (!this.currentGeometryId) return;
    
    // Update camera position marker
    const x = (position.x - this.centerX) * this.scale + this.svgWidth / 2;
    const y = (position.z - this.centerY) * this.scale + this.svgHeight / 2;
    
    this.cameraMarker.setAttribute('cx', x);
    this.cameraMarker.setAttribute('cy', y);
    
    // Update direction indicator if front vector is provided
    if (frontVector) {
      this.viewAngle = Math.atan2(frontVector.z, frontVector.x);
      
      const radius = 8;
      const x2 = x + Math.cos(this.viewAngle) * radius;
      const y2 = y + Math.sin(this.viewAngle) * radius;
      
      this.directionIndicator.setAttribute('d', `M${x},${y} L${x2},${y2}`);
    }
  }
  
  resize() {
    // Reload current geometry if available
    if (this.currentGeometryId) {
      this.loadGeometry(this.currentGeometryId);
    }
  }
  
  toggle() {
    this.visible = !this.visible;
    this.floorPlanContainer.style.display = this.visible ? 'block' : 'none';
    this.toggleButton.textContent = this.visible ? 'Hide Map' : 'Show Map';
    return this.visible;
  }
  
  isVisible() {
    return this.visible;
  }
}

export default MinimalFloorPlan;