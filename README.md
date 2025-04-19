# RayMarchingFlatSurfaces

A visual exploration of ray marching techniques on various geometric surfaces, including translation surfaces, mirror rooms, and cube surfaces.

![Ray Marching Example](placeholder-for-main-visualization.png)

## Overview

This project implements ray marching algorithms using WebGL shaders to visualize different mathematical surfaces and geometric spaces in real-time. By leveraging the power of fragment shaders, the application can render complex mathematical structures with high performance.

### Key Features

- **Multiple Geometry Types**: Explore various mathematical surfaces including translation surfaces, mirror rooms, L-shapes, and more
- **Interactive Camera**: Navigate through the generated spaces using intuitive camera controls
- **Real-time Visualization**: Experience smooth, real-time rendering of complex geometries
- **Teleportation System**: Seamlessly move between connected spaces
- **Floor Plan View**: View your current position with an overhead map
- **Responsive Design**: Adaptable to different screen sizes with resolution controls

![Floor Plan Example](placeholder-for-floor-plan.png)

## Getting Started

### Prerequisites

- Node.js (for building the project)
- A modern web browser with WebGL support

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/RayMarchingFlatSurfaces.git
```

2. Navigate to the project directory:
```bash
cd RayMarchingFlatSurfaces
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

The application will open automatically in your default browser.

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory and can be deployed to any static web server.

To preview the production build locally:

```bash
npm run preview
```

## How It Works

![Ray Marching Visualization](placeholder-for-ray-marching-diagram.png)

The application uses ray marching techniques implemented through fragment shaders to render complex geometries:

1. **Ray Casting**: From each pixel, the algorithm casts a ray into the scene
2. **Distance Calculation**: The shader computes the minimum distance to any surface in the scene
3. **Marching**: The algorithm "marches" along the ray by the calculated distance
4. **Iteration**: Steps 2 and 3 are repeated until a surface is hit or a maximum number of steps is reached
5. **Shading**: Once a surface is hit, the shader computes lighting and color information

For flat surfaces and translation/mirror spaces, this method allows for accurate and efficient rendering of the mathematical structures.

## Controls

- **WASD**: Move the camera forward, left, backward, and right
- **Q/E**: Move the camera up/down
- **Mouse**: Look around
- **Teleport Toggle**: Enable/disable teleportation between connected spaces

## Implemented Geometries

- **Basic Square Room**: Simple square room for demonstration purposes
- **Double Pentagon (Mirror)**: Pentagon surface with mirror reflections
- **Double Pentagon (Translation)**: Pentagon surface with translation mapping
- **L-shape**: L-shaped domain with different boundary conditions
- **L-unified**: L-shaped domain with unified boundary transformations

## Adding New Geometries

To add a new geometry:

1. Create a new fragment shader in the `shader/` directory
2. Define the distance function and boundary conditions
3. Add the geometry information to the `geometries/manifest.json` file

## Future Improvements

- [ ] Additional surface types (hexagon, octagon, etc.)
- [ ] Dynamic lighting conditions
- [ ] Enhanced boundary visualizations
- [ ] Performance optimizations for complex geometries
- [ ] Mobile touch controls support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This project is a refactored and improved version of the original work at [HEGL Lab](https://github.com/hegl-lab/Independent-SS22-Raymarching-Flat-Surfaces).

Original contributors:
- Fabian Lander
- Mara-Eliana Popescu
- Diaaeldin Taha

Current maintainers:
- Fabian Lander