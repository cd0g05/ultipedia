// Privacy-friendly page analytics loader (Plausible/Umami). No-ops unless a
// domain/src is configured via env, so dev and tests stay clean. Custom funnel
// events still flow through api/client.ts -> the backend (next to submissions).

export function initAnalytics(): void {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  const src =
    (import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined) ??
    "https://plausible.io/js/script.js";
  if (!domain || typeof document === "undefined") return;
  if (document.querySelector(`script[data-domain="${domain}"]`)) return;
  const s = document.createElement("script");
  s.defer = true;
  s.setAttribute("data-domain", domain);
  s.src = src;
  document.head.appendChild(s);
}
