export default {
    base: process.env.NODE_ENV === 'production'?'/RayMarchingFlatSurfaces/' : '',
    build: {
       outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,  // Set to true if you need source maps
    },
    server: {
      open: true,  // Automatically open browser on dev server start
    },
  }