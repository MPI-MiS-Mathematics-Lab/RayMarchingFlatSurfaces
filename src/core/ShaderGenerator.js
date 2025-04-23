// src/core/ShaderGenerator.js

class ShaderGenerator {
  constructor() {
    this.shaderTemplate = null;
    this.geometryCache = new Map();
    this.currentGeometry = null; // Added to store current geometry data
  }

  async initialize() {
    // Load the shader template
    try {
      const response = await fetch('shader/template.frag');
      if (!response.ok) {
        throw new Error(`Failed to load shader template: ${response.statusText}`);
      }
      this.shaderTemplate = await response.text();
      console.log("Shader template loaded successfully");
    } catch (error) {
      console.error("Failed to load shader template:", error);
      throw error;
    }
  }

  async loadGeometryFile(geometryId) {
    // Check if we already have this geometry in cache
    if (this.geometryCache.has(geometryId)) {
      return this.geometryCache.get(geometryId);
    }

    // Otherwise, load it from the file
    try {
      const response = await fetch(`geometries/${geometryId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load geometry file: ${response.statusText}`);
      }
      const geometryData = await response.json();
      
      // Cache the geometry for future use
      this.geometryCache.set(geometryId, geometryData);
      
      return geometryData;
    } catch (error) {
      console.error(`Failed to load geometry ${geometryId}:`, error);
      throw error;
    }
  }

  generateShaderCode(geometryData) {
    if (!this.shaderTemplate) {
      throw new Error("Shader template not loaded. Call initialize() first.");
    }

    // Store the current geometry for reference when generating normals
    this.currentGeometry = geometryData;

    let shaderCode = this.shaderTemplate;
    
    // Replace N (number of vertices) placeholder
    const numVertices = geometryData.vertices.length;
    shaderCode = shaderCode.replace('{{N}}', numVertices);
    
    // Replace NUM_WALLS placeholder
    const numWalls = numVertices - 1;
    shaderCode = shaderCode.replace('{{NUM_WALLS}}', numWalls);
    
    // Replace wall_height placeholder with the value from the geometry data
    // Use default of 2.0 if not specified
    const wallHeight = geometryData.wallHeight !== undefined ? geometryData.wallHeight : 2.0;
    shaderCode = shaderCode.replace('const float wall_height = 2.0;', `const float wall_height = ${wallHeight.toFixed(1)};`);
    
    // Replace fog_effect_strength placeholder with the value from the geometry data
    // Use default of 0.01 if not specified
    const fogEffectStrength = geometryData.fog_effect_strength !== undefined ? geometryData.fog_effect_strength : 0.01;
    shaderCode = shaderCode.replace('const float fog_effect_strength = 0.01;', `const float fog_effect_strength = ${fogEffectStrength.toFixed(4)};`);
    
    // Generate vertices code
    let verticesCode = geometryData.vertices.map(([x, y]) => {
      return `vec2(${x.toFixed(8)}, ${y.toFixed(8)})`;
    }).join(',\n    ');
    shaderCode = shaderCode.replace('{{VERTICES}}', verticesCode);
    
    // Handle vertical component mode (new feature)
    const verticalComponent = geometryData.vertical_component || 'line'; // Default to 'line'
    const verticalWrapAmount = geometryData.vertical_wrap_amount || 4.0; // Default to 4.0
    
    // Replace vertical wrapping placeholder
    if (verticalComponent.toLowerCase() === 'circle') {
      // Enable vertical wrapping
      shaderCode = shaderCode.replace('// {{VERTICAL_COMPONENT}}', 
        `pos.y = mod(pos.y + wall_height, ${verticalWrapAmount.toFixed(1)}) - wall_height;`);
    } else {
      // Disable vertical wrapping (line mode)
      shaderCode = shaderCode.replace('// {{VERTICAL_COMPONENT}}', '// Vertical component: line (no wrapping)');
    }
    
    // Determine the transformation type for this geometry
    // We expect all edges to be of the same type
    const edgeType = geometryData.edges.length > 0 ? geometryData.edges[0].type : 'none';
    
    // Generate transformation arrays and code based on edge type
    const { transformArraysCode, transformationCode } = this.generateTransformationCode(
      edgeType, geometryData.edges, numWalls, geometryData.gluing, geometryData.normals
    );
    
    shaderCode = shaderCode.replace('{{TRANSFORMATION_ARRAYS}}', transformArraysCode);
    shaderCode = shaderCode.replace('{{TRANSFORMATION_CODE}}', transformationCode);
    
    // Generate decorations code
    if (geometryData.decorations && geometryData.decorations.length > 0) {
      // Replace the sdDecorations function with our new implementation
      const decorationsSDF = this.generateDecorationsCode(geometryData.decorations);
      
      // Find and replace the entire sdDecorations function
      const decorationsFunctionRegex = /float sdDecorations\(vec3 p\) \{[^}]*\}/s;
      shaderCode = shaderCode.replace(decorationsFunctionRegex, decorationsSDF);
    }
    
    return shaderCode;
  }

  generateTransformationCode(edgeType, edges, numWalls, gluing, normals) {
    let transformArraysCode = '';
    let transformationCode = '';
    
    // Add gluing vector array
    transformArraysCode += `// Gluing vector defines how edges connect\n`;
    transformArraysCode += `const int gluingVector[NUM_WALLS] = int[NUM_WALLS](\n    `;
    transformArraysCode += gluing.map(idx => `${idx}`).join(', ');
    transformArraysCode += `\n);\n\n`;
    
    // Generate appropriate code based on edge type
    switch (edgeType.toLowerCase()) {
      case 'translation':
        transformArraysCode += this.generateTranslationArrays(edges, numWalls);
        
        // Add normals array
        transformArraysCode += this.generateNormalsArray(normals, numWalls);
        
        transformationCode = `
    // Get the destination wall ID from the gluing vector
    int destWallIdx = gluingVector[wallIdx];
    
    // Apply translation - shorten vector slightly to prevent getting stuck
    if (destWallIdx >= 0 && destWallIdx < NUM_WALLS) {
        pos += transformVectors[wallIdx] - 3.0 * eps * wallNormals[destWallIdx];
    }`;
        break;
        
      case 'mirror':
        // Add normals array only (no transform vectors for mirrors)
        transformArraysCode += this.generateNormalsArray(normals, numWalls);
        
        transformationCode = `
    // Get the destination wall ID from the gluing vector
    int destWallIdx = gluingVector[wallIdx];
    
    // Apply mirror reflection
    if (destWallIdx >= 0 && destWallIdx < NUM_WALLS) {
        vec3 normal = wallNormals[wallIdx];
        // Only reflect the ray direction (not the position)
        ray = ray - 2.0 * dot(ray, normal) * normal;
        // Push slightly away from the surface along the reflected ray direction
        // pos += eps * 3.0 * ray;
        pos -= 3.0 * eps * wallNormals[destWallIdx];        
    }`;
        break;
        
      case 'affine':
        transformArraysCode += this.generateAffineArrays(edges, numWalls);
        
        // Add normals array
        transformArraysCode += this.generateNormalsArray(normals, numWalls);
        
        transformationCode = `
          // Get the destination wall ID from the gluing vector
          int destWallIdx = gluingVector[wallIdx];
          
          // Apply affine transformation using 2x2 matrix + translation
          if (destWallIdx >= 0 && destWallIdx < NUM_WALLS) {
              // Apply 2x2 matrix to x and z components
              vec2 newXZ = transformMatrices[wallIdx] * vec2(pos.x, pos.z) + translateVectors[wallIdx];
              
              // Apply same transformation to ray direction
              vec2 newRayXZ = transformMatrices[wallIdx] * vec2(ray.x, ray.z);
              
              // Update position and ray
              pos = vec3(newXZ.x, pos.y, newXZ.y);
              ray = normalize(vec3(newRayXZ.x, ray.y, newRayXZ.y));
              
              // Push slightly away from the destination wall surface along its normal
              // Use negative normal since we want to push INTO the geometry (away from the wall)
              pos -= 3.0 * eps * wallNormals[destWallIdx];        
              // pos += eps * 3.0 * ray;
              }`;
        break;
        
      default:
        // No transformations or unsupported type
        transformArraysCode = '// No transformation arrays defined for this geometry';
        transformationCode = '// No transformations to apply';
    }
    
    return { transformArraysCode, transformationCode };
  }

  generateNormalsArray(normals, numWalls) {
    let code = `// Normal vectors for each wall\n`;
    code += `const vec3 wallNormals[NUM_WALLS] = vec3[NUM_WALLS](\n`;
    
    code += normals.map(normal => {
      // Convert 2D normal [x, z] to 3D [x, 0, z]
      const [x, z] = normal;
      return `    vec3(${x.toFixed(8)}, 0.0, ${z.toFixed(8)})`;
    }).join(',\n');
    
    code += '\n);\n\n';
    
    return code;
  }

  generateTranslationArrays(edges, numWalls) {
    let code = `// Translation vectors for each wall\n`;
    code += `const vec3 transformVectors[NUM_WALLS] = vec3[NUM_WALLS](\n`;
    
    code += edges.map(edge => {
      // Convert 2D vector [x, z] to 3D [x, 0, z]
      if (!edge.vector) return `    vec3(0.0, 0.0, 0.0)`;
      
      const [x, z] = edge.vector;
      return `    vec3(${x.toFixed(8)}, 0.0, ${z.toFixed(8)})`;
    }).join(',\n');
    
    code += '\n);\n\n';
    
    return code;
  }

  generateAffineArrays(edges, numWalls) {
    // Generate the transformation matrices and translations separately
    let code = `// 2x2 transformation matrices for each wall\n`;
    code += `const mat2 transformMatrices[NUM_WALLS] = mat2[NUM_WALLS](\n`;
    
    code += edges.map(edge => {
      // Default to identity matrix if no transformation is specified
      let a = 1, b = 0, c = 0, d = 1;  // Default identity 2×2 matrix
      
      // Extract transformation from edge data
      if (edge.transform && edge.transform.matrix) {
        [a, b, c, d] = edge.transform.matrix;
      }
      
      // Format the 2×2 matrix for GLSL
      return `    mat2(
      ${a.toFixed(8)}, ${b.toFixed(8)},
      ${c.toFixed(8)}, ${d.toFixed(8)}
    )`;
    }).join(',\n');
    
    code += '\n);\n\n';
    
    // Add translation vectors array
    code += `// Translation vectors for each wall\n`;
    code += `const vec2 translateVectors[NUM_WALLS] = vec2[NUM_WALLS](\n`;
    
    code += edges.map(edge => {
      // Default to zero translation
      let tx = 0, tz = 0;
      
      if (edge.transform && edge.transform.translation) {
        // Get the 2D translation vector
        [tx, tz] = edge.transform.translation;
      }
      
      return `    vec2(${tx.toFixed(8)}, ${tz.toFixed(8)})`;
    }).join(',\n');
    
    code += '\n);\n\n';
    
    return code;
  }

  generateDecorationsCode(decorations) {
    // Start the function
    let code = `float sdDecorations(vec3 p) {
    float df = 1000.0;
    `;
    
    // Process each decoration
    decorations.forEach(decoration => {
      // Get position components - handle both 2D [x,z] + height and legacy 3D [x,y,z] formats
      let xPos, yPos, zPos;
      
      if (decoration.position.length === 2) {
        // New 2D format: position[x,z] + height
        xPos = decoration.position[0];
        yPos = decoration.height || 0.0;
        zPos = decoration.position[1];
      } else if (decoration.position.length === 3) {
        // Legacy 3D format: position[x,y,z]
        xPos = decoration.position[0];
        yPos = decoration.position[1];
        zPos = decoration.position[2];
      }
      
      switch (decoration.type) {
        case 'hollow_cube': {
          const radius = decoration.radius;
          const ratio = decoration.inner_ratio || 0.77; // Default inner cube ratio
          
          code += `
    // Hollow cube
    df = opUnion(df, opSubtraction(sdSphere(p - vec3(${xPos.toFixed(3)}, ${yPos.toFixed(3)}, ${zPos.toFixed(3)}), ${radius.toFixed(3)}), 
                                 sdBox(p - vec3(${xPos.toFixed(3)}, ${yPos.toFixed(3)}, ${zPos.toFixed(3)}), vec3(${(radius*ratio).toFixed(3)}))));`;
          break;
        }
          
        case 'sphere': {
          const radius = decoration.radius;
          
          // Handle backward compatibility
          if (decoration.hollowCube) {
            console.warn("Warning: 'hollowCube' property on sphere is deprecated. Use 'hollow_cube' type instead.");
            code += `
    // Hollow cube (sphere with cube cutout) - DEPRECATED FORMAT
    df = opUnion(df, opSubtraction(sdSphere(p - vec3(${xPos.toFixed(3)}, ${yPos.toFixed(3)}, ${zPos.toFixed(3)}), ${radius.toFixed(3)}), 
                                 sdBox(p - vec3(${xPos.toFixed(3)}, ${yPos.toFixed(3)}, ${zPos.toFixed(3)}), vec3(${(radius*0.77).toFixed(3)}))));`;
          } else if (decoration.animation && decoration.animation.enabled) {
            const anim = decoration.animation;
            const center = anim.center || [0, 0, 0];
            let centerX, centerZ;
            
            if (center.length === 2) {
              centerX = center[0];
              centerZ = center[1];
            } else if (center.length === 3) {
              centerX = center[0];
              centerZ = center[2];
            }
            
            if (anim.type === 'circular') {
              code += `
    // Animated sphere
    df = opUnion(df, sdSphere(p - vec3(${centerX.toFixed(3)} + ${anim.radius.toFixed(3)} * cos(${anim.speed.toFixed(3)} * iTime), 
                                     ${yPos.toFixed(3)}, 
                                     ${centerZ.toFixed(3)} + ${anim.radius.toFixed(3)} * sin(${anim.speed.toFixed(3)} * iTime)), 
                              ${radius.toFixed(3)}));`;
            }
          } else {
            // Basic static sphere
            code += `
    // Static sphere
    df = opUnion(df, sdSphere(p - vec3(${xPos.toFixed(3)}, ${yPos.toFixed(3)}, ${zPos.toFixed(3)}), ${radius.toFixed(3)}));`;
          }
          break;
        }
          
        case 'cylinder': {
          const cylRad = decoration.radius;
          // Use length property instead of height for cylinders
          const cylLength = decoration.length || decoration.height;
          const cylHeight = cylLength / 2; // Convert to half-height for SDF
          
          code += `
    // Cylinder
    df = opUnion(df, sdCylinder(p - vec3(${xPos.toFixed(3)}, ${yPos.toFixed(3)}, ${zPos.toFixed(3)}), 
                                vec3(0.0, 0.0, ${cylRad.toFixed(3)})));
    df = max(df, abs(p.y - ${yPos.toFixed(3)}) - ${cylHeight.toFixed(3)});`;
          break;
        }
          
        // Add more decoration types as needed
      }
    });
    
    // Close the function
    code += `
    
    return df;
}`;
    
    return code;
  }

  async generateShader(geometryId) {
    // Load the geometry data
    const geometryData = await this.loadGeometryFile(geometryId);
    
    // Generate the shader code
    const shaderCode = this.generateShaderCode(geometryData);
    
    return {
      shader: shaderCode,
      initialPosition: geometryData.initialPosition || [0, 1, 0],
      description: geometryData.description || '',
      name: geometryData.name || geometryId,
      verticalComponent: geometryData.vertical_component || 'line',
      verticalWrapAmount: geometryData.vertical_wrap_amount || 4.0,
      wallHeight: geometryData.wallHeight || 2.0,  // Add wallHeight to the returned object
      fogEffectStrength: geometryData.fog_effect_strength || 0.01  // Add fogEffectStrength to the returned object
    };
  }
}

export default ShaderGenerator;