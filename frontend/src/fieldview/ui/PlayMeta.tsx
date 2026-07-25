// Play name/description plus the import/export controls. Metadata comes
// from an untrusted file on the import path, so it is rendered as text
// nodes only — never dangerouslySetInnerHTML — and length-capped at the
// boundary in play/validate.ts.

import { useRef } from "react";
import { MAX_PLAY_DESCRIPTION_LENGTH, MAX_PLAY_NAME_LENGTH } from "../play/format";

interface PlayMetaProps {
  name: string;
  description: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
}

export function PlayMeta({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onExport,
  onImportFile,
}: PlayMetaProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex w-full flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Play name</span>
        <input
          type="text"
          value={name}
          maxLength={MAX_PLAY_NAME_LENGTH}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-56 border border-zinc-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Description</span>
        <input
          type="text"
          value={description}
          maxLength={MAX_PLAY_DESCRIPTION_LENGTH}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full border border-zinc-300 px-2 py-1 text-sm"
        />
      </label>

      <button
        type="button"
        onClick={onExport}
        className="border border-film-accentPink px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-film-accentPink hover:bg-film-accentPink hover:text-white"
      >
        Export play
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="border border-zinc-400 px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-zinc-700 hover:border-film-accentPink hover:text-film-accentPink"
      >
        Import play
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        aria-label="Import play file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
