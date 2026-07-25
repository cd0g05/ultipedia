// Top-level route tree. The encyclopedia owns "/" (Layout shell wrapping
// home, search, the five section pages, entry detail, and the 404 catch-all);
// the existing intake app is mounted at /contribute/*.
// `routes` is exported separately so tests can drive it with MemoryRouter.

import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import IntakeApp from "./intake/App";
import { Layout } from "./encyclopedia/components/Layout";
import { Home } from "./encyclopedia/pages/Home";
import { Search } from "./encyclopedia/pages/Search";
import { Section } from "./encyclopedia/pages/Section";
import { EntryDetail } from "./encyclopedia/pages/EntryDetail";
import { About, Contact, Privacy } from "./encyclopedia/pages/InfoPages";
import { NotFound } from "./encyclopedia/pages/NotFound";
import { Whiteboard } from "./fieldview/pages/Whiteboard";
import { Designer } from "./fieldview/pages/Designer";

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/search", element: <Search /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/field-view", element: <Whiteboard /> },
      { path: "/field-view/designer", element: <Designer /> },
      // One Section/EntryDetail component serves all five sections (Template
      // Method); Section itself 404s unknown segments. Explicit static routes
      // (/search, /field-view above) outrank these dynamic segments.
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
