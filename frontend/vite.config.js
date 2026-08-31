import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["prospect-legends-logo.png", "apple-touch-icon.png"],
      manifest: {
        name: "Prospect Legends",
        short_name: "PL",
        description: "Youth baseball digital trading cards — create, collect, trade and sell",
        theme_color: "#C9A84C",
        background_color: "#0A0A0A",
        display: "standalone",
        orientation: "portrait",
        start_url: "https://prospectlegends.com/",
        scope: "https://prospectlegends.com/",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/api/],
        additionalManifestEntries: [
          { url: "/offline.html", revision: "1" },
          {
            url: "/prospect-legends-logo.png",
            revision: "1",
          },
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/player-card-backend\.onrender\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/pub-cb37d7e679bb4b33ac276ef1c3cfeb96\.r2\.dev\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "r2-images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
