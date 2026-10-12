import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Syllaboss — The Modern University Study Platform" },
      {
        name: "description",
        content:
          "Syllaboss is an all-in-one academic companion for iOS, Android and desktop. Verified past questions, course summaries, Boss AI LaTeX derivations, and cashable student rewards.",
      },
      { property: "og:title", content: "Syllaboss — Study With Direction" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HomePage,
});
