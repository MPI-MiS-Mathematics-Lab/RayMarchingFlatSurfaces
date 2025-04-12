#define M_PI 3.1415926535897932384626433832795

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 rayMarchCamPos;
uniform vec3 rayMarchCamFront;
uniform vec3 rayMarchCamUp;

// Basic constants
const float eps = 0.0001;
float tMax = 50.;
const float b = 2.0; // Make b a constant
float wall_height = 2.;
float dist_screen = 1.;
float cam_detection_boundary = 100.;

// Polygon definition for the L-shape room (in XZ plane)
const int NUM_VERTICES = 8;

// L-shape polygon vertices (clockwise order)
// These define the walkable area of the room
const vec2 polygonVertices[NUM_VERTICES] = vec2[NUM_VERTICES](
    vec2(2.0, 4.0),     // v8: (2, 4) - Use actual values instead of b
    vec2(-2.0, 4.0),    // v7: (-2, 4)
    vec2(-2.0, 0.0),    // v6: (-2, 0) - Added missing vertex
    vec2(-2.0, -4.0),   // v5: (-2, -4)
    vec2(2.0, -4.0),    // v4: (2, -4)
    vec2(6.0, -4.0),    // v3: (6, -4)
    vec2(6.0, 0.0),     // v2: (6, 0)
    vec2(2.0, 0.0)      // v1: (2, 0)
);

// Translation vectors to apply when hitting each edge
// Edge i is from vertex i to vertex (i+1)%NUM_VERTICES
const vec3 edgeTranslations[NUM_VERTICES] = vec3[NUM_VERTICES](
    vec3(0.0, 0.0, -8.0 + 2.0*eps),   // Edge 0: v8-v7 (top horizontal) → teleport to bottom
    vec3(0.0, 0.0, -8.0 + 2.0*eps),   // Edge 1: v7-v6 (left upper vertical) → teleport to bottom
    vec3(6.0 - 2.0*eps, 0.0, 0.0),    // Edge 2: v6-v5 (left lower vertical) → teleport to right
    vec3(0.0, 0.0, 8.0 - 2.0*eps),    // Edge 3: v5-v4 (bottom left) → teleport to top
    vec3(0.0, 0.0, -2.0*eps),         // Edge 4: v4-v3 (bottom right) → teleport up in Z
    vec3(-8.0 + 2.0*eps, 0.0, 0.0),   // Edge 5: v3-v2 (right vertical) → teleport to left
    vec3(0.0, 0.0, -8.0 + 2.0*eps),   // Edge 6: v2-v1 (middle horizontal) → teleport to bottom
    vec3(0.0, 0.0, -8.0 + 2.0*eps)    // Edge 7: v1-v8 (inner vertical) → teleport to bottom
);

// SDF result structure with edge information
struct EdgeSDF {
    float distance;
    int edgeIndex;
};

// ============= Rotation and Utility Functions =============
mat3 rotMat(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

// ============= Standard Signed Distance Functions =============
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

// ============= 2D Polygon SDF Functions =============
// Distance from point to line segment in 2D
float distToLineSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Helper function: determines if a point is left of a line
float isLeft(vec2 a, vec2 b, vec2 p) {
    return (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
}

// Check if point is inside polygon using winding number algorithm
float isInside(vec2 p, vec2 polygon[NUM_VERTICES]) {
    float winding = 0.0;
    
    for (int i = 0; i < NUM_VERTICES; i++) {
        vec2 v1 = polygon[i];
        vec2 v2 = polygon[(i + 1) % NUM_VERTICES];
        
        if (v1.y <= p.y) {
            if (v2.y > p.y && isLeft(v1, v2, p) > 0.0)
                winding += 1.0;
        } else {
            if (v2.y <= p.y && isLeft(v1, v2, p) < 0.0)
                winding -= 1.0;
        }
    }
    
    return abs(winding) > 0.0 ? 1.0 : 0.0;
}

// Calculate the polygon SDF for any polygon defined by global vertices
EdgeSDF polygonSDF(vec2 p) {
    EdgeSDF result;
    result.distance = 1000000.0;
    result.edgeIndex = -1;
    
    // Find closest edge
    for (int i = 0; i < NUM_VERTICES; i++) {
        vec2 v1 = polygonVertices[i];
        vec2 v2 = polygonVertices[(i + 1) % NUM_VERTICES];
        
        float d = distToLineSegment(p, v1, v2);
        if (d < result.distance) {
            result.distance = d;
            result.edgeIndex = i;
        }
    }
    
    // Determine if inside or outside
    float inside = isInside(p, polygonVertices);
    
    // Apply sign (negative inside, positive outside)
    result.distance = mix(result.distance, -result.distance, inside);
    
    return result;
}

// Apply translation based on which edge was hit
vec3 applyTranslation(vec3 pos, int edgeIndex) {
    if (edgeIndex >= 0 && edgeIndex < NUM_VERTICES) {
        // Create new position to hold the result
        vec3 translatedPos = pos;
        
        // Get the translation vector for this edge
        vec3 translation = edgeTranslations[edgeIndex];
        
        // Apply non-zero components of the translation vector
        // This allows partial translations (only in specific axes)
        if (translation.x != 0.0) translatedPos.x = translation.x;
        if (translation.y != 0.0) translatedPos.y = translation.y;
        if (translation.z != 0.0) translatedPos.z = translation.z;
        
        return translatedPos;
    }
    
    // If invalid edge index, return original position
    return pos;
}

// ============= 3D Scene Definition =============
// Main scene SDF function
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
    
    // Define eight specific vertices forming an L-shape
    vec3 v1 = vec3(b, 0.0, 0.0);       // v1: (b, 0, 0) = (2, 0, 0)
    vec3 v2 = vec3(3.0*b, 0.0, 0.0);   // v2: (3b, 0, 0) = (6, 0, 0)
    vec3 v3 = vec3(3.0*b, 0.0, -2.0*b); // v3: (3b, 0, -2b) = (6, 0, -4)
    vec3 v4 = vec3(b, 0.0, -2.0*b);     // v4: (b, 0, -2b) = (2, 0, -4)
    vec3 v5 = vec3(-b, 0.0, -2.0*b);    // v5: (-b, 0, -2b) = (-2, 0, -4)
    vec3 v6 = vec3(-b, 0.0, 0.0);       // v6: (-b, 0, 0) = (-2, 0, 0)
    vec3 v7 = vec3(-b, 0.0, 2.0*b);     // v7: (-b, 0, 2b) = (-2, 0, 4)
    vec3 v8 = vec3(b, 0.0, 2.0*b);      // v8: (b, 0, 2b) = (2, 0, 4)
    
    // Add cylinders at all eight vertices
    float cylinderRadius = 0.05;  // Larger cylinders for better visibility
    float cylinderHeight = wall_height;
    
    // Add cylinders at each of the specified positions
    df = opUnion(df, max(sdCylinder(p - v1, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v1.y) - cylinderHeight));
    df = opUnion(df, max(sdCylinder(p - v2, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v2.y) - cylinderHeight));
    df = opUnion(df, max(sdCylinder(p - v3, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v3.y) - cylinderHeight));
    df = opUnion(df, max(sdCylinder(p - v4, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v4.y) - cylinderHeight));
    df = opUnion(df, max(sdCylinder(p - v5, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v5.y) - cylinderHeight));
    df = opUnion(df, max(sdCylinder(p - v6, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v6.y) - cylinderHeight));
    df = opUnion(df, max(sdCylinder(p - v7, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v7.y) - cylinderHeight));
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

        if(h < eps) {
            // We hit something - check if it's a wall
            // Extract only the XZ coordinates for the 2D polygon test
            vec2 pos2D = pos.xz;
            
            // Calculate the SDF and get the closest edge
            EdgeSDF edgeSdf = polygonSDF(pos2D);
            
            // If we're very close to an edge, we should translate
            // This threshold determines how close we need to be to an edge
            // before we trigger a translation
            float edgeThreshold = 0.1;
            
            if (abs(edgeSdf.distance) < edgeThreshold) {
                // Apply translation based on which edge we hit
                pos = applyTranslation(pos, edgeSdf.edgeIndex);
                collision_count += 1.;
            } else {
                // Not a wall edge or too far from edge, exit the loop
                break;
            }
        }
        
        pos = pos + h * ray;
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