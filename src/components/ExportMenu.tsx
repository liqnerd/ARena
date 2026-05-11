import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/store/editor';
import { sceneToSvg } from '@/lib/exportSvg';
import { sceneToPngBlob } from '@/lib/exportPng';
import { projectToJson, projectFromJson } from '@/lib/exportJson';
import { downloadBlob, downloadText, safeFilename } from '@/lib/download';
import { findReferenceIssues } from '@/lib/validate';
import { useT } from '@/i18n';

// JSZip is heavy; load lazily on first ZIP export
const loadZipBundler = () =>
  import('@/lib/exportZip').then((m) => m.bundleProjectZip);

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'error'; message: string }
  | { kind: 'done'; message: string };

export function ExportMenu() {
  const { t, lang } = useT();
  const project = useEditor((s) => s.project);
  const currentSceneId = useEditor((s) => s.currentSceneId);
  const setProject = useEditor((s) => s.setProject);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (status.kind === 'done' || status.kind === 'error') {
      const timer = setTimeout(() => setStatus({ kind: 'idle' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  async function withStatus<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    setStatus({ kind: 'busy', label });
    try {
      const result = await fn();
      setStatus({ kind: 'done', message: `${label} ${t.export_complete}` });
      return result;
    } catch (err) {
      console.error('[arena] export failed', err);
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : t.export_failed,
      });
      return null;
    }
  }

  const projectSlug = safeFilename(project.name);
  const issues = findReferenceIssues(project);

  async function exportCurrentSvg() {
    setOpen(false);
    const scene = project.scenes.find((s) => s.id === currentSceneId);
    if (!scene) return;
    await withStatus('SVG export', async () => {
      const svg = await sceneToSvg(scene, project);
      downloadText(
        svg,
        `${projectSlug}-${safeFilename(scene.name)}.svg`,
        'image/svg+xml',
      );
    });
  }

  async function exportAllSvgs() {
    setOpen(false);
    await withStatus('Batch SVG (ZIP)', async () => {
      const bundle = await loadZipBundler();
      const blob = await bundle(project, {
        includePng: false,
        includeAssets: false,
      });
      downloadBlob(blob, `${projectSlug}-svg.zip`);
    });
  }

  async function exportJson() {
    setOpen(false);
    await withStatus('JSON export', async () => {
      const json = await projectToJson(project);
      downloadText(json, `${projectSlug}.arena.json`, 'application/json');
    });
  }

  async function exportPng() {
    setOpen(false);
    const scene = project.scenes.find((s) => s.id === currentSceneId);
    if (!scene) return;
    await withStatus('PNG export', async () => {
      const blob = await sceneToPngBlob(scene, project, 2048);
      if (!blob) throw new Error('Render failed');
      downloadBlob(blob, `${projectSlug}-${safeFilename(scene.name)}.png`);
    });
  }

  async function exportZip() {
    setOpen(false);
    await withStatus('Bundle ZIP', async () => {
      const bundle = await loadZipBundler();
      const blob = await bundle(project, {
        includePng: true,
        includeAssets: true,
      });
      downloadBlob(blob, `${projectSlug}.arena.zip`);
    });
  }

  function triggerImport() {
    setOpen(false);
    importRef.current?.click();
  }

  async function onImportFile(file: File) {
    const msg = lang === 'cs'
      ? `Nahradit aktuální projekt souborem "${file.name}"? Stávající práce bude uložena do historie automatického ukládání.`
      : `Replace current project with "${file.name}"? Your current edits will be saved into autosave history but the active project will switch.`;
    if (!confirm(msg)) return;
    await withStatus('JSON import', async () => {
      const text = await file.text();
      const restored = await projectFromJson(text);
      setProject(restored);
    });
  }

  const brokenRefMsg = issues.length > 0
    ? lang === 'cs'
      ? `⚠ ${issues.length} přerušená${issues.length > 1 ? (issues.length < 5 ? ' přerušené' : ' přerušených') : ''} reference v interakcích`
      : `⚠ ${issues.length} broken reference${issues.length > 1 ? 's' : ''} in interactions`
    : null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition ${
          open
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
            : 'border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {t.export_label}
      </button>

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onImportFile(f);
        }}
        className="hidden"
      />

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[260px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[var(--shadow-float)]">
          {brokenRefMsg && (
            <div className="border-b border-[var(--color-border-soft)] bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              {brokenRefMsg}
            </div>
          )}
          <Section title={t.export_currentScene}>
            <Item label={t.export_asSvg} hint=".svg" onClick={exportCurrentSvg} />
            <Item label={t.export_asPng} hint=".png" onClick={exportPng} />
          </Section>
          <Section title={t.export_allScenes}>
            <Item label={t.export_batchSvg} hint=".zip" onClick={exportAllSvgs} />
          </Section>
          <Section title={t.export_project}>
            <Item label={t.export_projectJson} hint=".json" onClick={exportJson} />
            <Item label={t.export_bundle} hint=".zip" onClick={exportZip} />
            <Item label={t.export_importJson} onClick={triggerImport} />
          </Section>
        </div>
      )}

      {status.kind !== 'idle' && (
        <div
          className={`absolute right-0 top-full mt-1 rounded border px-2 py-1 text-[11px] ${
            status.kind === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-600'
              : status.kind === 'busy'
                ? 'border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-text-dim)]'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          style={{ marginTop: open ? 'calc(100% + 4px)' : '4px' }}
        >
          {status.kind === 'busy'
            ? `${status.label}…`
            : status.kind === 'error'
              ? `⚠ ${status.message}`
              : `✓ ${status.message}`}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--color-border-soft)] last:border-b-0">
      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
        {title}
      </div>
      {children}
    </div>
  );
}

function Item({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] text-[var(--color-text)] transition hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
    >
      <span>{label}</span>
      {hint && (
        <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
          {hint}
        </span>
      )}
    </button>
  );
}
