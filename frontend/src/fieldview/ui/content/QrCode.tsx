// A QR code drawn as SVG from the module matrix (qrcode-generator). Pure
// rendering: no canvas, no network. A link too long for a QR code (the
// capacity is a few KB) gets a plain message instead of a broken image, because
// the link and the file still work.

import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { QR_TOKENS } from "../../render/tokens";

export const QR_TOO_LONG = "This play is too long for a QR code — use the link or the file instead.";

const QUIET_ZONE = 4; // modules of white border the spec asks for

export function buildQr(text: string): { size: number; path: string } | null {
  try {
    // Type 0 = smallest version that fits; "L" = the most capacity.
    const qr = qrcode(0, "L");
    qr.addData(text, "Byte");
    qr.make();
    const n = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < n; r += 1) {
      let run = -1;
      for (let c = 0; c <= n; c += 1) {
        const dark = c < n && qr.isDark(r, c);
        if (dark && run < 0) run = c;
        if (!dark && run >= 0) {
          path += `M${run + QUIET_ZONE} ${r + QUIET_ZONE}h${c - run}v1h${run - c}z`;
          run = -1;
        }
      }
    }
    return { size: n + QUIET_ZONE * 2, path };
  } catch {
    return null;
  }
}

export function QrCode({ text, className }: { text: string; className?: string }) {
  const qr = useMemo(() => buildQr(text), [text]);
  if (!qr) {
    return (
      <p role="status" data-testid="qr-fallback" className="text-sm text-zinc-600">
        {QR_TOO_LONG}
      </p>
    );
  }
  return (
    <svg
      role="img"
      aria-label="QR code for the play link"
      data-testid="qr"
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={qr.size} height={qr.size} fill={QR_TOKENS.light} />
      <path d={qr.path} fill={QR_TOKENS.dark} />
    </svg>
  );
}
