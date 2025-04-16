#define M_PI 3.1415926535897932384626433832795

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 rayMarchCamPos;
uniform vec3 rayMarchCamFront;
uniform vec3 rayMarchCamUp;

const float eps = 0.0001;
float tMax = 90.;
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

vec4 opSubtractionT(vec4 d1, vec4 d2) {
    return (d2.w < -d1.w) ? vec4(d1.xyz, -d1.w) : d2;
}

vec4 opUnionT(vec4 d1, vec4 d2) {
    return (d2.w < d1.w) ? d2 : d1;
}

float dot2(vec3 v) {
    return dot(v, v);
}

vec4 sdWallT(vec3 p, vec3 a, vec3 b, float height, vec3 translate_by) {
    vec3 d = b - a;

    // cw is the centre of the wall
    vec3 cw = 0.5 * (a + b);
    float angle = acos(d.x / length(d));
    
    if (d.z < 0.0) angle = -angle; // Fix for walls with negative z direction
    
    p -= cw;
    p = rotMat(vec3(0., 1., 0.), -angle) * p; // translate by centre and rotate 
    
    vec3 q = abs(p) - vec3(0.5 * length(d), height, 0.5 * eps);
    return vec4(translate_by, length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0));
}

vec4 sdSphereT(vec3 p, float r) {
    return vec4(vec3(0.0), length(p) - r);
}

vec4 sdBoxT(vec3 p, vec3 b, vec3 translate_by) {
    vec3 q = abs(p) - b;
    return vec4(translate_by, length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0));
}

// Object - double pentagon translation surface
vec4 sdfT(vec3 p) {
    vec4 df = sdWallT(p, 
                     vec3(3.61803399e+00, 0., 0.00000000e+00), 
                     vec3(2.23606798e+00, 0., 1.90211303e+00), 
                     wall_height, 
                     (1. - 3. * eps) * vec3(-5.85410197e+00, 0., -1.90211303e+00)); // d right
                     
    df = opUnionT(df, sdWallT(p, 
                             vec3(-2.23606798e+00, 0., -1.90211303e+00), 
                             vec3(-3.61803399e+00, 0., 0.00000000e+00), 
                             wall_height, 
                             -1. * (1. - 3. * eps) * vec3(-5.85410197e+00, 0., -1.90211303e+00))); // d left

    df = opUnionT(df, sdWallT(p, 
                             vec3(0., 0., 1.17557050e+00), 
                             vec3(2.23606798e+00, 0., 1.90211303e+00), 
                             wall_height, 
                             (1. - 3. * eps) * vec3(-2.23606798e+00, 0., -3.07768354e+00))); // c right
                             
    df = opUnionT(df, sdWallT(p, 
                             vec3(-2.23606798e+00, 0., -1.90211303e+00), 
                             vec3(-0.00000000e+00, 0., -1.17557050e+00), 
                             wall_height, 
                             -1. * (1. - 3. * eps) * vec3(-2.23606798e+00, 0., -3.07768354e+00))); // c left

    df = opUnionT(df, sdWallT(p, 
                             vec3(2.23606798e+00, 0., -1.90211303e+00), 
                             vec3(0.00000000e+00, 0., -1.17557050e+00), 
                             wall_height, 
                             (1. - 3. * eps) * vec3(-2.23606798e+00, 0., 3.07768354e+00))); // b right

    df = opUnionT(df, sdWallT(p, 
                             vec3(0., 0., 1.17557050e+00), 
                             vec3(-2.23606798e+00, 0., 1.90211303e+00), 
                             wall_height, 
                             -1. * (1. - 3. * eps) * vec3(-2.23606798e+00, 0., 3.07768354e+00))); // b left

    df = opUnionT(df, sdWallT(p, 
                             vec3(2.23606798e+00, 0., -1.90211303e+00), 
                             vec3(3.61803399e+00, 0., 0.00000000e+00), 
                             wall_height, 
                             (1. - 3. * eps) * vec3(-5.85410197e+00, 0., 1.90211303e+00))); // a left

    df = opUnionT(df, sdWallT(p, 
                             vec3(-3.61803399e+00, 0., 0.00000000e+00), 
                             vec3(-2.23606798e+00, 0., 1.90211303e+00), 
                             wall_height, 
                             -1. * (1. - 3. * eps) * vec3(-5.85410197e+00, 0., 1.90211303e+00))); // a right
    
    // Add decorative elements
    df = opUnionT(df, opSubtractionT(sdSphereT(p, 0.13), sdBoxT(p, vec3(0.1), vec3(0.0))));
    df = opUnionT(df, sdSphereT(p - vec3(1.618033988749895 + 1.618033988749895 * cos(3.0 * (0.5 * iTime)), 0., sin(3.0 * (0.5 * iTime))), 0.07));
    
    return df;
}

vec3 getNormalT(vec3 p) {
    const vec2 h = vec2(eps, 0.);
    return normalize(vec3(sdfT(p + h.xyy).w - sdfT(p - h.xyy).w,
                         sdfT(p + h.yxy).w - sdfT(p - h.yxy).w,
                         sdfT(p + h.yyx).w - sdfT(p - h.yyx).w));
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
    
    // Ray marching
    float t = 0.;
    vec3 pos = cameraPos;
    float collision_count = 0.;
    
    for(int i = 0; i < 1000; i++) {
        vec4 h = sdfT(pos);
        if(h.w < eps) {
            if(h.xyz == vec3(0.0)) break;
            pos += h.xyz;
            collision_count += 1.;
        }
        pos = pos + h.w * ray;
        t += h.w;
        
        // Exit loop if we've gone too far
        if(t > tMax) break;
    }

    // Color
    vec3 color = vec3(1.);
    if(t < tMax) {
        vec3 normal = getNormalT(pos);
        color = normal * 0.5 + 0.5;
    }
    
    // Adding collision fog
    gl_FragColor = vec4(color, 1.0) - collision_count * vec4(0.05);
}