import { useRef, useState } from 'react';
import { useEditor } from '@/store/editor';
import {
  ACCEPTED_TYPES,
  importAssetFiles,
} from '@/lib/importAsset';
import { setCanvasDragData } from '@/components/canvas/Canvas2D';
import type { Asset, AssetType } from '@/types/project';
import { deleteAssetBlob } from '@/lib/persistence';
import { useT } from '@/i18n';

type Filter = 'all' | AssetType;

export function AssetLibrary() {
  const { t, lang } = useT();
  const assets = useEditor((s) => s.project.assets);
  const addAsset = useEditor((s) => s.addAsset);
  const removeAsset = useEditor((s) => s.removeAsset);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = assets.filter((a) => {
    if (filter !== 'all' && a.type !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const newAssets = await importAssetFiles(files);
      if (newAssets.length === 0) {
        const n = files.length;
        setError(
          lang === 'cs'
            ? `${n} soubor${n === 1 ? '' : n < 5 ? 'y' : 'ů'} přeskočeno (nepodporovaný typ)`
            : `${n} file${n > 1 ? 's' : ''} skipped (unsupported type)`,
        );
      } else {
        newAssets.forEach((a) => addAsset(a));
      }
    } catch (err) {
      console.error('[arena] import failed', err);
      setError(err instanceof Error ? err.message : lang === 'cs' ? 'Import selhal' : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  const FILTERS: [Filter, string][] = [
    ['all', t.assets_all],
    ['image', t.assets_image],
    ['svg', 'SVG'],
    ['video', 'Video'],
  ];

  return (
    <div
      className={`flex h-full flex-col ${
        dropping ? 'ring-1 ring-[var(--color-accent)] ring-inset' : ''
      }`}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          setDropping(true);
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          setDropping(false);
          handleFiles(e.dataTransfer.files);
        }
      }}
    >
      <div className="flex h-11 items-center justify-between border-b border-[var(--color-border)] px-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
          {t.assets_title}
        </span>
        <button
          type="button"
          title={t.assets_upload}
          onClick={() => inputRef.current?.click()}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-dim)] transition hover:bg-[var(--color-panel-2)] hover:text-[var(--color-accent)]"
        >
          +
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      <div className="px-3 pt-3">
        <input
          type="text"
          placeholder={t.assets_search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-1.5 text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:bg-[var(--color-panel)]"
        />
      </div>
      <div className="flex gap-1 px-3 pt-2 pb-2 text-[11px]">
        {FILTERS.map(([k, label]) => (
          <button
            type="button"
            key={k}
            onClick={() => setFilter(k as Filter)}
            className={`rounded-full px-2.5 py-1 transition ${
              filter === k
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <EmptyState busy={busy} t={t} />
        ) : (
          filtered.map((a) => (
            <AssetTile
              key={a.id}
              asset={a}
              removeLabel={t.assets_remove}
              onRemove={() => {
                const msg = lang === 'cs'
                  ? `Odebrat "${a.name}" z knihovny? Stávající objekty scény, které na něj odkazují, zobrazí zástupný symbol.`
                  : `Remove "${a.name}" from the library? Existing scene objects referencing it will show a placeholder.`;
                if (confirm(msg)) {
                  removeAsset(a.id);
                  deleteAssetBlob(a.id).catch(() => {});
                }
              }}
            />
          ))
        )}
      </div>

      <div className="border-t border-[var(--color-border)] px-3 py-2 text-[11px] leading-snug">
        {error ? (
          <span className="text-rose-500">⚠ {error}</span>
        ) : busy ? (
          <span className="text-[var(--color-text-dim)]">{t.assets_importing}</span>
        ) : (
          <span className="text-[var(--color-text-dim)]">
            {t.assets_hint}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ busy, t }: { busy: boolean; t: ReturnType<typeof useT>['t'] }) {
  return (
    <div className="col-span-2 flex h-full flex-col items-center justify-center gap-2 px-2 py-8 text-center text-[11px] text-[var(--color-text-dim)]">
      <div className="uppercase tracking-wider">
        {busy ? t.assets_importing.toLowerCase() : t.assets_noAssets}
      </div>
      <div className="leading-snug">
        {t.assets_dropHint}
      </div>
    </div>
  );
}

function AssetTile({
  asset,
  onRemove,
  removeLabel,
}: {
  asset: Asset;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        setCanvasDragData(e, { kind: 'asset', assetId: asset.id });
      }}
      title={`${asset.name}\n${asset.type.toUpperCase()}${asset.width ? ` · ${asset.width}×${asset.height}` : ''}`}
      className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] transition hover:border-[var(--color-accent)] active:cursor-grabbing"
    >
      {asset.thumbnailSrc ? (
        <img
          src={asset.thumbnailSrc}
          alt={asset.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] uppercase text-[var(--color-text-dim)]">
          {asset.type}
        </div>
      )}
      <div className="absolute top-1 left-1 rounded bg-white/90 px-1.5 text-[8px] font-semibold uppercase tracking-wider text-[var(--color-text)] shadow-sm">
        {asset.type}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 hidden h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] text-[var(--color-text)] shadow-sm hover:bg-rose-500 hover:text-white group-hover:flex"
        title={removeLabel}
      >
        ×
      </button>
    </div>
  );
}
