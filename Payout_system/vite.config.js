import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Add specific conditions for Firebase module resolution
    conditions: ["import", "module", "browser", "default"],
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning limit
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Handle Firebase modules with special care
          if (id.includes("node_modules/firebase")) {
            return "vendor-firebase";
          }
          // Handle React and related libraries
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router-dom")
          ) {
            return "vendor-react";
          }
          // Split PDF libraries into separate chunks
          if (id.includes("node_modules/@react-pdf")) {
            return "vendor-react-pdf";
          }
          if (id.includes("node_modules/jspdf")) {
            return "vendor-jspdf";
          }
          // Split out HTML to canvas which is used by PDF generation
          if (id.includes("node_modules/html2canvas")) {
            return "vendor-html2canvas";
          }
          // UI libraries
          if (
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/react-icons") ||
            id.includes("node_modules/react-slick") ||
            id.includes("node_modules/slick-carousel")
          ) {
            return "vendor-ui";
          }
          // Utility libraries
          if (id.includes("node_modules/papaparse")) {
            return "vendor-utils";
          }
        },
      },
    },
  },
});
