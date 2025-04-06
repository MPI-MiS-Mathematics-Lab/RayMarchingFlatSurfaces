import * as THREE from 'three';

// Check for WebGL support first
if (!window.WebGLRenderingContext) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = 'Your browser does not support WebGL';
}

// Initialize scene with error handling
try {
    // Get the canvas container
    const canvasContainer = document.querySelector('.canvas-container');
    
    // Scene setup - we'll have two scenes
    // 1. The static scene for the quad with the shader
    const staticScene = new THREE.Scene();
    
    // Renderer with WebGL2 if available
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    
    // Set the clear color (will be visible around the quad)
    renderer.setClearColor(0x333333);
    
    // Set initial size to match container and append canvas to container
    const initialWidth = canvasContainer.clientWidth;
    const initialHeight = canvasContainer.clientHeight;
    renderer.setSize(initialWidth, initialHeight);
    canvasContainer.appendChild(renderer.domElement);
    
    // Set up two cameras:
    // 1. Static orthographic camera for rendering the quad with shader (never moves)
    // 2. Dynamic perspective camera for user movement and ray marching view
    
    // Static camera - orthographic camera that never moves
    const staticCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    staticCamera.position.z = 1;
    
    // Dynamic camera - this is the one we'll move around with controls
    const dynamicCamera = new THREE.PerspectiveCamera(75, initialWidth / initialHeight, 0.1, 1000);
    const FOV = 75; // Store FOV value to match in shader
    dynamicCamera.position.set(0, 1, 0); // Starting position inside the maze
    
    // Camera controls variables for the dynamic camera
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let moveUp = false;
    let moveDown = false;
    let velocity = new THREE.Vector3();
    let prevTime = performance.now();
    let isPointerLocked = false;
    
    // Movement speed and rotation variables
    const movementSpeed = 3.0;
    const rotationSpeed = 0.002;
    const rotationQuaternion = new THREE.Quaternion();

    // Constants for the maze dimensions
    const b = 2.0;
    const wall_height = 2.0;
    const eps = 0.001;
    
    // Set up pointer lock controls
    const onMouseMove = (event) => {
        if (!isPointerLocked) return;
        
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        // Apply yaw rotation (around global Y axis)
        if (movementX !== 0) {
            rotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -movementX * rotationSpeed);
            dynamicCamera.quaternion.premultiply(rotationQuaternion);
        }
        
        // Apply pitch rotation (around local X axis)
        if (movementY !== 0) {
            // Get the camera's right vector (local X axis)
            const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(dynamicCamera.quaternion);
            rotationQuaternion.setFromAxisAngle(rightVector, -movementY * rotationSpeed);
            dynamicCamera.quaternion.premultiply(rotationQuaternion);
        }
        
        // Normalize the quaternion to prevent drift
        dynamicCamera.quaternion.normalize();
    };
    
    document.addEventListener('mousemove', onMouseMove);
    
    // Handle click to lock pointer - only when clicking on the canvas
    renderer.domElement.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    // Handle pointer lock state changes
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    // Keyboard controls - only active when pointer is locked
    document.addEventListener('keydown', (event) => {
        if (!isPointerLocked) return;
        
        switch (event.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyD': moveRight = true; break;
            case 'Space': moveUp = true; break;
            case 'ShiftLeft': moveDown = true; break;
        }
    });
    
    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyD': moveRight = false; break;
            case 'Space': moveUp = false; break;
            case 'ShiftLeft': moveDown = false; break;
        }
    });
    
    // Create a ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            const width = entry.contentRect.width;
            const height = entry.contentRect.height;
            
            // Update camera aspect ratio
            dynamicCamera.aspect = width / height;
            dynamicCamera.updateProjectionMatrix();
            
            // Resize renderer
            renderer.setSize(width, height);
            
            // Update shader resolution uniform
            uniforms.iResolution.value.set(width, height);
        }
    });
    
    // Start observing the container for resize events
    resizeObserver.observe(canvasContainer);
    
    // Set up a full-screen quad for ray marching
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // Create shader uniforms
    const uniforms = {
        iTime: { value: 0.0 },
        iResolution: { value: new THREE.Vector2(initialWidth, initialHeight) },
        rayMarchCamPos: { value: new THREE.Vector3() },
        rayMarchCamFront: { value: new THREE.Vector3() },
        rayMarchCamUp: { value: new THREE.Vector3(0, 1, 0) }
    };
    
    // Simple vertex shader that won't change
    const vertexShaderSource = `
    void main() {
        gl_Position = vec4(position, 1.0);
    }
    `;
    
    // Load only the fragment shader from external file
    async function loadFragmentShader() {
        try {
            // Load fragment shader from shader/L.frag
            const fragmentResponse = await fetch('shader/L.frag');
            if (!fragmentResponse.ok) {
                throw new Error(`Failed to load fragment shader: ${fragmentResponse.statusText}`);
            }
            const fragmentShaderSource = await fragmentResponse.text();
            
            // Create the shader material
            return new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: vertexShaderSource,
                fragmentShader: fragmentShaderSource
            });
        } catch (error) {
            console.error("Shader loading error:", error);
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = "Shader loading error: " + error.message;
            throw error;
        }
    }
    
    // Create the shader material with error catching
    let material;
    try {
        // We'll initialize with a placeholder and replace it when the shaders load
        material = new THREE.MeshBasicMaterial({ color: 0x333333 });
        
        // Load only the fragment shader and update the material
        loadFragmentShader().then(shaderMaterial => {
            mesh.material = shaderMaterial;
            console.log("Shader material created successfully");
        }).catch(shaderError => {
            console.error("Shader compilation error:", shaderError);
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = "Shader compilation error: " + shaderError.message;
        });
    } catch (error) {
        console.error("Material initialization error:", error);
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = "Material initialization error: " + error.message;
    }
    
    // Create the mesh and add it to the static scene
    const mesh = new THREE.Mesh(geometry, material);
    staticScene.add(mesh);
    
    // Add dynamic camera position and orientation indicator
    const cameraInfoDiv = document.createElement('div');
    cameraInfoDiv.style.position = 'absolute';
    cameraInfoDiv.style.bottom = '10px';
    cameraInfoDiv.style.left = '10px';
    cameraInfoDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    cameraInfoDiv.style.color = 'white';
    cameraInfoDiv.style.padding = '5px 10px';
    cameraInfoDiv.style.borderRadius = '5px';
    cameraInfoDiv.style.zIndex = '100';
    canvasContainer.appendChild(cameraInfoDiv);
    
    // Add teleportation status indicator
    const teleportStatusDiv = document.createElement('div');
    teleportStatusDiv.style.position = 'absolute';
    teleportStatusDiv.style.top = '10px';
    teleportStatusDiv.style.right = '10px';
    teleportStatusDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    teleportStatusDiv.style.color = 'white';
    teleportStatusDiv.style.padding = '5px 10px';
    teleportStatusDiv.style.borderRadius = '5px';
    teleportStatusDiv.style.zIndex = '100';
    teleportStatusDiv.textContent = 'Teleport: Ready';
    canvasContainer.appendChild(teleportStatusDiv);
    
    // Handle fullscreen change
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement === canvasContainer) {
            // We've entered fullscreen, update size to match viewport
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Update camera aspect ratio
            dynamicCamera.aspect = width / height;
            dynamicCamera.updateProjectionMatrix();
            
            // Resize renderer
            renderer.setSize(width, height);
            
            // Update shader resolution uniform
            uniforms.iResolution.value.set(width, height);
        } else {
            // We've exited fullscreen, ResizeObserver will handle sizing back to container
        }
    });
    
    // Helper function to check if camera is within eps distance of a plane
    function isNearPlane(pos, planePos, normal, eps) {
        const diff = new THREE.Vector3().subVectors(pos, planePos);
        return Math.abs(diff.dot(normal)) < eps;
    }
    
    // Function to handle camera teleportation
    function checkAndTeleportCamera(position) {
        // Small buffer to prevent flickering at boundaries
        const teleportEps = 0.1;
        
        // Height range for teleportation to occur
        // Only teleport if camera is within -2 to 2 range
        const minHeight = -2;
        const maxHeight = 2;
        const isInHeightRange = position.y >= minHeight && position.y <= maxHeight;
        
        // If not in height range, don't teleport
        if (!isInHeightRange) {
            return false;
        }
        
        // Define teleportation boundaries and their corresponding destinations
        // This matches the logic in the fragment shader
        
        // Edge 6: If near plane at (0, y, 2*b) with normal (0,0,1) -> teleport to (x, y, -2*b+2*eps)
        if (Math.abs(position.z - (2.0 * b)) < teleportEps && position.x >= -b && position.x <= b) {
            position.z = -2.0 * b + 2.0 * eps;
            return true;
        }
        
        // Edge 4: If near plane at (2*b, y, 0) with normal (0,0,1) -> teleport to (x, y, -2*b+2*eps)
        if (Math.abs(position.z - 0) < teleportEps && position.x >= b && position.x <= 3.0 * b) {
            position.z = -2.0 * b + 2.0 * eps;
            return true;
        }
        
        // Edge 1: If near plane at (0, y, -2*b) with normal (0,0,-1) -> teleport to (x, y, 2*b-2*eps)
        if (Math.abs(position.z - (-2.0 * b)) < teleportEps && position.x >= -b && position.x <= b) {
            position.z = 2.0 * b - 2.0 * eps;
            return true;
        }
        
        // Edge 2: If near plane at (2*b, y, -2*b) with normal (0,0,-1) -> teleport to (x, y, -2*eps)
        if (Math.abs(position.z - (-2.0 * b)) < teleportEps && position.x >= b && position.x <= 3.0 * b) {
            position.z = -2.0 * eps;
            return true;
        }
        
        // Edge 3: If near plane at (3*b, y, -b) with normal (1,0,0) -> teleport to (-b+2*eps, y, z)
        if (Math.abs(position.x - (3.0 * b)) < teleportEps && position.z >= -2.0 * b && position.z <= 0) {
            position.x = -b + 2.0 * eps;
            return true;
        }
        
        // Edge 5: If near plane at (b, y, b) with normal (1,0,0) -> teleport to (-b+2*eps, y, z)
        if (Math.abs(position.x - b) < teleportEps && position.z >= 0 && position.z <= 2.0 * b) {
            position.x = -b + 2.0 * eps;
            return true;
        }
        
        // Edge 7: If near plane at (-b, y, b) with normal (-1,0,0) -> teleport to (b-2*eps, y, z)
        if (Math.abs(position.x - (-b)) < teleportEps && position.z >= 0 && position.z <= 2.0 * b) {
            position.x = b - 2.0 * eps;
            return true;
        }
        
        // Edge 8: If near plane at (-b, y, -b) with normal (-1,0,0) -> teleport to (3*b-2*eps, y, z)
        if (Math.abs(position.x - (-b)) < teleportEps && position.z >= -2.0 * b && position.z <= 0) {
            position.x = 3.0 * b - 2.0 * eps;
            return true;
        }
        
        return false;
    }
    
    // Variable to track when we last teleported (to prevent rapid teleports)
    let lastTeleportTime = 0;
    const teleportCooldown = 500; // milliseconds
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - prevTime) / 1000;
        prevTime = time;
        
        // Update uniforms for time
        uniforms.iTime.value += delta;
        
        // Only handle movement if pointer is locked
        if (isPointerLocked) {
            // Handle dynamic camera movement
            velocity.set(0, 0, 0);
            
            // Handle movement with quaternion-based direction
            if (moveForward) {
                velocity.z = -movementSpeed * delta;
                velocity.applyQuaternion(dynamicCamera.quaternion);
                dynamicCamera.position.add(velocity);
            }
            
            if (moveBackward) {
                velocity.z = movementSpeed * delta;
                velocity.applyQuaternion(dynamicCamera.quaternion);
                dynamicCamera.position.add(velocity);
            }
            
            if (moveLeft) {
                velocity.x = -movementSpeed * delta;
                velocity.applyQuaternion(dynamicCamera.quaternion);
                dynamicCamera.position.add(velocity);
            }
            
            if (moveRight) {
                velocity.x = movementSpeed * delta;
                velocity.applyQuaternion(dynamicCamera.quaternion);
                dynamicCamera.position.add(velocity);
            }
            
            if (moveUp) {
                velocity.y = movementSpeed * delta;
                dynamicCamera.position.add(velocity);
            }
            
            if (moveDown) {
                velocity.y = -movementSpeed * delta;
                dynamicCamera.position.add(velocity);
            }
            
            // Check if camera needs to be teleported and do teleportation
            if (time - lastTeleportTime > teleportCooldown) {
                if (checkAndTeleportCamera(dynamicCamera.position)) {
                    lastTeleportTime = time;
                    teleportStatusDiv.textContent = 'Teleport: Active';
                    teleportStatusDiv.style.backgroundColor = 'rgba(0,255,0,0.7)';
                    
                    // Reset teleport status after a short delay
                    setTimeout(() => {
                        teleportStatusDiv.textContent = 'Teleport: Ready';
                        teleportStatusDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
                    }, 500);
                } else if (dynamicCamera.position.y < -2 || dynamicCamera.position.y > 2) {
                    // Update status to show we're out of teleport range
                    teleportStatusDiv.textContent = 'Teleport: Out of Range';
                    teleportStatusDiv.style.backgroundColor = 'rgba(255,0,0,0.7)';
                } else {
                    // Update status to show we're in teleport range but not near a portal
                    teleportStatusDiv.textContent = 'Teleport: Ready';
                    teleportStatusDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
                }
            }
        }
        
        // Update shader uniforms with the dynamic camera's position and orientation
        uniforms.rayMarchCamPos.value.copy(dynamicCamera.position);
        
        // Calculate camera front vector from quaternion
        const cameraFront = new THREE.Vector3(0, 0, -1);
        cameraFront.applyQuaternion(dynamicCamera.quaternion);
        uniforms.rayMarchCamFront.value.copy(cameraFront);
        
        // Calculate camera up vector from quaternion
        const cameraUp = new THREE.Vector3(0, 1, 0);
        cameraUp.applyQuaternion(dynamicCamera.quaternion);
        uniforms.rayMarchCamUp.value.copy(cameraUp);
        
        // Get quaternion components for display
        const quaternion = dynamicCamera.quaternion;
        
        // Update camera position and orientation indicator
        cameraInfoDiv.textContent = 
            `Position: (${dynamicCamera.position.x.toFixed(1)}, ${dynamicCamera.position.y.toFixed(1)}, ${dynamicCamera.position.z.toFixed(1)})`;
        
        // Render using the static camera and the static scene
        renderer.render(staticScene, staticCamera);
    }
    
    // Start animation
    animate();
    console.log("Animation loop started");
    
} catch (error) {
    // Display any errors
    console.error("Main initialization error:", error);
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = error.message || "WebGL initialization error";
}