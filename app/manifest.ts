import type { MetadataRoute } from "next";

// Served by Next at /manifest.webmanifest. Makes the app installable ("Add to
// Home Screen") and packageable as an Android APK via a Trusted Web Activity.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FUTEX",
    short_name: "FUTEX",
    description: "FUTEX Energy Solution — Future-Ready Power Solutions",
    // The app launches at the login screen (logged-in users are redirected on
    // to their dashboard); scope stays site-wide so all navigation is in-app.
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a4da2",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
