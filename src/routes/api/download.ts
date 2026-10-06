import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const platform = (url.searchParams.get("platform") || "android").toLowerCase();

        if (platform === "android" || platform === "apk") {
          const remoteUrl = process.env['APK_DOWNLOAD_URL'] || process.env['VITE_APK_URL'];
          if (remoteUrl) {
            return Response.redirect(remoteUrl, 302);
          }
          // Redirect to Android install flow to prevent downloading an empty/404 HTML file
          return Response.redirect("/?install=android", 302);
        }

        if (platform === "windows" || platform === "exe") {
          const remoteUrl = process.env['EXE_DOWNLOAD_URL'] || process.env['VITE_EXE_URL'];
          if (remoteUrl) {
            return Response.redirect(remoteUrl, 302);
          }
          return Response.redirect("/downloads/syllaboss-setup.exe", 302);
        }

        if (platform === "linux" || platform === "appimage") {
          const remoteUrl = process.env['LINUX_DOWNLOAD_URL'] || process.env['VITE_LINUX_URL'];
          if (remoteUrl) {
            return Response.redirect(remoteUrl, 302);
          }
          return Response.redirect("/downloads/syllaboss.AppImage", 302);
        }

        return Response.redirect("/downloads/syllaboss-setup.exe", 302);
      },
    },
  },
});
