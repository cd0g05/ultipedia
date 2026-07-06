// Media embedding (Adapter pattern per tech-design): one MediaEmbed interface,
// with per-provider adapters normalizing "give me an embeddable element" so
// EntryDetail never branches on provider. Video iframes use native lazy
// loading (Proxy note: not constructed eagerly above the fold).

import type { MediaItem } from "../types";

function youTubeEmbedUrl(url: string): string {
  // Accept watch URLs, share URLs, and already-embed URLs.
  const idMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/
  );
  return idMatch
    ? `https://www.youtube.com/embed/${idMatch[1]}`
    : url;
}

function vimeoEmbedUrl(url: string): string {
  const idMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return idMatch ? `https://player.vimeo.com/video/${idMatch[1]}` : url;
}

function ImageAdapter({ media }: { media: MediaItem }) {
  return (
    <img
      src={media.url}
      alt={media.caption ?? ""}
      loading="lazy"
      className="h-full w-full object-cover"
    />
  );
}

function VideoAdapter({ media, src }: { media: MediaItem; src: string }) {
  return (
    <iframe
      src={src}
      title={media.caption ?? "Video"}
      loading="lazy"
      allowFullScreen
      className="h-full w-full"
    />
  );
}

export function MediaEmbed({ media }: { media: MediaItem }) {
  return (
    <figure className="border border-zinc-300 bg-white">
      <div className="aspect-video bg-zinc-100">
        {media.type === "youtube" ? (
          <VideoAdapter media={media} src={youTubeEmbedUrl(media.url)} />
        ) : media.type === "vimeo" ? (
          <VideoAdapter media={media} src={vimeoEmbedUrl(media.url)} />
        ) : (
          <ImageAdapter media={media} />
        )}
      </div>
      {media.caption && (
        <figcaption className="border-t border-zinc-200 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          {media.caption}
        </figcaption>
      )}
    </figure>
  );
}
