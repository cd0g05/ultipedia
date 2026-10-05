// Sharing a play (fieldview-build ADR-42): the whole play travels in the link.
//
//   code = base64url( deflate( JSON(play) ) )          link = <origin>/fieldview/watch#p=<code>
//
// The code lives in the URL FRAGMENT, which the browser never sends to a
// server, so a play shared this way touches no backend and needs no account.
// A link is a snapshot: changing the play later does not change a link already
// sent.
//
// Everything decoded here is untrusted (a pasted link, a scanned QR, a file), so
// decoding is bounded at every step — code length, compressed size, DECOMPRESSED
// size (a zip bomb inflates to megabytes from a few KB) — and the result goes
// through the v3 validator before it can become a Play.

import { Inflate, deflateSync, strFromU8, strToU8 } from "fflate";
import type { Play } from "./format";
import { PlayValidationError, validatePlay } from "./validate";

// A 30-frame play is a few KB compressed; this leaves generous headroom while
// keeping a pasted link from being a denial-of-service. (~12 KB of base64url.)
export const MAX_CODE_LENGTH = 12_000;
// The most JSON a valid play can be (30 frames × 14 players × two coordinates
// plus names is far below this).
export const MAX_INFLATED_BYTES = 64 * 1024;

export const SHARE_PATH = "/fieldview/watch";
export const SHARE_PARAM = "p";

export const BAD_LINK_MESSAGE = "This link isn't a Field View play.";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(code)) throw new PlayValidationError(BAD_LINK_MESSAGE);
  const padded = code.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((code.length + 3) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new PlayValidationError(BAD_LINK_MESSAGE);
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

// Inflate with a hard ceiling on the output: stops as soon as the decompressed
// size passes MAX_INFLATED_BYTES instead of materialising a bomb.
function boundedInflate(data: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let tooBig = false;
  const inflater = new Inflate((chunk) => {
    total += chunk.length;
    if (total > MAX_INFLATED_BYTES) {
      tooBig = true;
      return;
    }
    chunks.push(chunk);
  });
  try {
    // Small slices, so one slice cannot expand far past the ceiling before the
    // check above runs.
    const SLICE = 256;
    for (let i = 0; i < data.length && !tooBig; i += SLICE) {
      inflater.push(data.subarray(i, i + SLICE), i + SLICE >= data.length);
    }
  } catch {
    throw new PlayValidationError(BAD_LINK_MESSAGE);
  }
  if (tooBig) throw new PlayValidationError("This play is too large to open.");
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export function encodePlay(play: Play): string {
  return toBase64Url(deflateSync(strToU8(JSON.stringify(play)), { level: 9 }));
}

// Throws PlayValidationError with a message fit to show a person.
export function decodePlay(code: string): Play {
  const trimmed = code.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CODE_LENGTH) {
    throw new PlayValidationError(trimmed.length === 0 ? BAD_LINK_MESSAGE : "This play is too large to open.");
  }
  const json = strFromU8(boundedInflate(fromBase64Url(trimmed)));
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new PlayValidationError(BAD_LINK_MESSAGE);
  }
  return validatePlay(parsed);
}

export function shareLink(play: Play, origin: string): string {
  return `${origin}${SHARE_PATH}#${SHARE_PARAM}=${encodePlay(play)}`;
}

// The code in a location hash ("#p=…"), or null when there is none.
export function codeFromHash(hash: string): string | null {
  const m = /^#?p=(.*)$/.exec(hash);
  return m ? m[1] : null;
}

// ── files ───────────────────────────────────────────────────────────────────

export const FILE_EXTENSION = ".fieldview.json";

export function playToFileText(play: Play): string {
  return JSON.stringify(play, null, 2);
}

export function fileNameFor(play: Play): string {
  const slug = play.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${slug || "play"}${FILE_EXTENSION}`;
}

// A play from a file's text, through the same validator as a link.
export function playFromFileText(text: string): Play {
  if (text.length > MAX_INFLATED_BYTES) throw new PlayValidationError("That file is too large to be a Field View play.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new PlayValidationError("That file isn't a Field View play.");
  }
  try {
    return validatePlay(parsed);
  } catch (error) {
    if (error instanceof PlayValidationError) {
      throw new PlayValidationError(`That file isn't a Field View play. ${error.message}`);
    }
    throw error;
  }
}
