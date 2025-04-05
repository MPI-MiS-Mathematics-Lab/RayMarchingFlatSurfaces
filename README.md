# Ray Marching

![Ray Marching Demo](screenshot.png)

An interactive 3D visualization created using the ray marching technique with Three.js and WebGL shaders.

## [Live Demo](https://fabianlander.github.io/ray-marching)

## Description

This project demonstrates the ray marching rendering technique to create an explorable 3D environment. Unlike traditional polygon-based rendering, ray marching uses distance functions to create complex 3D geometries with relatively simple code.

### Features

- First-person navigation through a procedurally defined environment
- Ray marching implementation in GLSL shaders
- Real-time lighting and surface normal calculations
- Physics-based collision detection and response
- Efficient distance field representation of the environment

## How to Run Locally

```bash
# Clone the repository
git clone https://github.com/fabianlander/ray-marching.git
cd ray-marching

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Controls

- **WASD** - Move around
- **Mouse** - Look around
- **Space/Shift** - Move up/down
- **Click** to lock cursor and enable mouse controls

## Technical Implementation

The project uses:

- **Three.js** for WebGL rendering and camera controls
- **GLSL Shaders** for the ray marching implementation
- **Vite** for building and development
- **JavaScript** for user interaction

### Ray Marching Algorithm

The core of this project is the ray marching algorithm implemented in the fragment shader. For each pixel:

1. A ray is cast from the camera position
2. The ray steps forward in increments determined by the distance to the nearest object
3. At each step, the distance to the nearest object is calculated
4. The ray advances by this safe distance
5. This continues until hitting an object or reaching a maximum distance

The fragment shader uses Signed Distance Functions (SDFs) to define the geometry.

## License

MIT

## Related Projects

Check out my other WebGL experiments on my [portfolio website](https://fabianlander.com/projects).