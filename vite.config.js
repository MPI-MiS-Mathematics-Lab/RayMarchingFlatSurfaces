export default {
  base: process.env.NODE_ENV === 'production' ? '/apps/raymarchingflatsurfacesapp/' : '',
    build: {
       outDir: 'apps/raymarchingflatsurfacesapp',
      assetsDir: 'assets',
      sourcemap: false,  // Set to true if you need source maps
    },
    server: {
      open: true,  // Automatically open browser on dev server start
    },
  }
