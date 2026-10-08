import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const platform = (url.searchParams.get("platform") || "android").toLowerCase();

        let filename = "syllaboss.apk";
        let downloadName = "Syllaboss.apk";
        let contentType = "application/vnd.android.package-archive";

        if (platform === "windows" || platform === "msi" || platform === "exe") {
          filename = "syllaboss-setup.msi";
          downloadName = "Syllaboss-Setup.msi";
          contentType = "application/x-msi";
        } else if (platform === "linux" || platform === "appimage") {
          filename = "syllaboss.AppImage";
          downloadName = "Syllaboss.AppImage";
          contentType = "application/octet-stream";
        }

        const remoteUrl =
          platform === "windows" || platform === "exe"
            ? process.env["EXE_DOWNLOAD_URL"] || process.env["VITE_EXE_URL"]
            : platform === "linux" || platform === "appimage"
            ? process.env["LINUX_DOWNLOAD_URL"] || process.env["VITE_LINUX_URL"]
            : process.env["APK_DOWNLOAD_URL"] || process.env["VITE_APK_URL"];

        if (remoteUrl) {
          return Response.redirect(remoteUrl, 302);
        }

        const targetUrl = new URL(`/downloads/${filename}`, request.url).toString();
        return new Response(null, {
          status: 302,
          headers: {
            Location: targetUrl,
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${downloadName}"`,
          },
        });
      },
    },
  },
});
