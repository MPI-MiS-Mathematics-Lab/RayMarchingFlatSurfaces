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
    
    // // Add cylinders at each of the specified positions
    // df = opUnion(df, max(sdCylinder(p - v1, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v1.y) - cylinderHeight));
    // df = opUnion(df, max(sdCylinder(p - v2, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v2.y) - cylinderHeight));
    // df = opUnion(df, max(sdCylinder(p - v3, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v3.y) - cylinderHeight));
    // df = opUnion(df, max(sdCylinder(p - v4, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v4.y) - cylinderHeight));
    // df = opUnion(df, max(sdCylinder(p - v5, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v5.y) - cylinderHeight));
    // df = opUnion(df, max(sdCylinder(p - v6, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v6.y) - cylinderHeight));
    // df = opUnion(df, max(sdCylinder(p - v7, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v7.y) - cylinderHeight));
    // df = opUnion(df, max(sdCylinder(p - v8, vec3(0.0, 0.0, cylinderRadius)), abs(p.y - v8.y) - cylinderHeight));

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
        color = normal*0.5 +0.5;
    }

    // adding collision fog
    gl_FragColor = vec4(color, 1.0) - collision_count*vec4(0.01);
}