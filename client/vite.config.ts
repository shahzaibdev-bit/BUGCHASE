import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    cssTarget: ['safari13'],
  },
  server: {
    host: true, // Listen on all addresses
    allowedHosts: true, // Allow localtunnel domains
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Note: the browser no longer talks to the Python KYC engine directly.
      // The CNIC + selfie are sent to /api/users/kyc-verify on Express, which
      // uploads to Cloudinary and forwards URLs to the engine internally.
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'iOS >= 12'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
