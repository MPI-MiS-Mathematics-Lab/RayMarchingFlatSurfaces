import * as THREE from 'three';

// Check for WebGL support first
if (!window.WebGLRenderingContext) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = 'Your browser does not support WebGL';
}

// Ray marching vertex shader
const vertexShaderSource = `
void main() {
    gl_Position = vec4(position, 1.0);
}
`;

// Ray marching fragment shader
const fragmentShaderSource = `
#define M_PI 3.1415926535897932384626433832795

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 rayMarchCamPos;
uniform vec3 rayMarchCamFront;
uniform vec3 rayMarchCamUp;

const float eps = 0.0001;
float tMax = 50.;
float b = 2.0;
float wall_height = 2.;
float dist_screen = 1.;
float cam_detection_boundary = 100.;

mat3 rotMat(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

// signed distance functions
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float opSubtraction(float d1, float d2) {
    return max(-d1,d2);
}

float opUnion(float d1, float d2) {
    return min(d1, d2);
}

vec3 opRep(vec3 p, vec3 c) {
    return mod(p + 0.5 * c, c) - 0.5 * c;
}

float sdCylinder(vec3 p, vec3 c) {
    return length(p.xz-c.xy)-c.z;
}

float sdPlane(vec3 p, vec3 n, float h) {
    return dot(p, n) + h;
}

float dot2(vec3 v) {
    return dot(v, v);
}

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// object
float sdf(vec3 p) {
    float df = sdBox(p - vec3(0.,0.,2.*b + eps), vec3(b, wall_height, eps)); //Edge 6
    df = opUnion(df, sdBox(p - vec3(-b-eps,0., b), vec3(eps, wall_height, 1.*b))); // Edge 8
    df = opUnion(df, sdBox(p - vec3(-b-eps,0., -b), vec3(eps, wall_height, 1.*b))); // Edge 7 
    df = opUnion(df, sdBox(p - vec3(b + eps, 0. ,b), vec3(eps, wall_height, b))); // Edge 5
    df = opUnion(df, sdBox(p - vec3(2.*b, 0. ,0.+eps), vec3(b, wall_height, eps))); // Edge 4
    df = opUnion(df, sdBox(p - vec3(3.*b+eps, 0., -b), vec3(eps, wall_height, b))); // Edge 3
    df = opUnion(df, sdBox(p - vec3(2. * b, 0., -2.*b -eps), vec3(b, wall_height, eps))); // Edge 2
    df = opUnion(df, sdBox(p - vec3(0., 0., -2.*b-eps), vec3(b, wall_height, eps))); // Edge 1
    df = opUnion(df, sdSphere(p - vec3(1.* b, 0., -b), 0.1));
    df = opUnion(df, opSubtraction(sdSphere(p, 0.13), sdBox(p, vec3(0.1))));
    
    // Adding cylinders at the 8 key vertices where walls meet
    float cylinderRadius = 0.02;
    float cylinderHeight = wall_height;
    
    // Vertex 1: Corner at (0, 0, -2*b)
    vec3 v1 = vec3(0.0, 0.0, -2.0*b);
    df = opUnion(df, max(sdCylinder(p - v1, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v1.y) - cylinderHeight));
    
    // Vertex 2: Corner at (2*b, 0, -2*b)
    vec3 v2 = vec3(2.0*b, 0.0, -2.0*b);
    df = opUnion(df, max(sdCylinder(p - v2, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v2.y) - cylinderHeight));
    
    // Vertex 3: Corner at (3*b, 0, -b)
    vec3 v3 = vec3(3.0*b, 0.0, -b);
    df = opUnion(df, max(sdCylinder(p - v3, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v3.y) - cylinderHeight));
    
    // Vertex 4: Corner at (2*b, 0, 0)
    vec3 v4 = vec3(2.0*b, 0.0, 0.0);
    df = opUnion(df, max(sdCylinder(p - v4, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v4.y) - cylinderHeight));
    
    // Vertex 5: Corner at (b, 0, 0)
    vec3 v5 = vec3(b, 0.0, 0.0);
    df = opUnion(df, max(sdCylinder(p - v5, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v5.y) - cylinderHeight));
    
    // Vertex 6: Corner at (b, 0, 2*b)
    vec3 v6 = vec3(b, 0.0, 2.0*b);
    df = opUnion(df, max(sdCylinder(p - v6, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v6.y) - cylinderHeight));
    
    // Vertex 7: Corner at (-b, 0, b)
    vec3 v7 = vec3(-b, 0.0, b);
    df = opUnion(df, max(sdCylinder(p - v7, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v7.y) - cylinderHeight));
    
    // Vertex 8: Corner at (-b, 0, -b)
    vec3 v8 = vec3(-b, 0.0, -b);
    df = opUnion(df, max(sdCylinder(p - v8, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v8.y) - cylinderHeight));

    return df;
}

vec3 getNormal(vec3 p) {
    const float eps = 0.0001;
    const vec2 h = vec2(eps, 0.);
    return normalize(vec3(sdf(p+h.xyy) - sdf(p-h.xyy),
                          sdf(p+h.yxy) - sdf(p-h.yxy),
                          sdf(p+h.yyx) - sdf(p-h.yyx)));
}

void main() {
    // Set up camera basis vectors using the uniforms
    vec3 cameraPos = rayMarchCamPos;
    vec3 front = normalize(rayMarchCamFront);
    vec3 right = normalize(cross(front, rayMarchCamUp));
    vec3 up = cross(right, front);
    
    // Normalized device coordinates
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution) / min(iResolution.x, iResolution.y);
    
    // Ray direction with proper FOV (matching Three.js camera)
    float fov = radians(75.0);
    float tan_fov = tan(fov * 0.5);
    vec3 ray = normalize(front + uv.x * right * tan_fov + uv.y * up * tan_fov);
    
    // ray marching
    float t = 0.;
    vec3 pos = cameraPos;
    float collision_count = 0.;
    
    for(int i = 0; i < 2000; i++) {
        float h = sdf(pos);

        pos = pos + h * ray;
        if(h < eps) {
            if(sdBox(pos - vec3(0.,0.,2.*b+eps), vec3(b, wall_height, eps)) < eps) { //Edge 6
                pos.z = -2. * b + 2.*eps;
                pos += h * ray;
                collision_count += 1.;            
            } else if(sdBox(pos- vec3(2.*b, 0. ,0.+eps), vec3(b, wall_height, eps)) < eps) { //Edge 4
                pos.z = -2. * b + 2.*eps;
                pos += h * ray;
                collision_count += 1.;            
            } else if(sdBox(pos - vec3(0., 0., -2.*b - eps), vec3(b, wall_height, eps)) < eps) { //Edge 1
                pos.z = 2. * b - 2.*eps;
                pos += h * ray;
                collision_count += 1.;            
            } else if(sdBox(pos - vec3(2. * b, 0., -2.*b - eps), vec3(b, wall_height, eps)) < eps) { // Edge 2
                pos.z = - 2.*eps;
                pos += h * ray;
                collision_count += 1.;            
            } else if(sdBox(pos- vec3(3.*b + eps, 0., -b), vec3(eps, wall_height, b)) < eps) { //Edge 3
                pos.x = -b + 2.*eps;
                pos += h * ray;
                collision_count += 1.;            
            } else if(sdBox(pos- vec3(b + eps, 0. ,b), vec3(eps, wall_height, b)) < eps) { //Edge 5
                pos.x = -b + 2.*eps;
                pos += h * ray;
                collision_count += 1.;            
            } else if(sdBox(pos- vec3(-b-eps ,0., b), vec3(eps, wall_height, 1.*b)) < eps) { //Edge 7
                pos.x = b - 2.*eps;
                pos += h * ray;
                collision_count += 1.;
            } else if(sdBox(pos- vec3(-b - eps ,0., -b), vec3(eps, wall_height, 1.*b)) < eps) { //Edge 8
                pos.x = 3. * b - 2.*eps;
                pos += h * ray;
                collision_count += 1.;            
            } else if(t > tMax){ 
                pos = vec3(tMax);
                break;
            }
        }
        t += h;
        
        // Exit loop if we've gone too far
        if(t > tMax) break;
    }

    // color
    vec3 color = vec3(1.);
    if(t < tMax) {
        vec3 normal = normalize(getNormal(pos));
        color = normal * 0.5 + 0.5;
    }

    // adding collision fog
    gl_FragColor = vec4(color, 1.0) - collision_count*vec4(0.01);
}
`;

// Initialize scene with error handling
try {
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Set up two cameras:
    // 1. Static orthographic camera for rendering the quad with shader (never moves)
    // 2. Dynamic perspective camera for user movement and ray marching view
    
    // Static camera - orthographic camera that never moves
    const staticCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    staticCamera.position.z = 1;
    
    // Dynamic camera - this is the one we'll move around with controls
    const dynamicCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
    
    // Handle click to lock pointer
    document.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    // Handle pointer lock state changes
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
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
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update dynamic camera aspect ratio
        dynamicCamera.aspect = window.innerWidth / window.innerHeight;
        dynamicCamera.updateProjectionMatrix();
        
        // Resize renderer
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update shader resolution uniform
        uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    });
    
    // Set up a full-screen quad for ray marching
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // Create shader uniforms
    const uniforms = {
        iTime: { value: 0.0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        rayMarchCamPos: { value: new THREE.Vector3() },
        rayMarchCamFront: { value: new THREE.Vector3() },
        rayMarchCamUp: { value: new THREE.Vector3(0, 1, 0) }
    };
    
    // Create the shader material with error catching
    let material;
    try {
        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShaderSource,
            fragmentShader: fragmentShaderSource
        });
        console.log("Shader material created successfully");
    } catch (shaderError) {
        console.error("Shader compilation error:", shaderError);
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = "Shader compilation error: " + shaderError.message;
        throw shaderError;
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
    document.body.appendChild(cameraInfoDiv);
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - prevTime) / 1000;
        prevTime = time;
        
        // Update uniforms for time
        uniforms.iTime.value += delta;
        
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
            `Position: (${dynamicCamera.position.x.toFixed(1)}, ${dynamicCamera.position.y.toFixed(1)}, ${dynamicCamera.position.z.toFixed(1)})\n` +
            `Quaternion: (${quaternion.x.toFixed(2)}, ${quaternion.y.toFixed(2)}, ${quaternion.z.toFixed(2)}, ${quaternion.w.toFixed(2)})`;
        
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