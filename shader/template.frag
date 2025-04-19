#define M_PI 3.1415926535897932384626433832795

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 rayMarchCamPos;
uniform vec3 rayMarchCamFront;
uniform vec3 rayMarchCamUp;

const float eps = 0.00001;
const float tMax = 100.0;
const float b = 2.0;
const float wall_height = 2.0;

const mat3 IDENTITY_MAT = mat3(
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0
);



mat3 rotMat(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

// Define the polygon vertices
const int N = {{N}};
const vec2 polygonVertices[N] = vec2[N](
    {{VERTICES}}
);

const int NUM_WALLS = {{NUM_WALLS}};

// Transformation arrays - will contain either transformVectors or mirrorNormals
{{TRANSFORMATION_ARRAYS}}


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

// Wall SDF implementation
float sdWall(vec3 p, vec3 a, vec3 b, float height) {
    vec3 d = b - a;
    // cw is the centre of the wall
    vec3 cw = 0.5 * (a + b);
    float angle = acos(d.x / length(d));
    if (d.z < 0.0) angle = -angle; // Fix for walls with negative z direction
    p -= cw;
    p = rotMat(vec3(0., 1., 0.), -angle) * p; // translate by centre and rotate
    vec3 q = abs(p) - vec3(0.5 * length(d), height, 0.5 * eps);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Fast wall geometry component (no ID tracking)
float sdWallGeometry(vec3 p) {
    // Initialize with a large value
    float df = 1000.0;
    
    // Create walls by connecting the polygon vertices
    for(int i = 0; i < N-1; i++) {
        // Create 3D points from the 2D vertices (y is up in 3D space)
        vec3 a = vec3(polygonVertices[i].x, 0.0, polygonVertices[i].y);
        vec3 b = vec3(polygonVertices[i+1].x, 0.0, polygonVertices[i+1].y);
        
        // Union this wall with our distance field
        df = min(df, sdWall(p, a, b, wall_height));
    }
    
    return df;
}

// Wall geometry component with wall ID
// Returns vec2(distance, wallID)
vec2 sdWallGeometryWithID(vec3 p) {
    // Initialize with a large value and invalid ID (-1)
    vec2 result = vec2(1000.0, -1.0);
    
    // Create walls by connecting the polygon vertices
    for(int i = 0; i < N-1; i++) {
        // Create 3D points from the 2D vertices (y is up in 3D space)
        vec3 a = vec3(polygonVertices[i].x, 0.0, polygonVertices[i].y);
        vec3 b = vec3(polygonVertices[i+1].x, 0.0, polygonVertices[i+1].y);
        
        // Calculate distance to this wall
        float wallDist = sdWall(p, a, b, wall_height);
        
        // If this wall is closer than the current closest, update result
        if (wallDist < result.x) {
            result = vec2(wallDist, float(i));
        }
    }
    
    return result;
}

// Decorative elements component
float sdDecorations(vec3 p) {
    float df = 1000.0;
    // Add decorative elements
    df = opUnion(df, opSubtraction(sdSphere(p, 0.13), sdBox(p, vec3(0.1))));
    df = opUnion(df, sdSphere(p - vec3(1.618033988749895 + 1.618033988749895 * cos(3.0 * (0.5 * iTime)), 0., sin(3.0 * (0.5 * iTime))), 0.07));
    
    return df;
}

// Fast SDF without ID calculations (for ray marching)
float sdf(vec3 p) {
    float walls = sdWallGeometry(p);
    float decorations = sdDecorations(p);
    return min(walls, decorations);
}

// SDF with ID information for identifying what was hit
vec2 sdfWithID(vec3 p) {
    vec2 walls = sdWallGeometryWithID(p);       // vec2(distance, wallID)
    float decorDist = sdDecorations(p);         // Just distance
    
    // Return the closest object with its ID
    if (decorDist < walls.x) {
        return vec2(decorDist, 1000.0); // 1000 = decoration ID
    } else {
        return walls; // vec2(distance, wallID)
    }
}

vec3 getNormal(vec3 p) {
    const float eps = 0.0001;
    const vec2 h = vec2(eps, 0.);
    return normalize(vec3(sdf(p+h.xyy) - sdf(p-h.xyy),
                          sdf(p+h.yxy) - sdf(p-h.yxy),
                          sdf(p+h.yyx) - sdf(p-h.yyx)));
}

// Apply the transformation based on type (translation or mirror)
void applyTransformation(inout vec3 pos, inout vec3 ray, int wallIdx) {
    {{TRANSFORMATION_CODE}}
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
    float t = 0.0;
    vec3 pos = cameraPos;
    float collision_count = 0.0;
    float finalHitID = -1.0; // Will store what we finally hit: 0-7 = wall ID, 10 = decoration, -1 = nothing
    
    for(int i = 0; i < 2000; i++) { // Reduced iteration count for better performance
        // Get distance to the scene
        float sceneDist = sdf(pos);
        // Standard ray marching step
        pos = pos + sceneDist * ray;

        // Check if we hit something
        if (abs(sceneDist) < eps) {
            // Determine what we hit
            vec2 hitInfo = sdfWithID(pos);
            finalHitID = hitInfo.y;
            
            // If we hit a wall (ID 0-1000), transform and continue
            if (finalHitID < 1000.0) {
                // Use a local integer variable for the wall ID
                int wallIdx = int(finalHitID);
                
                // Apply wall transformation
                applyTransformation(pos, ray, wallIdx);
                
                // Increment collision counter
                collision_count += 1.0;
                
                // Continue ray marching (skip the standard step)
                continue;
            } else {
                // We hit a decoration or non-wall object, we're done
                break;
            }
        }

        t += sceneDist;
        // {{VERTICAL_COMPONENT}}

        // Check if we've gone too far
        if (t > tMax) {
            finalHitID = -1.0; // Nothing hit
            break;
        }
    }

    // Color based on what we hit
    vec3 color = vec3(1.0); // Default white for sky/background
    
    if (finalHitID >= 0.0) {
        if (finalHitID >= 10.0) {
            // Decoration hit
            vec3 normal = getNormal(pos);
            color = normal * 0.5 + 0.5;
        } else {
            // Wall hit - this shouldn't normally be visible as we teleport through walls
            // But useful for debugging
            color = vec3(0.9, 0.9, 0.9); // Bright orange to indicate a wall was directly hit
        }
    }
    
    // Apply collision fog to visualize number of teleports

    // Final output
    gl_FragColor = vec4(color, 1.0) - collision_count*vec4(0.02);
}