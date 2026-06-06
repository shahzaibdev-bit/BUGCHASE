import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import path from "path";

const enableLegacyBuild =
  process.env.VITE_LEGACY_BUILD === "true" ||
  process.env.npm_lifecycle_event === "build:legacy";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    cssTarget: ['safari13'],
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("recharts")) {
            return "charts-vendor";
          }
          if (id.includes("country-state-city")) {
            return "geo-vendor";
          }
          if (id.includes("@tiptap")) {
            return "editor-vendor";
          }
          if (id.includes("react-icons") || id.includes("lucide-react")) {
            return "icons-vendor";
          }
          if (id.includes("@react-pdf") || id.includes("jspdf") || id.includes("html2canvas")) {
            return "export-vendor";
          }
          if (id.includes("@stripe")) {
            return "payments-vendor";
          }
          if (id.includes("react-markdown") || id.includes("remark-") || id.includes("rehype-")) {
            return "markdown-vendor";
          }
          if (id.includes("motion") || id.includes("gsap") || id.includes("ogl")) {
            return "animation-vendor";
          }

          return undefined;
        },
      },
    },
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
    ...(enableLegacyBuild
      ? [
          legacy({
            targets: ['defaults', 'iOS >= 12'],
            modernPolyfills: true,
            renderLegacyChunks: true,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
