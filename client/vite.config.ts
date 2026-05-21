import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
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
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
