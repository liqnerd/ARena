import { useEditor } from '@/store/editor';
import { ExportMenu } from '@/components/ExportMenu';

export function TopBar({
  onOpenPicker,
  onOpenHelp,
}: {
  onOpenPicker: () => void;
  onOpenHelp: () => void;
}) {
  const projectName = useEditor((s) => s.project.name);
  const renameProject = useEditor((s) => s.renameProject);
  const saveState = useEditor((s) => s.saveState);
  const mode = useEditor((s) => s.view.mode);
  const setMode = useEditor((s) => s.setViewMode);
  const showGrid = useEditor((s) => s.view.showGrid);
  const showSegments = useEditor((s) => s.view.showSegments);
  const showSafeZone = useEditor((s) => s.view.showSafeZone);
  const toggleGrid = useEditor((s) => s.toggleGrid);
  const toggleSegments = useEditor((s) => s.toggleSegments);
  const toggleSafeZone = useEditor((s) => s.toggleSafeZone);
  const previewMode = useEditor((s) => s.previewMode);
  const setPreviewMode = useEditor((s) => s.setPreviewMode);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] px-4">
      {/* LEFT: logo + project name */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenPicker}
          title="Open project picker"
          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-[var(--color-panel-2)]"
        >
          <img src="/a.svg" alt="ARena" className="h-[18px] w-[17px]" />
        </button>
        <input
          value={projectName}
          onChange={(e) => renameProject(e.target.value)}
          className="bg-transparent text-[13px] font-medium text-[var(--color-accent)] outline-none placeholder:text-[var(--color-text-dim)] focus:text-[var(--color-accent-hover)]"
          placeholder="Untitled project"
          style={{ minWidth: '160px' }}
        />
      </div>

      {/* CENTER: mode + view toggles */}
      <div className="flex items-center gap-2">
        <PillGroup>
          <PillItem active={mode === '2d'} onClick={() => setMode('2d')}>
            2D
          </PillItem>
          <PillItem active={mode === '3d'} onClick={() => setMode('3d')}>
            3D
          </PillItem>
        </PillGroup>
        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
        <PillGroup>
          <PillItem active={showGrid} onClick={toggleGrid}>
            Grid
          </PillItem>
          <PillItem active={showSegments} onClick={toggleSegments}>
            Segments
          </PillItem>
          <PillItem active={showSafeZone} onClick={toggleSafeZone}>
            Safe zone
          </PillItem>
        </PillGroup>
      </div>

      {/* RIGHT: status, help, preview, export */}
      <div className="flex items-center gap-2">
        <SaveBadge state={saveState} />
        <button
          type="button"
          onClick={onOpenHelp}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-dim)] transition hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode(!previewMode)}
          style={{ background: '#E6007E', color: '#ffffff' }}
          className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium shadow-sm transition hover:brightness-95"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
            <path d="M2 1.5v8l7-4-7-4z" />
          </svg>
          {previewMode ? 'Exit preview' : 'Preview'}
        </button>
        <ExportMenu />
      </div>
    </header>
  );
}

function PillGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[var(--color-panel-2)] p-1">
      {children}
    </div>
  );
}

function PillItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
        active
          ? 'bg-white text-[#E6007E] shadow-sm'
          : 'text-[var(--color-text)] hover:text-[var(--color-text-strong)]'
      }`}
    >
      {children}
    </button>
  );
}

function SaveBadge({ state }: { state: 'saved' | 'saving' | 'unsaved' }) {
  const label =
    state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving…' : 'Unsaved';
  const dot =
    state === 'saved'
      ? 'bg-emerald-500'
      : state === 'saving'
        ? 'bg-amber-500'
        : 'bg-rose-500';
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)]">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
