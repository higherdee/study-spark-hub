import { createFileRoute } from "@tanstack/react-router";
import { NativeWelcome } from "@/components/native-web/screens";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syllaboss — Your study space" },
      {
        name: "description",
        content:
          "Your courses, in good company. Find materials, study with Boss AI and learn with your peers.",
      },
    ],
  }),
  component: NativeWelcome,
});
