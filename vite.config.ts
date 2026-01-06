import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // SPA fallback plugin - serves index.html for all routes
    {
      name: "spa-fallback",
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            // Skip static assets and API routes
            if (
              req.url?.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
              req.url?.startsWith("/api/") ||
              req.url?.startsWith("/@vite/") ||
              req.url?.startsWith("/node_modules/")
            ) {
              return next();
            }

            // For all other routes, rewrite to index.html
            if (req.url && !req.url.includes(".")) {
              req.url = "/index.html";
            }
            next();
          });
        };
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
