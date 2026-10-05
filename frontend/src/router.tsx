// Top-level route tree. The encyclopedia owns "/" (Layout shell wrapping
// home, search, the five section pages, entry detail, and the 404 catch-all);
// the existing intake app is mounted at /contribute/*.
// `routes` is exported separately so tests can drive it with MemoryRouter.

import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from "react-router-dom";
import IntakeApp from "./intake/App";
import { Layout } from "./encyclopedia/components/Layout";
import { Home } from "./encyclopedia/pages/Home";
import { Search } from "./encyclopedia/pages/Search";
import { Section } from "./encyclopedia/pages/Section";
import { EntryDetail } from "./encyclopedia/pages/EntryDetail";
import { About, Contact, Privacy } from "./encyclopedia/pages/InfoPages";
import { NotFound } from "./encyclopedia/pages/NotFound";
import { FieldViewApp } from "./fieldview/ui/app/FieldViewApp";
import { Explore } from "./fieldview/pages/Explore";
import { Watch } from "./fieldview/pages/Watch";
import { Build } from "./fieldview/pages/Build";

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/search", element: <Search /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      { path: "/privacy", element: <Privacy /> },
      // The product was shipped at /field-view and the client has that URL.
      // Redirect rather than drop it: `replace` keeps the old path out of
      // history, so Back from Field View does not bounce through it.
      { path: "/field-view", element: <Navigate to="/fieldview" replace /> },
      // One Section/EntryDetail component serves all five sections (Template
      // Method); Section itself 404s unknown segments. Explicit static routes
      // (/search, /fieldview above) outrank these dynamic segments.
      { path: "/:section", element: <Section /> },
      { path: "/:section/:slug", element: <EntryDetail /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  // Field View is a full-viewport app: a SIBLING of Layout, not a child
  // (fieldview-ui-rework ADR-29), so the site header/footer do not wrap it —
  // its desktop frame renders the header itself.
  {
    path: "/fieldview",
    element: <FieldViewApp />,
    children: [
      { index: true, element: <Navigate to="/fieldview/explore" replace /> },
      { path: "explore", element: <Explore /> },
      { path: "watch", element: <Watch /> },
      { path: "build", element: <Build /> },
    ],
  },
  { path: "/contribute/*", element: <IntakeApp /> },
];

export function Router() {
  return <RouterProvider router={createBrowserRouter(routes)} />;
}
