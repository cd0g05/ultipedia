// Grouped Built-in / Your presets list. One-click loading; save/rename/
// delete/export on user presets only (built-ins expose no such controls —
// ADR-9's "one registry, one flag" model means the *menu*, not the
// registry, decides what UI a preset gets).

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { PresetFile } from "../scene/presetFormat";

interface PresetMenuProps {
  presets: PresetFile[];
  onLoad: (preset: PresetFile) => void;
  onSaveCurrent: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onImportFile: (file: File) => void;
}

export function PresetMenu({
  presets,
  onLoad,
  onSaveCurrent,
  onRename,
  onDelete,
  onExport,
  onImportFile,
}: PresetMenuProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const builtins = presets.filter((p) => p.builtin);
  const userPresets = presets.filter((p) => !p.builtin);

  function handleSaveSubmit(e: FormEvent) {
    e.preventDefault();
    const name = saveName.trim();
    if (!name) return;
    onSaveCurrent(name);
    setSaveName("");
    setSaving(false);
  }

  function handleRenameSubmit(id: string, e: FormEvent) {
    e.preventDefault();
    const name = renameValue.trim();
    if (!name) return;
    onRename(id, name);
    setRenamingId(null);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImportFile(file);
    e.target.value = "";
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="border border-zinc-300 px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-zinc-700 hover:border-film-accentPink"
      >
        Presets
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 w-72 border border-zinc-300 bg-white p-3 shadow-lg">
          <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-500">Built-in</h2>
          <ul className="mb-3 mt-1">
            {builtins.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onLoad(p)}
                  className="w-full py-1 text-left text-sm text-zinc-800 hover:text-film-accentPink"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>

          <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-500">Your presets</h2>
          <ul className="mb-3 mt-1">
            {userPresets.length === 0 && <li className="text-sm text-zinc-400">None yet</li>}
            {userPresets.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-1">
                {renamingId === p.id ? (
                  <form onSubmit={(e) => handleRenameSubmit(p.id, e)} className="flex flex-1 gap-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full border border-zinc-300 px-1 text-sm"
                      aria-label={`Rename ${p.name}`}
                    />
                    <button type="submit" className="text-xs text-film-accentPink">
                      Save
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onLoad(p)}
                      className="flex-1 text-left text-sm text-zinc-800 hover:text-film-accentPink"
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(p.id);
                        setRenameValue(p.name);
                      }}
                      aria-label={`Rename ${p.name}`}
                      className="text-xs text-zinc-400 hover:text-zinc-700"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => onExport(p.id)}
                      aria-label={`Export ${p.name}`}
                      className="text-xs text-zinc-400 hover:text-zinc-700"
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p.id)}
                      aria-label={`Delete ${p.name}`}
                      className="text-xs text-zinc-400 hover:text-film-accentPink"
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          {saving ? (
            <form onSubmit={handleSaveSubmit} className="flex gap-1">
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Preset name"
                aria-label="New preset name"
                className="w-full border border-zinc-300 px-1 text-sm"
              />
              <button type="submit" className="text-xs text-film-accentPink">
                Save
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSaving(true)}
              className="w-full border border-zinc-300 py-1 text-xs uppercase text-zinc-600 hover:border-film-accentPink"
            >
              Save current as preset
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 w-full border border-zinc-300 py-1 text-xs uppercase text-zinc-600 hover:border-film-accentPink"
          >
            Import preset
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Import preset file"
          />
        </div>
      )}
    </div>
  );
}
