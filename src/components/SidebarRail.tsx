import { LayersPanel } from '@/components/LayersPanel';
import { AssetLibrary } from '@/components/AssetLibrary';

export type RailPanel = 'layers' | 'assets' | null;

export function SidebarRail({
  active,
  onChange,
  panelsOpen,
  onToggleAll,
}: {
  active: RailPanel;
  onChange: (p: RailPanel) => void;
  panelsOpen: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div className="flex shrink-0">
      <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[var(--color-border)] bg-[var(--color-panel)] py-3">
        <RailButton
          label="Toggle panels"
          active={panelsOpen}
          onClick={onToggleAll}
        >
          <IconPanel />
        </RailButton>
        <div className="my-1 h-px w-6 bg-[var(--color-border)]" />
        <RailButton
          label="Layers"
          active={active === 'layers'}
          onClick={() => onChange(active === 'layers' ? null : 'layers')}
        >
          <IconLayers />
        </RailButton>
        <RailButton
          label="Assets"
          active={active === 'assets'}
          onClick={() => onChange(active === 'assets' ? null : 'assets')}
        >
          <IconAssets />
        </RailButton>
      </nav>
      {active && (
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-panel)]">
          {active === 'layers' ? <LayersPanel /> : <AssetLibrary />}
        </aside>
      )}
    </div>
  );
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
        active
          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
          : 'text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]'
      }`}
    >
      {children}
    </button>
  );
}

function IconPanel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8 12 14 2 8 12 2" />
      <polyline points="2 13 12 19 22 13" />
      <polyline points="2 18 12 24 22 18" transform="translate(0 -3)" />
    </svg>
  );
}

function IconAssets() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
