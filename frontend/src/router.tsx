// Top-level route tree. The encyclopedia owns "/" (placeholder shell until the
// browse partition lands); the existing intake app is mounted at /contribute/*.
// `routes` is exported separately so tests can drive it with createMemoryRouter.

import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import IntakeApp from "./intake/App";
import { Home } from "./Home";

export const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "/contribute/*", element: <IntakeApp /> },
];

export function Router() {
  return <RouterProvider router={createBrowserRouter(routes)} />;
}
