import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  if (mode === "production" && !process.env.VITE_API_URL?.trim()) {
    console.warn(
      "\n⚠️  [support-client] VITE_API_URL is not set. Production builds will call /api on support.bugchase.com and get 404.\n" +
        "   Set VITE_API_URL in Vercel → Environment Variables (e.g. https://YOUR-SERVER.vercel.app/api) and redeploy.\n"
    );
  }

  return {
  server: {
    host: true,
    port: 3101,
    proxy: {
      // Support portal talks to the MAIN BugChase backend.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
