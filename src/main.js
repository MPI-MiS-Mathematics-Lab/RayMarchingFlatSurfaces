// src/main.js
import Engine from './core/Engine.js';
import Camera from './core/Camera.js';
import Input from './core/Input.js';
import SimpleFloorPlan from './utils/FloorPlan.js';
import Teleport from './utils/Teleport.js';
import Stats from 'three/addons/libs/stats.module.js';
import * as THREE from 'three';

// // Function to load available geometries from manifest
// async function loadGeometryManifest() {
//   try {
//     const response = await fetch('/geometries/manifest.json');
//     if (!response.ok) {
//       throw new Error(`Failed to load geometry manifest: ${response.statusText}`);
//     }
//     return await response.json();
//   } catch (error) {
//     console.error("Failed to load geometry manifest:", error);
//     // Return a minimal fallback if the manifest can't be loaded
//     return {
//       geometries: [
//         { id: "square", name: "Square Room", description: "Default geometry" }
//       ]
//     };
//   }
// }

async function loadGeometryManifest() {
  try {
    const basePath = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${basePath}geometries/manifest.json`);
    if (!response.ok) {
      throw new Error(`Failed to load geometry manifest: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to load geometry manifest:", error);
    // Return a minimal fallback if the manifest can't be loaded
    return {
      geometries: [
        { id: "square", name: "Square Room", description: "Default geometry" }
      ]
    };
  }
}

// Load external demos manifest
async function loadExternalManifest() {
  try {
    const basePath = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${basePath}externals/manifest.json`);
    if (!response.ok) {
      // If not found, treat as empty list
      return { externals: [] };
    }
    return await response.json();
  } catch (error) {
    console.warn('Failed to load externals manifest:', error);
    return { externals: [] };
  }
}

// Function to populate the geometry dropdown (fallback)
function populateGeometryDropdown(manifest, geometrySelect, currentGeometryId) {
  if (!geometrySelect) return;

  geometrySelect.innerHTML = '';
  manifest.geometries.forEach(geometry => {
    const option = document.createElement('option');
    option.value = geometry.id;
    option.textContent = geometry.name;
    option.dataset.description = geometry.description || '';
    geometrySelect.appendChild(option);
  });
  geometrySelect.value = currentGeometryId;
  updateGeometryDescriptionFromData({ description: manifest.geometries.find(g => g.id === currentGeometryId)?.description || '' });
}

// Function to update geometry description
function updateGeometryDescriptionFromData({ description, name }) {
  const descriptionElement = document.getElementById('geometry-description');
  if (descriptionElement) {
    descriptionElement.textContent = description || name || '';
  }
}

// Render swipeable gallery of geometries
function renderGeometryGallery(manifest, currentGeometryId, onSelect, options = {}) {
  const { clear = true } = options;
  const gallery = document.getElementById('geometry-gallery');
  if (!gallery) return;

  if (clear) gallery.innerHTML = '';

  manifest.geometries.forEach(geometry => {
    const card = document.createElement('button');
    card.className = 'gallery-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-geometry-id', geometry.id);
    // Thumbnail container + image
    const thumb = document.createElement('div');
    thumb.className = 'gallery-thumb';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = geometry.name || geometry.id;
    const basePath = import.meta.env.BASE_URL || '/';
    const listed = geometry.thumbnail ? [geometry.thumbnail] : [];
    const candidates = [
      ...listed,
      `${basePath}thumbnails/${geometry.id}.jpg`,
      `${basePath}thumbnails/${geometry.id}.png`,
      `${basePath}thumbnails/${geometry.id}.webp`,
      `${basePath}thumbnails/${geometry.id}.svg`,
      `${basePath}thumbnails/placeholder.svg`,
      `${basePath}thumbnails/placeholder.jpg`,
      `${basePath}thumbnails/placeholder.png`
    ];
    let ci = 0;
    img.src = candidates[ci];
    img.onerror = () => {
      ci += 1;
      if (ci < candidates.length) {
        img.src = candidates[ci];
      } else {
        img.onerror = null;
        img.remove();
      }
    };
    thumb.appendChild(img);

    const title = document.createElement('div');
    title.className = 'gallery-title';
    title.textContent = geometry.name;
    const desc = document.createElement('div');
    desc.className = 'gallery-desc';
    desc.textContent = geometry.description || '';

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(desc);

    if (geometry.id === currentGeometryId) card.classList.add('active');

    card.addEventListener('click', () => onSelect(geometry.id));
    gallery.appendChild(card);
  });

  // Simple drag-to-scroll for desktop
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  const onPointerDown = (e) => {
    isDown = true;
    gallery.classList.add('dragging');
    startX = (e.pageX || e.touches?.[0]?.pageX || 0) - gallery.offsetLeft;
    scrollLeft = gallery.scrollLeft;
  };
  const onPointerMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = (e.pageX || e.touches?.[0]?.pageX || 0) - gallery.offsetLeft;
    const walk = (x - startX) * 1; // scroll-fastness
    gallery.scrollLeft = scrollLeft - walk;
  };
  const onPointerUp = () => { isDown = false; gallery.classList.remove('dragging'); };

  gallery.addEventListener('mousedown', onPointerDown);
  gallery.addEventListener('mousemove', onPointerMove);
  gallery.addEventListener('mouseleave', onPointerUp);
  gallery.addEventListener('mouseup', onPointerUp);
  gallery.addEventListener('touchstart', onPointerDown, { passive: true });
  gallery.addEventListener('touchmove', onPointerMove, { passive: false });
  gallery.addEventListener('touchend', onPointerUp);

  // Nav buttons
  const leftBtn = document.querySelector('.gallery-nav.left');
  const rightBtn = document.querySelector('.gallery-nav.right');
  const scrollByAmount = () => Math.max(200, Math.floor(gallery.clientWidth * 0.8));
  if (leftBtn) leftBtn.onclick = () => gallery.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' });
  if (rightBtn) rightBtn.onclick = () => gallery.scrollBy({ left: scrollByAmount(), behavior: 'smooth' });
}

// Append external demo cards to the gallery
function appendExternalCards(externals, onSelectExternal) {
  const gallery = document.getElementById('geometry-gallery');
  if (!gallery || !externals || externals.length === 0) return;

  // Simple label card to separate sections
  const label = document.createElement('div');
  label.className = 'gallery-card';
  label.style.cursor = 'default';
  label.style.background = '#2f2f2f';
  label.style.borderStyle = 'dashed';
  label.innerHTML = '<div class="gallery-title">Standalone Demos</div><div class="gallery-desc">These render inside this window via iframe and use ray tracing.</div>';
  gallery.appendChild(label);

  // Add one card per external entry
  externals.forEach(item => {
    const card = document.createElement('button');
    card.className = 'gallery-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-external-url', item.path);

    // Thumb
    const thumb = document.createElement('div');
    thumb.className = 'gallery-thumb';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = item.name || item.id || 'Standalone Demo';
    const basePath = import.meta.env.BASE_URL || '/';
    const listed = item.thumbnail ? [item.thumbnail] : [];
    const candidates = [
      ...listed,
      `${basePath}thumbnails/${(item.id||'external')}.jpg`,
      `${basePath}thumbnails/${(item.id||'external')}.png`,
      `${basePath}thumbnails/${(item.id||'external')}.webp`,
      `${basePath}thumbnails/${(item.id||'external')}.svg`,
      `${basePath}thumbnails/placeholder.svg`,
      `${basePath}thumbnails/placeholder.jpg`,
      `${basePath}thumbnails/placeholder.png`
    ];
    let ci = 0;
    img.src = candidates[ci];
    img.onerror = () => {
      ci += 1;
      if (ci < candidates.length) img.src = candidates[ci];
      else { img.onerror = null; img.remove(); }
    };
    thumb.appendChild(img);

    const title = document.createElement('div');
    title.className = 'gallery-title';
    title.textContent = item.name || item.id || 'Standalone Demo';
    const desc = document.createElement('div');
    desc.className = 'gallery-desc';
    desc.textContent = item.description || '';

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(desc);
    card.addEventListener('click', () => onSelectExternal(item));
    gallery.appendChild(card);
  });
}

function showExternalDemo(item) {
  const basePath = import.meta.env.BASE_URL || '/';
  const container = document.getElementById('external-container');
  const frame = document.getElementById('external-frame');
  const closeBtn = document.getElementById('external-close');
  if (!container || !frame || !closeBtn) return;

  // Resolve path relative to base
  frame.src = item.path.startsWith('http') ? item.path : `${basePath}${item.path}`;
  container.classList.add('active');
  container.setAttribute('aria-hidden', 'false');

  // Update description and highlight active card
  updateGeometryDescriptionFromData(item);
  const galleryEl = document.getElementById('geometry-gallery');
  if (galleryEl) {
    [...galleryEl.querySelectorAll('.gallery-card')].forEach(el => el.classList.remove('active'));
    const current = galleryEl.querySelector(`.gallery-card[data-external-url="${item.path}"]`);
    if (current) current.classList.add('active');
  }

  // Close handler
  const onClose = () => {
    container.classList.remove('active');
    container.setAttribute('aria-hidden', 'true');
    frame.src = 'about:blank';
    closeBtn.removeEventListener('click', onClose);
  };
  closeBtn.addEventListener('click', onClose);
}

function hideExternalDemo() {
  const container = document.getElementById('external-container');
  const frame = document.getElementById('external-frame');
  const closeBtn = document.getElementById('external-close');
  if (!container || !frame || !closeBtn) return;
  if (!container.classList.contains('active')) return;
  container.classList.remove('active');
  container.setAttribute('aria-hidden', 'true');
  frame.src = 'about:blank';
}

document.addEventListener('DOMContentLoaded', async () => {
  // Get the container element
  const container = document.querySelector('.canvas-container');
  if (!container) {
    console.error("Container element not found");
    return;
  }
  
  // Initialize the engine
  const engine = new Engine(container);
  
  // Initialize the camera
  const camera = new Camera(container);
  
  // Initialize the input controller
  const input = new Input(engine.getDomElement(), camera.getCamera());
  
  // Initialize the floor plan
  const floorPlan = new SimpleFloorPlan(container);
  
  // Initialize the teleport handler
  const teleport = new Teleport();
  
  // Load the initial geometry for the floor plan
  floorPlan.loadGeometry(engine.getCurrentGeometryId());
  
  // Load geometry manifest and render gallery (with select as fallback)
  try {
    const manifest = await loadGeometryManifest();
    const externalManifest = await loadExternalManifest();

    const geometrySelect = document.getElementById('geometry-select');
    const galleryEl = document.getElementById('geometry-gallery');

    // Helper to select geometry from UI
    const handleSelect = async (geometryId) => {
      // Ensure external iframe overlay is closed when picking a geometry
      hideExternalDemo();
      try {
        const { initialPosition, description, name } = await engine.loadGeometry(geometryId);
        floorPlan.loadGeometry(geometryId);
        teleport.setGeometry(await engine.shaderGenerator.loadGeometryFile(geometryId));
        if (initialPosition) {
          const pos = new THREE.Vector3(initialPosition[0], initialPosition[1], initialPosition[2]);
          camera.reset(pos);
        }
        updateGeometryDescriptionFromData({ description, name });

        // Sync UI state
        if (geometrySelect) geometrySelect.value = geometryId;
        if (galleryEl) {
          [...galleryEl.querySelectorAll('.gallery-card')].forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-geometry-id') === geometryId);
          });
        }
      } catch (error) {
        console.error(`Failed to load geometry: ${error.message}`);
      }
    };

    if (galleryEl) {
      // Start fresh, then add externals first, then geometries
      galleryEl.innerHTML = '';
      if (externalManifest.externals?.length) {
        appendExternalCards(externalManifest.externals, showExternalDemo);
      }
      // Insert a small label for the built-in scenes
      const label = document.createElement('div');
      label.className = 'gallery-card';
      label.style.cursor = 'default';
      label.style.background = '#2f2f2f';
      label.style.borderStyle = 'dashed';
      label.innerHTML = '<div class="gallery-title">Ray‑Marching Scenes</div><div class="gallery-desc">Built-in examples rendered by this engine.</div>';
      galleryEl.appendChild(label);
      renderGeometryGallery(manifest, engine.getCurrentGeometryId(), handleSelect, { clear: false });
      // Initialize description for current selection
      const currentMeta = manifest.geometries.find(g => g.id === engine.getCurrentGeometryId());
      if (currentMeta) updateGeometryDescriptionFromData(currentMeta);
    }

    if (geometrySelect) {
      populateGeometryDropdown(manifest, geometrySelect, engine.getCurrentGeometryId());
      geometrySelect.addEventListener('change', (e) => handleSelect(e.target.value));
    }
  } catch (error) {
    console.error('Failed to initialize geometry gallery:', error);
  }
  
  // Create stats panel
  const stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = '10px';
  stats.dom.style.right = '10px';
  stats.dom.style.left = 'auto';
  container.appendChild(stats.dom);
  
  // Create position display
  const positionDisplay = document.createElement('div');
  positionDisplay.id = 'position-display';
  positionDisplay.style.position = 'absolute';
  positionDisplay.style.bottom = '10px';
  positionDisplay.style.right = '10px';
  positionDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  positionDisplay.style.color = 'white';
  positionDisplay.style.padding = '5px';
  positionDisplay.style.borderRadius = '4px';
  positionDisplay.style.fontFamily = 'monospace';
  positionDisplay.style.fontSize = '12px';
  container.appendChild(positionDisplay);

  // Handle the teleport toggle
  const teleportToggle = document.getElementById('teleport-toggle');
  if (teleportToggle) {
    // Always initialize teleport to OFF (false), regardless of toggle state
    teleportToggle.checked = false;
    teleport.setEnabled(false);
    
    // Update teleport status indicator
    const updateTeleportStatus = (enabled) => {
      const statusElement = document.getElementById('teleport-status');
      if (statusElement) {
        statusElement.textContent = `Teleport: ${enabled ? 'ON' : 'OFF'}`;
        statusElement.style.color = enabled ? '#5a8' : '#e55';
      }
    };
    
    // Initialize status to OFF
    updateTeleportStatus(false);
    
    // Add event listener for toggle changes
    teleportToggle.addEventListener('change', (event) => {
      const isEnabled = event.target.checked;
      teleport.setEnabled(isEnabled);
      
      // Update status text in the UI
      const toggleLabel = teleportToggle.parentElement.nextElementSibling;
      if (toggleLabel) {
        toggleLabel.textContent = isEnabled ? 'Enable Teleportation' : 'Disable Teleportation';
      }
      
      // Update the status indicator
      updateTeleportStatus(isEnabled);
    });
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    updateResolutionDisplay(container);
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    engine.resize(width, height);
    camera.handleResize(width, height);
    floorPlan.resize(); // Resize floor plan
  });
  
  // Update resolution information when container is resized
  const resizeObserver = new ResizeObserver(() => {
    updateResolutionDisplay(container);
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    engine.resize(width, height);
    camera.handleResize(width, height);
    floorPlan.resize(); // Resize floor plan
  });
  
  resizeObserver.observe(container);

  // Allow closing external overlay with Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideExternalDemo();
  });
  
  // Setup fullscreen button
  const fullscreenBtn = document.getElementById('fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    });
  }
  
  // Setup reset size button
  const resetSizeBtn = document.getElementById('reset-size');
  if (resetSizeBtn) {
    resetSizeBtn.addEventListener('click', () => {
      container.style.width = '800px';
      container.style.height = '600px';
      updateResolutionDisplay(container);
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      engine.resize(width, height);
      camera.handleResize(width, height);
      floorPlan.resize(); // Resize floor plan
    });
  }
  
  // Initial geometry loading for teleport
  try {
    const currentGeometryId = engine.getCurrentGeometryId();
    teleport.setGeometry(await engine.shaderGenerator.loadGeometryFile(currentGeometryId));
  } catch (error) {
    console.error(`Failed to load initial geometry for teleport: ${error.message}`);
  }
  
  // Animation loop update function
  const update = (delta) => {
    // Begin stats measurement
    stats.begin();
    
    // Update camera height based on input
    const verticalMovement = input.getVerticalMovement();
    camera.updateHeight(
      delta,
      verticalMovement.moveUp,
      verticalMovement.moveDown,
      input.verticalSpeed
    );
    
    // Get previous position
    const prevPosition = camera.getPosition().clone();
    
    // Update camera position based on input
    input.update(delta);
    
    // Get updated camera view info for ray marching
    const viewInfo = camera.getViewInfo();
    
    // Check for teleportation
    const didTeleport = teleport.checkAndTeleport(
      viewInfo.position, 
      viewInfo.front, 
      camera
    );
    
    // If teleported, get updated view info
    if (didTeleport) {
      const updatedInfo = camera.getViewInfo();
      viewInfo.position.copy(updatedInfo.position);
      viewInfo.front.copy(updatedInfo.front);
      viewInfo.up.copy(updatedInfo.up);
    }
    
    // Update uniforms with camera data
    engine.uniforms.rayMarchCamPos.value.copy(viewInfo.position);
    engine.uniforms.rayMarchCamFront.value.copy(viewInfo.front);
    engine.uniforms.rayMarchCamUp.value.copy(viewInfo.up);
    
    // Ensure we always update the floor plan with the latest camera position and front vector
    floorPlan.updateCameraPosition(viewInfo.position, viewInfo.front);
    
    // Update position display
    const pos = viewInfo.position;
    positionDisplay.textContent = `X: ${pos.x.toFixed(2)} Y: ${pos.y.toFixed(2)} Z: ${pos.z.toFixed(2)}`;
    
    // End stats measurement
    stats.end();
  };
  
  // Start the animation loop
  engine.animate(update);
  
  // Initial resolution display update
  updateResolutionDisplay(container);
});

// Helper function to update resolution display
function updateResolutionDisplay(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const pixelRatio = window.devicePixelRatio;
  
  const resolutionElement = document.getElementById('resolution');
  const actualResolutionElement = document.getElementById('actual-resolution');
  const pixelRatioElement = document.getElementById('pixel-ratio');
  
  if (resolutionElement) {
    resolutionElement.textContent = `${width}×${height}`;
  }
  
  if (actualResolutionElement) {
    actualResolutionElement.textContent = `${Math.round(width * pixelRatio)}×${Math.round(height * pixelRatio)}`;
  }
  
  if (pixelRatioElement) {
    pixelRatioElement.textContent = pixelRatio.toFixed(2);
  }
}
