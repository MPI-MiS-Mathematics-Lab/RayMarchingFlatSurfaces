/**
 * ShaderBuilder utility for dynamically generating GLSL shaders from JSON configurations
 */
class ShaderBuilder {
    /**
     * Create a shader from a template and polygon config
     * @param {string} template - Base shader template
     * @param {Object} config - Polygon configuration object
     * @returns {string} - Generated shader code
     */
    static createShader(template, config) {
        let shader = template;
        
        // Replace simple constants
        shader = shader.replace('{{WALL_HEIGHT}}', config.wallHeight.toFixed(1));
        
        // Set number of vertices
        const vertices = config.vertices;
        shader = shader.replace('{{N}}', vertices.length);
        
        // Replace vertices
        const verticesGLSL = vertices.map(v => `vec2(${v[0].toFixed(8)}, ${v[1].toFixed(8)})`).join(',\n    ');
        shader = shader.replace('{{VERTICES}}', verticesGLSL);
        
        // Set number of walls (edges)
        const numWalls = config.edges.length;
        shader = shader.replace('{{NUM_WALLS}}', numWalls);
        
        // Determine transformation type based on first edge (assuming all edges use same type)
        const transformationType = config.edges[0].type;
        
        // Create the appropriate transformation arrays based on type
        let transformationTypeDeclaration = '';
        let transformationArrays = '';
        let transformationCode = '';
        
        if (transformationType === 'translation') {
            // Generate the full array declaration with values
            transformationArrays = 'const vec3 transformVectors[NUM_WALLS] = vec3[NUM_WALLS](\n' + 
                config.edges.map(edge => 
                    `    vec3(${edge.vector[0].toFixed(8)}, ${edge.vector[1].toFixed(8)}, ${edge.vector[2].toFixed(8)})`
                ).join(',\n') + 
                '\n);';
            
            // The TYPE will be empty since it's included in the arrays
            transformationTypeDeclaration = '';
            
            // Add transformation application code
            transformationCode = `
    // Apply translation
    if(wallIdx >= 0 && wallIdx < NUM_WALLS) {
        // Apply translation to position
        pos += (1. - 5.*eps) * transformVectors[wallIdx];
    }`;
        } else if (transformationType === 'mirror') {
            // Generate the full array declaration with values
            transformationArrays = 'const vec3 mirrorNormals[NUM_WALLS] = vec3[NUM_WALLS](\n' + 
                config.edges.map(edge => 
                    `    vec3(${edge.normal[0].toFixed(8)}, ${edge.normal[1].toFixed(8)}, ${edge.normal[2].toFixed(8)})`
                ).join(',\n') + 
                '\n);';
            
            // The TYPE will be empty since it's included in the arrays
            transformationTypeDeclaration = '';
            
            // Add mirror transformation code
            transformationCode = `
    // Apply mirror reflection
    if(wallIdx >= 0 && wallIdx < NUM_WALLS) {
        // Get mirror normal
        vec3 normal = normalize(mirrorNormals[wallIdx]);
        
        // Mirror the position
        pos -= 2.0 * dot(normal, pos) * normal;
        
        // Mirror the ray direction
        ray -= 2.0 * dot(normal, ray) * normal;
    }`;
        }
        
        // Replace placeholders in the template
        shader = shader.replace('{{TRANSFORMATION_TYPE}}', transformationTypeDeclaration);
        shader = shader.replace('{{TRANSFORMATION_ARRAYS}}', transformationArrays);
        shader = shader.replace('{{TRANSFORMATION_CODE}}', transformationCode);
        
        // Add decorations
        let decorationsCode = '';
        if (config.decorations && config.decorations.length > 0) {
            decorationsCode = config.decorations.map(decoration => {
                if (decoration.type === 'sphere') {
                    const pos = decoration.position;
                    const radius = decoration.radius;
                    
                    if (decoration.animation && decoration.animation.enabled) {
                        // Add animated sphere
                        const speed = decoration.animation.speed || 1.0;
                        const animRadius = decoration.animation.radius || 1.0;
                        return `
    // Animated sphere
    df = opUnion(df, sdSphere(p - vec3(${pos[0].toFixed(8)} + ${animRadius.toFixed(8)} * cos(${speed.toFixed(8)} * iTime), 
                              ${pos[1].toFixed(8)}, 
                              ${pos[2].toFixed(8)} + ${animRadius.toFixed(8)} * sin(${speed.toFixed(8)} * iTime)), 
                              ${radius.toFixed(8)}));`;
                    } else {
                        // Add static sphere
                        return `
    // Static sphere
    df = opUnion(df, sdSphere(p - vec3(${pos[0].toFixed(8)}, ${pos[1].toFixed(8)}, ${pos[2].toFixed(8)}), ${radius.toFixed(8)}));`;
                    }
                }
                return '';
            }).join('\n');
        }
        
        // Add a default decoration if none specified
        if (!decorationsCode) {
            decorationsCode = `
    // Default decoration
    df = opUnion(df, sdSphere(p - vec3(0.0, 1.0, 0.0), 0.1));`;
        }
        
        shader = shader.replace('{{DECORATIONS}}', decorationsCode);
        
        return shader;
    }
}

export default ShaderBuilder;