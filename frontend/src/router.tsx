// Top-level route tree. The encyclopedia owns "/" (Layout shell wrapping
// home, the five section pages, entry detail, and the 404 catch-all); the
// existing intake app is mounted at /contribute/*.
// `routes` is exported separately so tests can drive it with MemoryRouter.

import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import IntakeApp from "./intake/App";
import { Layout } from "./encyclopedia/components/Layout";
import { Home } from "./encyclopedia/pages/Home";
import { Section } from "./encyclopedia/pages/Section";
import { EntryDetail } from "./encyclopedia/pages/EntryDetail";
import { NotFound } from "./encyclopedia/pages/NotFound";

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      // One Section/EntryDetail component serves all five sections (Template
      // Method); Section itself 404s unknown segments. Explicit static routes
      // (e.g. Partition 4's /search) outrank these dynamic segments.
      { path: "/:section", element: <Section /> },
      { path: "/:section/:slug", element: <EntryDetail /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  { path: "/contribute/*", element: <IntakeApp /> },
];

export function Router() {
  return <RouterProvider router={createBrowserRouter(routes)} />;
}
