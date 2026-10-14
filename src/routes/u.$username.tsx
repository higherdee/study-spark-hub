import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/u/$username")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/scholar/$username",
      params: { username: params.username },
    });
  },
});

