import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const platform = (url.searchParams.get("platform") || "android").toLowerCase();

        if (!["android", "apk", "windows", "msi", "exe", "linux", "appimage"].includes(platform)) {
          return Response.json({ error: "Unsupported platform." }, { status: 400 });
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

        return Response.json(
          { error: "No packaged installer is currently available. Use the browser installation option instead." },
          { status: 404 }
        );
      },
    },
  },
});
