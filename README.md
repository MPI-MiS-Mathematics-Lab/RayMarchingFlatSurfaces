# Ray Marching Flat Surfaces

An interactive visual exploration of ray marching techniques applied to various geometric surfaces, including translation surfaces, mirror rooms, and cube surfaces.

![Ray Marching Example](screenshot.png)

## Overview

This project implements ray marching algorithms using WebGL shaders to render different mathematical surfaces and geometric spaces in real-time. By leveraging the power of fragment shaders, the application visualizes complex mathematical structures with high performance while maintaining interactive frame rates.

### Key Features

- **Multiple Geometry Types**: Explore diverse mathematical surfaces including translation surfaces, mirror rooms, L-shapes, and more
- **Interactive Camera**: Navigate through the generated spaces with intuitive mouse and keyboard controls
- **Real-time Visualization**: Experience smooth, high-performance rendering of complex geometries
- **Teleportation System**: Camera seamlessly follows the underlying surface geometry
- **Floor Plan View**: Track your position with an interactive overhead map
- **Responsive Design**: Adjustable resolution settings for optimal performance across devices

![Floor Plan Example](floorplan.png)

## Getting Started

### Quick Preview

To quickly try the app without a full setup:

```bash
npm install
npx vite
```

This installs dependencies and launches a local development server at [http://localhost:5173](http://localhost:5173).

### Full Setup (Recommended for Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/FabianLander/RayMarchingFlatSurfaces.git
   cd RayMarchingFlatSurfaces
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will open automatically in your default browser.

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be located in the `dist` directory and can be deployed to any static web server.

To preview the production build locally:

```bash
npm run preview
```

## How It Works

<!-- ![Ray Marching Visualization](placeholder-for-ray-marching-diagram.png) -->

The application implements ray marching techniques through optimized fragment shaders to render complex geometries:

1. **Ray Casting**: For each pixel, the algorithm casts a ray from the camera into the scene
2. **Distance Calculation**: The shader computes the minimum distance to any surface in the scene
3. **Marching**: The algorithm advances along the ray by the computed safe distance
4. **Iteration**: Steps 2 and 3 repeat until a surface is hit or a max step count is reached
5. **Shading**: Upon hitting a surface, the shader calculates lighting, reflections, and material properties

This technique offers accurate and efficient visualization of flat surfaces and complex translation/mirror spaces.

## Controls

- **WASD**: Move the camera forward, left, backward, and right
- **Q/E**: Move the camera up/down
- **Mouse**: Look around
- **Teleport Toggle**: Enable/disable teleportation between connected spaces

## Implemented Geometries

- **Double Pentagon (Mirror)**: Pentagon surface with mirror reflections
- **Double Pentagon (Translation)**: Pentagon surface with translation mapping
- **L-shape**: L-shaped domain with various boundary conditions
- **Cube**: Surface of a cube × ℝ (Euclidean height)

...

## Adding New Geometries

To add a new geometry:

1. Create a new fragment shader in the `shader/` directory
2. Define the distance function and boundary conditions
3. Add the geometry info to the `geometries/manifest.json` file

## Future Improvements

- [ ] Additional surface types (hexagon, octagon, etc.)
- [ ] Dynamic lighting conditions
- [ ] Enhanced boundary visualizations
- [ ] Performance optimizations for complex geometries
- [ ] Mobile touch controls support

## Known Bugs

- [ ] In affine cases (e.g., cube surface), the matrices behave unexpectedly — the linear parts are inverted. This may be resolved by projecting geometries in the XY-plane instead of XZ.

## Contributing

Contributions are welcome! Feel free to submit a Pull Request.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This project is a refactored and improved version of the original work at [HEGL Lab](https://github.com/hegl-lab/Independent-SS22-Raymarching-Flat-Surfaces).

### Original Contributors

- Fabian Lander  
- Mara-Eliana Popescu  
- Diaaeldin Taha  

### Current Maintainers of this Repo

- Fabian Lander

