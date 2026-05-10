import { useState } from 'react';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { TopBar } from '@/components/TopBar';
import { SidebarRail, type RailPanel } from '@/components/SidebarRail';
import { Viewport } from '@/components/Viewport';
import { InspectorRail } from '@/components/InspectorRail';
import { SceneStrip } from '@/components/SceneStrip';
import { ProjectPicker } from '@/components/ProjectPicker';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutosave } from '@/hooks/useAutosave';
import { useProjectBootstrap } from '@/hooks/useProjectBootstrap';

export default function App() {
  const { state, dismissPicker, showPicker } = useProjectBootstrap();
  const [welcomed, setWelcomed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rail, setRail] = useState<RailPanel>('layers');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [stripOpen, setStripOpen] = useState(true);
  useKeyboardShortcuts({ onHelp: () => setHelpOpen((v) => !v) });
  useAutosave();

  if (!welcomed) {
    return <WelcomeScreen onEnter={() => setWelcomed(true)} />;
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-dim)]">
        <div className="text-[12px] uppercase tracking-wider">Loading projectâ€¦</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <TopBar onOpenPicker={showPicker} onOpenHelp={() => setHelpOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <SidebarRail
          active={rail}
          onChange={(p) => {
            setRail(p);
            if (p) setInspectorOpen(true);
          }}
          panelsOpen={rail !== null || inspectorOpen}
          onToggleAll={() => {
            const anyOpen = rail !== null || inspectorOpen;
            setRail(anyOpen ? null : 'layers');
            setInspectorOpen(!anyOpen);
          }}
        />
        <Viewport />
        <InspectorRail open={inspectorOpen} />
      </div>
      {stripOpen ? (
        <SceneStrip onCollapse={() => setStripOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setStripOpen(true)}
          className="flex h-7 shrink-0 items-center justify-center border-t border-[var(--color-border)] bg-[var(--color-panel)] text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)]"
        >
          âŒƒ Show scenes
        </button>
      )}
      {state.kind === 'pick' && <ProjectPicker onClose={dismissPicker} />}
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const groups: { title: string; items: [string, string][] }[] = [
    {
      title: 'Selection',
      items: [
        ['Click', 'Select object'],
        ['Shift + Click', 'Add to selection'],
        ['Drag empty', 'Marquee select'],
        ['Esc', 'Clear selection'],
      ],
    },
    {
      title: 'Edit',
      items: [
        ['Delete / Backspace', 'Delete selection'],
        ['Ctrl/âŒ˜ + D', 'Duplicate'],
        ['Ctrl/âŒ˜ + C / V', 'Copy / paste'],
        ['Arrows', 'Nudge 10px'],
        ['Shift + Arrows', 'Nudge 50px'],
      ],
    },
    {
      title: 'History',
      items: [
        ['Ctrl/âŒ˜ + Z', 'Undo'],
        ['Ctrl/âŒ˜ + Shift + Z', 'Redo'],
      ],
    },
    {
      title: 'View',
      items: [
        ['Ctrl/âŒ˜ + Wheel', 'Zoom'],
        ['Wheel', 'Pan'],
        ['Hold Space + Drag', 'Pan'],
        ['1 / 2', '2D / 3D mode'],
        ['?', 'Toggle this help'],
      ],
    },
  ];
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[92vw] rounded-2xl border border-[var(--glass-border)] p-6"
        style={{
          background: 'var(--glass-float)',
          backdropFilter: 'var(--glass-blur-lg)',
          WebkitBackdropFilter: 'var(--glass-blur-lg)',
          boxShadow: 'var(--shadow-float-strong)',
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-[var(--color-text-strong)]">
            Keyboard shortcuts
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
          >
            Ã—
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
                {g.title}
              </div>
              <ul className="space-y-1.5">
                {g.items.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--color-text)]">{v}</span>
                    <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-panel-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-strong)]">
                      {k}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

