import { useState } from "react";
import IntakeApp from "./intake/App";
import { Home } from "./Home";

type View = "home" | "intake";

export default function App() {
  const [view, setView] = useState<View>("home");

  if (view === "intake") return <IntakeApp />;
  return <Home onStart={() => setView("intake")} />;
}
