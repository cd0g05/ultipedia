export type Mode = "explore" | "watch" | "build";

export const MODES: { mode: Mode; label: string; soon?: boolean }[] = [
  { mode: "watch", label: "Watch" },
  { mode: "explore", label: "Explore" },
  { mode: "build", label: "Build", soon: true },
];

export const MODE_LABEL: Record<Mode, string> = {
  explore: "Explore",
  watch: "Watch",
  build: "Build",
};
