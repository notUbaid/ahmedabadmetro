import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "script",
      includeAssets: [
        "favicon.ico",
        "blueLineRoutes.geojson",
        "metroRoutes.geojson",
        "yellowLineRoutes.geojson",
      ],
      manifest: {
        id: "/",
        name: "AhmMetro",
        short_name: "AhmMetro",
        description: "Real-time AhmMetro route planner with live train tracking",
        theme_color: "#0066CC",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "en-IN",
        dir: "ltr",
        categories: ["travel", "navigation", "transportation"],
        screenshots: [
          {
            src: "/og-image.png",
            sizes: "1200x630",
            type: "image/png",
            form_factor: "wide"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "narrow"
          }
        ],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Plan Route",
            short_name: "Route",
            description: "Plan your metro journey",
            url: "/?action=route",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
        file_handlers: [{ action: "/", accept: { "application/json": [".metro"] } }],
        launch_handler: { client_mode: ["navigate-existing", "auto"] },
        protocol_handlers: [{ protocol: "web+metro", url: "/?route=%s" }],
        prefer_related_applications: false,
        related_applications: [],
        share_target: { action: "/share", method: "GET", params: { title: "title", text: "text", url: "url" } },
        iarc_rating_id: "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7",
        widgets: [{ name: "Metro Route", description: "Quick route", tag: "metro-widget", ms_ac_filepath: "/" }],
        edge_side_panel: { preferred_width: 400 },
        note_taking: { new_note_url: "/" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,geojson,json}"],
        // og-image/feature-graphic are link-preview assets — no in-app code path needs them
        globIgnores: ["**/og-image*", "**/feature-graphic*"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.basemaps\.cartocdn\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "carto-tiles",
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Workbox matches against the absolute URL — same-origin /api
            // requests must be matched as a substring, not anchored with ^.
            urlPattern: /\/api\/nominatim|^https:\/\/nominatim\.openstreetmap\.org\//i,
            handler: "NetworkFirst",
            options: {
              cacheName: "geocoding-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.geojson"],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "lucide-react"],
          leaflet: ["leaflet"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover"],
          data: ["./src/data/metroData.ts", "./src/data/timetable.ts"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
}));
