#define M_PI 3.1415926535897932384626433832795

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 rayMarchCamPos;
uniform vec3 rayMarchCamFront;
uniform vec3 rayMarchCamUp;

const float eps = 0.0001;
float tMax = 50.;
float b = 2.0;
float wall_height = 5.;
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

float sdWall(vec3 p, vec3 a, vec3 b, float height, float thickness) {
    vec3 d = b - a;

    // cw is the centre of the wall
    vec3 cw = 0.5*(a+b);
    float angle = acos(d.x / length(d));
    p -= cw; 
    p = rotMat(vec3(0., 1., 0.), -angle) * p; // translate by centre and rotate 
    
    return sdBox(p, vec3(0.5 * length(d), height, thickness));
}

// object
float sdf_mirrors(vec3 p) {
    float wall_length = 2.*2.3511410091698925;
    float df = sdBox(rotMat(vec3(0., 1., 0.), -2.199114857512855)*(p - 2.*vec3(2.92705098,0., 0.95105652)), vec3(wall_length*0.5, wall_height, eps)); // d right
    df = opUnion(df, sdBox(rotMat(vec3(0., 1., 0.), -2.199114857512855)*(p - 2.*vec3(-2.92705098,0., -0.95105652)), vec3(wall_length*0.5, wall_height, eps))); // d left
    df = opUnion(df,sdBox(rotMat(vec3(0., 1., 0.), -0.3141592653589791)*(p - 2.*vec3(1.11803399,0., 1.53884177)), vec3(wall_length*0.5, wall_height, eps))); // c right 
    df = opUnion(df,sdBox(rotMat(vec3(0., 1., 0.), -0.3141592653589791)*(p - 2.*vec3(-1.11803399,0., -1.53884177)), vec3(wall_length*0.5, wall_height, eps))); // c left
    df = opUnion(df,sdBox(rotMat(vec3(0., 1., 0.), -2.8274333882308142)*(p - 2.*vec3(1.11803399,0., -1.53884177)), vec3(wall_length*0.5, wall_height, eps))); // b right
    df = opUnion(df,sdBox(rotMat(vec3(0., 1., 0.), -2.8274333882308142)*(p - 2.*vec3(-1.11803399,0., 1.53884177)), vec3(wall_length*0.5, wall_height, eps))); // b left
    df = opUnion(df,sdBox(rotMat(vec3(0., 1., 0.), -0.9424777960769379)*(p - 2.*vec3(2.92705098,0., -0.95105652)), vec3(wall_length*0.5, wall_height, eps))); // a right
    df = opUnion(df,sdBox(rotMat(vec3(0., 1., 0.), -0.9424777960769379)*(p - 2.*vec3(-2.92705098,0., 0.95105652)), vec3(wall_length*0.5, wall_height, eps))); // a left

    return df;
}

float sdf(vec3 p) {
    float df = sdf_mirrors(p);
    df = opUnion(df, sdSphere(p - vec3(1.9, 0., 0.), 0.1));
    df = opUnion(df, opSubtraction(sdSphere(p, 0.13), sdBox(p, vec3(0.1))));

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
            if(sdf_mirrors(pos) < eps) {
                // Calculate reflection for mirror surfaces
                vec3 n = getNormal(pos);
                ray = ray - 2.0 * dot(ray, n) * n;
                pos += 2.0 * eps * ray;
                collision_count += 1.0;
            }
            if(t > tMax){ 
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
    gl_FragColor = vec4(color, 1.0) - collision_count * vec4(0.05);
}