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
import { useT } from '@/i18n';

export default function App() {
  const { state, dismissPicker, showPicker } = useProjectBootstrap();
  const [welcomed, setWelcomed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rail, setRail] = useState<RailPanel>('layers');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [stripOpen, setStripOpen] = useState(true);
  const { t } = useT();
  useKeyboardShortcuts({ onHelp: () => setHelpOpen((v) => !v) });
  useAutosave();

  if (!welcomed) {
    return <WelcomeScreen onEnter={() => setWelcomed(true)} />;
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-dim)]">
        <div className="text-[12px] uppercase tracking-wider">{t.app_loading}</div>
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
          {t.app_showScenes}
        </button>
      )}
      {state.kind === 'pick' && <ProjectPicker onClose={dismissPicker} />}
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const { t } = useT();

  const groups: { title: string; items: [string, string][] }[] = [
    {
      title: t.shortcuts_selection,
      items: [
        ['Click', t.shortcut_select],
        ['Shift + Click', t.shortcut_addToSelection],
        ['Drag empty', t.shortcut_marquee],
        ['Esc', t.shortcut_clearSelection],
      ],
    },
    {
      title: t.shortcuts_edit,
      items: [
        ['Delete / Backspace', t.shortcut_deleteSelection],
        ['Ctrl/⌘ + D', t.shortcut_duplicate],
        ['Ctrl/⌘ + C / V', t.shortcut_copyPaste],
        ['Arrows', t.shortcut_nudge10],
        ['Shift + Arrows', t.shortcut_nudge50],
      ],
    },
    {
      title: t.shortcuts_history,
      items: [
        ['Ctrl/⌘ + Z', t.shortcut_undo],
        ['Ctrl/⌘ + Shift + Z', t.shortcut_redo],
      ],
    },
    {
      title: t.shortcuts_view,
      items: [
        ['Ctrl/⌘ + Wheel', t.shortcut_zoom],
        ['Wheel', t.shortcut_pan],
        ['Hold Space + Drag', t.shortcut_pan2],
        ['1 / 2', t.shortcut_mode],
        ['?', t.shortcut_help],
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
            {t.shortcuts_title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
          >
            ×
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
