# Ray Marching on Locally Flat Surfaces

An interactive visualization of mathematical surfaces using ray marching techniques with Three.js and WebGL shaders. This project explores translation surfaces, mirror rooms, and cube surfaces through real-time ray marching algorithms.

![Ray Marching on locally flat surfaces](screenshot.png)

## Project History

This repository is a refactored and performance-optimized version of the [original Raymarching on Surfaces project](https://github.com/hegl-lab/Independent-SS22-Raymarching-Flat-Surfaces) from HEGL Lab. The original work was developed by Fabian Lander, Mara-Eliana Popescu, and Diaaeldin Taha.

## Key Improvements

- Enhanced accessibility features
- Significantly improved performance
- Modern build system with Vite
- Responsive design for different screen sizes
- Optimized collision detection and response
- Improved navigation controls

## Visualizations

This project includes several mathematical visualizations:

- **Translation Surfaces**: Explore geometric surfaces created by translating a curve along another curve
- **Mirror Rooms**: Experience infinite reflections in a confined space
- **Cube Surfaces**: Navigate the surface of a cube with continuous movement

## Live Demo

Check out the live demo: [under construction]

## Controls

- **WASD** - Move forward/backward/left/right
- **Mouse** - Look around
- **Space/Shift** - Move up/down
- **Click** - Lock/unlock mouse cursor

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- npm (comes with Node.js)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/FabianLander/RayMarchingFlatSurfaces.git
   cd RayMarchingFlatSurfaces
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the development server:

```bash
npm run dev
```

This will start a local development server at http://localhost:5173 (or another port if 5173 is already in use). The page will automatically reload when you make changes to the code.

### Building for Production

To build the project for production:

```bash
npm run build
```

This creates a `dist` folder with the compiled and optimized files ready for deployment.

To preview the production build locally:

```bash
npm run preview
```

## Technical Implementation

This project demonstrates ray marching, an advanced rendering technique that works by:

1. Sending rays from the camera through each pixel
2. Using signed distance functions (SDFs) to define the geometry
3. Marching along each ray until it hits an object or reaches its maximum distance
4. Calculating lighting, colors, and effects based on the hit point

Key technical features include:

- Custom JavaScript for keyboard and mouse input control
- Ray marching algorithms implemented in GLSL fragment shaders
- Real-time rendering of flat surfaces with dynamic camera perspectives
- WebGL-based visualization using the THREE.js framework

## Technologies Used

- [Three.js](https://threejs.org/) - 3D JavaScript library
- [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) - Web Graphics Library
- [Vite](https://vitejs.dev/) - Frontend build tool
- GLSL - OpenGL Shading Language for writing shaders

## Related Resources

- Original project: [HEGL Lab Raymarching on Flat Surfaces](https://github.com/hegl-lab/Independent-SS22-Raymarching-Flat-Surfaces)
- Interactive visualization: [HEGL Lab Web Interface](https://hegl.mathi.uni-heidelberg.de/galleries/online-apps/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Heidelberg Experimental Geometry Lab (HEGL) for the original project
- Three.js and WebGL communities for their excellent documentation and examples