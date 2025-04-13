import * as THREE from 'three';

// Check for WebGL support first
if (!window.WebGLRenderingContext) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = 'Your browser does not support WebGL';
}

// Initialize scene with error handling
try {
    // Shader configurations for different surfaces
    const shaderConfigs = {
        'L': {
            fragmentShader: 'shader/L.frag',
            teleportConfig: {
                // Default teleport config for L surface
                b: 2.0,
                wall_height: 2.0,
                eps: 0.001
            },
            displayName: 'L Surface',
            initialPosition: new THREE.Vector3(0, 0, 0)
        },
        'double_pentagon_mirror': {
            fragmentShader: 'shader/double_pentagon_mirror.frag',
            teleportConfig: {
                // For pentagon, teleportation is handled in the shader,
                // but we keep these values for consistency
                b: 2.0,
                wall_height: 5.0,
                eps: 0.0001
            },
            displayName: 'Double Pentagon Mirror',
            initialPosition: new THREE.Vector3(0, 0, 5)
        },
        'double_pentagon_translation': {
            fragmentShader: 'shader/double_pentagon_translation.frag',
            teleportConfig: {
                // For pentagon translation
                b: 2.0,
                wall_height: 2.0,
                eps: 0.0001
            },
            displayName: 'Double Pentagon Translation',
            initialPosition: new THREE.Vector3(0, 0, 0)
        }
    };
    
    // Get the canvas container
    const canvasContainer = document.querySelector('.canvas-container');
    
    // Get shader selector elements
    const shaderSelect = document.getElementById('shader-select');
    const currentShaderDisplay = document.getElementById('current-shader');
    
    // Track current shader
    let currentShader = 'L';
    
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
    dynamicCamera.position.set(0, 0, 0); // Starting position
    
    // Camera height settings
    const MIN_HEIGHT = 0; // Minimum height (walking on ground)
    const DEFAULT_HEIGHT = 1.7; // Default eye height (standing human)
    let currentHeight = DEFAULT_HEIGHT; // Current eye height
    
    // Camera controls variables for the dynamic camera
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let moveUp = false;
    let moveDown = false;
    let shiftPressed = false; // Track if shift is pressed
    let velocity = new THREE.Vector3();
    let prevTime = performance.now();
    let isPointerLocked = false;
    
    // Movement speed and rotation variables
    const movementSpeed = 3.0;
    const verticalSpeed = 1.5; // Speed for up/down movement
    const rotationSpeed = 0.002;
    const rotationQuaternion = new THREE.Quaternion();

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
            case 'KeyE': moveUp = true; break;    // Changed from Space to E
            case 'KeyQ': moveDown = true; break;  // Changed from Shift+Space to Q
            case 'ShiftLeft': 
            case 'ShiftRight': 
                shiftPressed = true; 
                break;
        }
    });
    
    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyD': moveRight = false; break;
            case 'KeyE': moveUp = false; break;    // Changed from Space to E
            case 'KeyQ': moveDown = false; break;  // Changed from Shift+Space to Q
            case 'ShiftLeft': 
            case 'ShiftRight': 
                shiftPressed = false; 
                break;
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
    
    // Create shader uniforms - now we only need one set since we simplified the shaders
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
    
    // Load and create shader material
    async function loadShaderMaterial(shaderType) {
        try {
            const config = shaderConfigs[shaderType];
            if (!config) {
                throw new Error(`Unknown shader type: ${shaderType}`);
            }
            
            // Load fragment shader from file
            const fragmentResponse = await fetch(config.fragmentShader);
            if (!fragmentResponse.ok) {
                throw new Error(`Failed to load fragment shader: ${fragmentResponse.statusText}`);
            }
            const fragmentShaderSource = await fragmentResponse.text();
            
            // Create the shader material
            return {
                material: new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: vertexShaderSource,
                    fragmentShader: fragmentShaderSource
                }),
                config: config
            };
        } catch (error) {
            console.error("Shader loading error:", error);
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = "Shader loading error: " + error.message;
            throw error;
        }
    }
    
    // Create the mesh and add it to the static scene
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x333333 }));
    staticScene.add(mesh);
    
    // Function to change the current shader
    async function changeShader(shaderType) {
        try {
            const { material, config } = await loadShaderMaterial(shaderType);
            mesh.material = material;
            currentShader = shaderType;
            currentShaderDisplay.textContent = config.displayName;
            
            // Reset camera position to the recommended starting position for this shader
            const startPos = config.initialPosition.clone();
            startPos.y = 0; // Start at ground level
            dynamicCamera.position.copy(startPos);
            
            // Reset camera rotation to look forward
            dynamicCamera.quaternion.set(0, 0, 0, 1);
            
            // Reset height to default
            currentHeight = DEFAULT_HEIGHT;
            
            // Update teleport configuration
            b = config.teleportConfig.b;
            wall_height = config.teleportConfig.wall_height;
            eps = config.teleportConfig.eps;
            
            console.log(`Switched to ${config.displayName} shader`);
        } catch (error) {
            console.error("Error changing shader:", error);
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = "Error changing shader: " + error.message;
        }
    }
    
    // Handle shader selection change
    shaderSelect.addEventListener('change', (event) => {
        changeShader(event.target.value);
    });
    
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
    
    // Add height indicator
    const heightInfoDiv = document.createElement('div');
    heightInfoDiv.style.position = 'absolute';
    heightInfoDiv.style.bottom = '10px';
    heightInfoDiv.style.right = '10px';
    heightInfoDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    heightInfoDiv.style.color = 'white';
    heightInfoDiv.style.padding = '5px 10px';
    heightInfoDiv.style.borderRadius = '5px';
    heightInfoDiv.style.zIndex = '100';
    heightInfoDiv.textContent = `Height: ${DEFAULT_HEIGHT.toFixed(1)}`;
    canvasContainer.appendChild(heightInfoDiv);
    
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
        }
    });
    
    // Set initial shader configuration values
    let { b, wall_height, eps } = shaderConfigs[currentShader].teleportConfig;
    
    // Helper function to check if a point is near a wall
    function isNearWall(position, wallStart, wallEnd, threshold) {
        // Vector from start to end of wall
        const wallVector = wallEnd.clone().sub(wallStart);
        const wallLength = wallVector.length();
        const wallDir = wallVector.clone().divideScalar(wallLength);
        
        // Vector from wall start to position
        const posVector = position.clone().sub(wallStart);
        
        // Project position onto wall line
        const projection = posVector.dot(wallDir);
        
        // Check if projection is within wall segment
        if (projection < 0 || projection > wallLength) {
            return false;
        }
        
        // Calculate distance from position to wall line
        const projectedPoint = wallStart.clone().add(wallDir.multiplyScalar(projection));
        const distance = position.clone().sub(projectedPoint).length();
        
        return distance < threshold;
    }
    
    // Function to check and teleport camera for the double pentagon translation surface
    function checkAndTeleportPentagonCamera(position) {
        const teleportEps = 0.1; // Small buffer to prevent flickering at boundaries
        
        // Since we're walking on the zero plane, we're always in the teleport height range
        
        // Define pentagon vertices (from the shader) - all on the y=0 plane
        const rightPentagon = [
            new THREE.Vector3(3.61803399, 0, 0.00000000),
            new THREE.Vector3(2.23606798, 0, 1.90211303),
            new THREE.Vector3(0, 0, 1.17557050),
            new THREE.Vector3(0, 0, -1.17557050),
            new THREE.Vector3(2.23606798, 0, -1.90211303)
        ];
        
        const leftPentagon = [
            new THREE.Vector3(-2.23606798, 0, -1.90211303),
            new THREE.Vector3(-0.00000000, 0, -1.17557050),
            new THREE.Vector3(-0.00000000, 0, 1.17557050),
            new THREE.Vector3(-2.23606798, 0, 1.90211303),
            new THREE.Vector3(-3.61803399, 0, 0.00000000)
        ];
        
        // Translation vectors (paired with each wall)
        const translationVectors = [
            new THREE.Vector3(-5.85410197, 0, -1.90211303), // d
            new THREE.Vector3(-2.23606798, 0, -3.07768354), // c
            new THREE.Vector3(-2.23606798, 0, 3.07768354),  // b
            new THREE.Vector3(-5.85410197, 0, 1.90211303),  // a
        ];
        
        // Check if near any wall in the right pentagon and teleport if so
        // Wall d (right)
        if (isNearWall(position, rightPentagon[0], rightPentagon[1], teleportEps)) {
            position.add(translationVectors[0].clone().multiplyScalar(1 - 3 * eps));
            return true;
        }
        
        // Wall d (left)
        if (isNearWall(position, leftPentagon[0], leftPentagon[4], teleportEps)) {
            position.add(translationVectors[0].clone().multiplyScalar(-1 * (1 - 3 * eps)));
            return true;
        }
        
        // Wall c (right)
        if (isNearWall(position, rightPentagon[1], rightPentagon[2], teleportEps)) {
            position.add(translationVectors[1].clone().multiplyScalar(1 - 3 * eps));
            return true;
        }
        
        // Wall c (left)
        if (isNearWall(position, leftPentagon[0], leftPentagon[1], teleportEps)) {
            position.add(translationVectors[1].clone().multiplyScalar(-1 * (1 - 3 * eps)));
            return true;
        }
        
        // Wall b (right)
        if (isNearWall(position, rightPentagon[3], rightPentagon[4], teleportEps)) {
            position.add(translationVectors[2].clone().multiplyScalar(1 - 3 * eps));
            return true;
        }
        
        // Wall b (left)
        if (isNearWall(position, leftPentagon[2], leftPentagon[3], teleportEps)) {
            position.add(translationVectors[2].clone().multiplyScalar(-1 * (1 - 3 * eps)));
            return true;
        }
        
        // Wall a (left)
        if (isNearWall(position, rightPentagon[0], rightPentagon[4], teleportEps)) {
            position.add(translationVectors[3].clone().multiplyScalar(1 - 3 * eps));
            return true;
        }
        
        // Wall a (right)
        if (isNearWall(position, leftPentagon[3], leftPentagon[4], teleportEps)) {
            position.add(translationVectors[3].clone().multiplyScalar(-1 * (1 - 3 * eps)));
            return true;
        }
        
        return false;
    }
    
    // Function to check if camera height is within valid teleport range
    function isHeightInTeleportRange(height) {
        return height <= wall_height && height >= -wall_height;
    }
    
    // Generic teleportation function that works for both L and pentagon
    function checkAndTeleportCamera(position) {
        // Return false if not in teleport mode or if using pentagon mirror shader
        if (currentShader === 'double_pentagon_mirror') {
            // For pentagon mirror, we don't use our custom teleport logic
            // The shader handles the teleportation internally
            return false;
        } else if (currentShader === 'double_pentagon_translation') {
            // For pentagon translation, use the specific teleport function
            return checkAndTeleportPentagonCamera(position);
        }
        
        // Small buffer to prevent flickering at boundaries
        const teleportEps = 0.1;
        
        // L surface teleportation logic
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
        
        // Update time uniform
        uniforms.iTime.value += delta;
        
        // Only handle movement if pointer is locked
        if (isPointerLocked) {
            // IMPROVED MOVEMENT SYSTEM THAT WORKS PROPERLY WHEN LOOKING STRAIGHT DOWN
            if (moveForward || moveBackward || moveLeft || moveRight) {
                // Create input vector based on which keys are pressed
                const inputDir = new THREE.Vector3(
                    (moveRight ? 1 : 0) - (moveLeft ? 1 : 0),
                    0,
                    (moveBackward ? 1 : 0) - (moveForward ? 1 : 0)
                );
                
                // Only proceed if there's input
                if (inputDir.lengthSq() > 0) {
                    // Normalize to prevent faster diagonal movement
                    inputDir.normalize();
                    
                    // Get the camera's forward and right vectors
                    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(dynamicCamera.quaternion);
                    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(dynamicCamera.quaternion);
                    
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
                    moveVector.multiplyScalar(movementSpeed * delta);
                    
                    // Apply movement
                    dynamicCamera.position.add(moveVector);
                }
            }
            
            // Handle vertical movement (change height)
            if (moveUp) {
                // E key = Move up
                currentHeight = currentHeight + verticalSpeed * delta;
                // Update height indicator
                heightInfoDiv.textContent = `Height: ${currentHeight.toFixed(1)}`;
            }
            
            if (moveDown) {
                // Q key = Move down
                currentHeight = currentHeight - verticalSpeed * delta;
                // Update height indicator
                heightInfoDiv.textContent = `Height: ${currentHeight.toFixed(1)}`;
            }
            
            // Check if height is within teleport range and update teleport status accordingly
            if (!isHeightInTeleportRange(currentHeight)) {
                // Height is out of range, set teleport status to "out of range"
                teleportStatusDiv.textContent = 'Teleport: Out of Range';
                teleportStatusDiv.style.backgroundColor = 'rgba(255,0,0,0.7)';
            } else if (time - lastTeleportTime > teleportCooldown) {
                // Height is in range, check if teleportation is needed
                if (checkAndTeleportCamera(dynamicCamera.position)) {
                    lastTeleportTime = time;
                    teleportStatusDiv.textContent = 'Teleport: Active';
                    teleportStatusDiv.style.backgroundColor = 'rgba(0,255,0,0.7)';
                    
                    // Reset teleport status after a short delay
                    setTimeout(() => {
                        if (isHeightInTeleportRange(currentHeight)) {
                            teleportStatusDiv.textContent = 'Teleport: Ready';
                            teleportStatusDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
                        } else {
                            teleportStatusDiv.textContent = 'Teleport: Out of Range';
                            teleportStatusDiv.style.backgroundColor = 'rgba(255,0,0,0.7)';
                        }
                    }, 500);
                } else {
                    // Always ready for teleport when in height range
                    teleportStatusDiv.textContent = 'Teleport: Ready';
                    teleportStatusDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
                }
            }
        }
        
        // Update common shader uniforms with the dynamic camera's position and orientation
        // Use currentHeight for the view height
        const viewPosition = dynamicCamera.position.clone();
        viewPosition.y = currentHeight; // Use current height for view
        uniforms.rayMarchCamPos.value.copy(viewPosition);
        
        // Calculate camera front vector from quaternion
        const cameraFront = new THREE.Vector3(0, 0, -1);
        cameraFront.applyQuaternion(dynamicCamera.quaternion);
        uniforms.rayMarchCamFront.value.copy(cameraFront);
        
        // Calculate camera up vector from quaternion
        const cameraUp = new THREE.Vector3(0, 1, 0);
        cameraUp.applyQuaternion(dynamicCamera.quaternion);
        uniforms.rayMarchCamUp.value.copy(cameraUp);
        
        // Update camera position indicator
        cameraInfoDiv.textContent = 
            `Position: (${dynamicCamera.position.x.toFixed(1)}, ${currentHeight.toFixed(1)}, ${dynamicCamera.position.z.toFixed(1)})`;
        
        // Render using the static camera and the static scene
        renderer.render(staticScene, staticCamera);
    }
    
    // Start by loading the initial shader (L by default)
    changeShader(currentShader).then(() => {
        // Start animation
        animate();
        console.log("Animation loop started");
    }).catch(error => {
        console.error("Failed to load initial shader:", error);
    });
    
} catch (error) {
    // Display any errors
    console.error("Main initialization error:", error);
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = error.message || "WebGL initialization error";
}