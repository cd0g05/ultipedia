// Compact only: the setup list as a right-hand slide-over.

import type { CuratedSetup } from "../../scene/presets";
import { SetupList } from "../content/SetupList";
import { SlideOver } from "./SlideOver";

export interface SetupSlideOverProps {
  open: boolean;
  onClose: () => void;
  setups: CuratedSetup[];
  activeIndex: number;
  custom: boolean;
  onSelect: (index: number) => void;
}

export function SetupSlideOver({ open, onClose, setups, activeIndex, custom, onSelect }: SetupSlideOverProps) {
  return (
    <SlideOver open={open} onClose={onClose} title="Setup">
      <SetupList
        setups={setups}
        activeIndex={activeIndex}
        custom={custom}
        onSelect={(i) => {
          onSelect(i);
          onClose();
        }}
      />
    </SlideOver>
  );
}
