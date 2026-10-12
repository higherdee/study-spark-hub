import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes fresh data — makes page switching instantaneous
        gcTime: 1000 * 60 * 30, // 30 minutes in memory cache
        refetchOnWindowFocus: false, // Prevents layout flashes on tab refocus
        refetchOnReconnect: "always",
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent", // Preloads routes on hover/touch before user click lands
    defaultPreloadDelay: 40,
    defaultPreloadStaleTime: 1000 * 60 * 5,
  });

  return router;
};
