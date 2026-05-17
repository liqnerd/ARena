import { useEditor } from '@/store/editor';
import type { PersonHeightCm } from '@/store/editor';
import { ExportMenu } from '@/components/ExportMenu';
import { useT } from '@/i18n';

const PERSON_HEIGHTS: PersonHeightCm[] = [110, 150, 170, 190];

export function TopBar({
  onOpenPicker,
  onOpenHelp,
}: {
  onOpenPicker: () => void;
  onOpenHelp: () => void;
}) {
  const { t, lang, setLang } = useT();
  const projectName = useEditor((s) => s.project.name);
  const renameProject = useEditor((s) => s.renameProject);
  const saveState = useEditor((s) => s.saveState);
  const mode = useEditor((s) => s.view.mode);
  const setMode = useEditor((s) => s.setViewMode);
  const showGrid = useEditor((s) => s.view.showGrid);
  const showSegments = useEditor((s) => s.view.showSegments);
  const showSafeZone = useEditor((s) => s.view.showSafeZone);
  const safeZonePersonHeight = useEditor((s) => s.view.safeZonePersonHeight);
  const toggleGrid = useEditor((s) => s.toggleGrid);
  const toggleSegments = useEditor((s) => s.toggleSegments);
  const toggleSafeZone = useEditor((s) => s.toggleSafeZone);
  const setSafeZonePersonHeight = useEditor((s) => s.setSafeZonePersonHeight);
  const previewMode = useEditor((s) => s.previewMode);
  const setPreviewMode = useEditor((s) => s.setPreviewMode);

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border-soft)] px-4"
      style={{
        background: 'var(--glass-bar)',
        backdropFilter: 'var(--glass-blur-md)',
        WebkitBackdropFilter: 'var(--glass-blur-md)',
        boxShadow: 'var(--shadow-bar)',
      }}
    >
      {/* LEFT: logo + project name */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenPicker}
          title={t.topbar_openPicker}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-[var(--color-panel-2)]"
        >
          <img src={`${import.meta.env.BASE_URL}a.svg`} alt="ARena" className="h-[18px] w-[17px]" />
        </button>
        <input
          value={projectName}
          onChange={(e) => renameProject(e.target.value)}
          className="bg-transparent text-[13px] font-medium text-[var(--color-accent)] outline-none placeholder:text-[var(--color-text-dim)] focus:text-[var(--color-accent-hover)]"
          placeholder={t.topbar_untitled}
          style={{ minWidth: '160px' }}
        />
      </div>

      {/* CENTER: mode toggle + view icon toggles */}
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
        <div className="flex items-center gap-0.5 rounded-full bg-[var(--color-panel-2)] p-1">
          <ViewToggle active={showGrid} onClick={toggleGrid} title={t.topbar_grid}>
            <IconGrid />
          </ViewToggle>
          <ViewToggle active={showSegments} onClick={toggleSegments} title={t.topbar_segments}>
            <IconSegments />
          </ViewToggle>
          <ViewToggle active={showSafeZone} onClick={toggleSafeZone} title={t.topbar_safeZone}>
            <IconSafeZone />
          </ViewToggle>
        </div>
        {showSafeZone && mode === '2d' && (
          <>
            <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
            <PillGroup>
              {PERSON_HEIGHTS.map((h) => (
                <PillItem
                  key={h}
                  active={safeZonePersonHeight === h}
                  onClick={() => setSafeZonePersonHeight(h)}
                >
                  {h}
                </PillItem>
              ))}
            </PillGroup>
          </>
        )}
      </div>

      {/* RIGHT: lang toggle, status, help, preview, export */}
      <div className="flex items-center gap-2">
        <LangToggle lang={lang} setLang={setLang} />
        <div className="h-5 w-px bg-[var(--color-border)]" />
        <SaveBadge state={saveState} t={t} />
        <button
          type="button"
          onClick={onOpenHelp}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-dim)] transition hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
          title={t.topbar_shortcuts}
        >
          ?
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode(!previewMode)}
          className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition hover:brightness-95"
          style={{
            background: 'var(--color-accent-gradient)',
            color: '#ffffff',
            boxShadow: '0 2px 12px rgba(230,0,126,0.30)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
            <path d="M2 1.5v8l7-4-7-4z" />
          </svg>
          {previewMode ? t.topbar_exitPreview : t.topbar_preview}
        </button>
        <ExportMenu />
      </div>
    </header>
  );
}

function LangToggle({ lang, setLang }: { lang: 'cs' | 'en'; setLang: (l: 'cs' | 'en') => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[var(--color-panel-2)] p-1">
      <button
        type="button"
        onClick={() => setLang('cs')}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
          lang === 'cs'
            ? 'bg-[var(--color-panel-2)] text-[#E6007E]'
            : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)]'
        }`}
        style={lang === 'cs' ? { boxShadow: '0 1px 4px rgba(0,0,0,0.10)' } : undefined}
      >
        CZ
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
          lang === 'en'
            ? 'bg-[var(--color-panel-2)] text-[#E6007E]'
            : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)]'
        }`}
        style={lang === 'en' ? { boxShadow: '0 1px 4px rgba(0,0,0,0.10)' } : undefined}
      >
        EN
      </button>
    </div>
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
      className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-all duration-150 ${
        active
          ? 'bg-[var(--color-panel-2)] text-[#E6007E]'
          : 'text-[var(--color-text)] hover:text-[var(--color-text-strong)]'
      }`}
      style={
        active
          ? { boxShadow: '0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(230,0,126,0.08)' }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function ViewToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 ${
        active
          ? 'bg-[var(--color-panel-2)] text-[#E6007E]'
          : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)]'
      }`}
      style={
        active
          ? { boxShadow: '0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(230,0,126,0.08)' }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function SaveBadge({ state, t }: { state: 'saved' | 'saving' | 'unsaved'; t: ReturnType<typeof useT>['t'] }) {
  const label =
    state === 'saved' ? t.topbar_saved : state === 'saving' ? t.topbar_saving : t.topbar_unsaved;
  const dot =
    state === 'saved'
      ? 'bg-emerald-500'
      : state === 'saving'
        ? 'bg-amber-500'
        : 'bg-rose-500';
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-[var(--color-text-dim)]"
      style={{
        background: 'var(--glass-float)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="5" y1="1" x2="5" y2="13" />
      <line x1="9" y1="1" x2="9" y2="13" />
      <line x1="1" y1="5" x2="13" y2="5" />
      <line x1="1" y1="9" x2="13" y2="9" />
    </svg>
  );
}

function IconSegments() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="7" y1="1" x2="7" y2="13" />
      <line x1="3.5" y1="2" x2="3.5" y2="12" strokeOpacity="0.6" />
      <line x1="10.5" y1="2" x2="10.5" y2="12" strokeOpacity="0.6" />
    </svg>
  );
}

function IconSafeZone() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="10" height="10" rx="1.5" />
      <rect x="4.5" y="4.5" width="5" height="5" rx="0.5" strokeDasharray="1.5 1" />
    </svg>
  );
}
