import { useEffect, useRef, useState } from 'react';
import type { Project } from '@/types/project';
import { DEFAULT_TEMPLATE } from '@/types/project';
import {
  deleteProject,
  listProjects,
} from '@/lib/persistence';
import { createProject } from '@/lib/factory';
import { createDemoProject } from '@/lib/demoProject';
import { projectFromJson } from '@/lib/exportJson';
import { useEditor } from '@/store/editor';

export function ProjectPicker({ onClose }: { onClose: () => void }) {
  const setProject = useEditor((s) => s.setProject);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const [viewerHeight, setViewerHeight] = useState<number>(
    DEFAULT_TEMPLATE.viewerHeightCm,
  );
  const [projectionHeight, setProjectionHeight] = useState<number>(
    DEFAULT_TEMPLATE.projectionHeightCm,
  );

  useEffect(() => {
    listProjects()
      .then((list) =>
        setProjects(
          [...list].sort((a, b) =>
            (b.updatedAt || '').localeCompare(a.updatedAt || ''),
          ),
        ),
      )
      .catch((err) => setError(err.message));
  }, []);

  function pickExisting(p: Project) {
    setProject(p);
    onClose();
  }

  function startBlank() {
    const p = createProject();
    p.template.viewerHeightCm = viewerHeight;
    p.template.projectionHeightCm = projectionHeight;
    setProject(p);
    onClose();
  }

  function startDemo() {
    const p = createDemoProject();
    p.template.viewerHeightCm = viewerHeight;
    p.template.projectionHeightCm = projectionHeight;
    setProject(p);
    onClose();
  }

  async function importFile(file: File) {
    try {
      const text = await file.text();
      const restored = await projectFromJson(text);
      setProject(restored);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  async function handleDelete(p: Project) {
    if (!confirm(`Delete "${p.name}" from local storage? Cannot be undone.`)) return;
    await deleteProject(p.id);
    setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-[640px] max-w-[92vw] rounded-2xl border border-[var(--glass-border)]"
        style={{
          background: 'var(--glass-float)',
          backdropFilter: 'var(--glass-blur-lg)',
          WebkitBackdropFilter: 'var(--glass-blur-lg)',
          boxShadow: 'var(--shadow-float-strong)',
        }}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-accent)] text-[12px] font-semibold text-white">
              A
            </div>
            <span className="text-[14px] font-semibold text-[var(--color-text-strong)]">
              ARena
            </span>
            <span className="text-[12px] text-[var(--color-text-dim)]">
              · open or start a project
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)]"
          >
            ×
          </button>
        </div>

        <div className="border-b border-[var(--color-border-soft)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
              Audience &amp; projection
            </span>
            <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
              eye level {viewerHeight}cm of {projectionHeight}cm
            </span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {(
              [
                ['Adult', 170],
                ['Teen', 150],
                ['Child', 110],
                ['Toddler', 90],
              ] as const
            ).map(([label, h]) => (
              <button
                key={label}
                type="button"
                onClick={() => setViewerHeight(h)}
                className={`rounded border px-2 py-1 text-[11px] ${
                  viewerHeight === h
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border-soft)] text-[var(--color-text-dim)] hover:border-[var(--color-accent)]'
                }`}
              >
                {label} {h}cm
              </button>
            ))}
          </div>
          <div className="flex gap-2 text-[11px]">
            <label className="flex-1">
              <span className="block text-[10px] text-[var(--color-text-dim)]">
                Viewer height (cm)
              </span>
              <input
                type="number"
                min={40}
                max={250}
                value={viewerHeight}
                onChange={(e) =>
                  setViewerHeight(parseInt(e.target.value || '170', 10))
                }
                className="w-full rounded border border-[var(--color-border-soft)] bg-[var(--color-bg)] px-2 py-1 text-[12px] text-[var(--color-text-strong)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <label className="flex-1">
              <span className="block text-[10px] text-[var(--color-text-dim)]">
                Projection height (cm)
              </span>
              <input
                type="number"
                min={50}
                max={500}
                value={projectionHeight}
                onChange={(e) =>
                  setProjectionHeight(parseInt(e.target.value || '250', 10))
                }
                className="w-full rounded border border-[var(--color-border-soft)] bg-[var(--color-bg)] px-2 py-1 text-[12px] text-[var(--color-text-strong)] outline-none focus:border-[var(--color-accent)]"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-[var(--color-border-soft)] p-3">
          <ActionCard
            title="New project"
            sub="Empty 7741×2450 cylinder"
            onClick={startBlank}
          />
          <ActionCard
            title="Demo project"
            sub="3 scenes with hotspot links"
            onClick={startDemo}
            accent
          />
          <ActionCard
            title="Import .json"
            sub="Restore exported project"
            onClick={() => importRef.current?.click()}
          />
        </div>

        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) importFile(f);
          }}
          className="hidden"
        />

        <div className="p-3">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            Recent projects
          </div>
          {error && (
            <div className="mx-2 my-2 rounded border border-rose-500/60 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300">
              ⚠ {error}
            </div>
          )}
          {projects === null ? (
            <div className="px-2 py-3 text-[12px] text-[var(--color-text-dim)]">
              Loading…
            </div>
          ) : projects.length === 0 ? (
            <div className="px-2 py-3 text-[12px] text-[var(--color-text-dim)]">
              No saved projects yet.
            </div>
          ) : (
            <ul className="max-h-[280px] divide-y divide-[var(--color-border-soft)] overflow-y-auto">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="group flex items-center justify-between gap-2 px-2 py-2 hover:bg-[var(--color-panel-2)]"
                >
                  <button
                    type="button"
                    onClick={() => pickExisting(p)}
                    className="flex flex-1 flex-col items-start text-left"
                  >
                    <span className="text-[13px] text-[var(--color-text-strong)]">
                      {p.name}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
                      {p.scenes.length} scene{p.scenes.length > 1 ? 's' : ''} · {p.assets.length} asset{p.assets.length === 1 ? '' : 's'} · updated{' '}
                      {formatTime(p.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="opacity-0 transition group-hover:opacity-100 text-[var(--color-text-dim)] hover:text-rose-400"
                    title="Delete project"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  sub,
  onClick,
  accent,
}: {
  title: string;
  sub: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded border p-3 text-left transition ${
        accent
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] hover:brightness-110'
          : 'border-[var(--color-border-soft)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-strong)]'
      }`}
    >
      <span className="text-[13px] font-semibold">{title}</span>
      <span className="text-[11px] text-[var(--color-text-dim)]">{sub}</span>
    </button>
  );
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
