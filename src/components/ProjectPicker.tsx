import { useEffect, useRef, useState } from 'react';
import type { Project } from '@/types/project';
import { DEFAULT_TEMPLATE } from '@/types/project';
import { deleteProject, listProjects } from '@/lib/persistence';
import { createProject } from '@/lib/factory';
import { createDemoProject } from '@/lib/demoProject';
import { projectFromJson } from '@/lib/exportJson';
import { useEditor } from '@/store/editor';

const VIEWER_HEIGHTS = [110, 150, 170, 190] as const;
type ViewerHeight = typeof VIEWER_HEIGHTS[number];

export function ProjectPicker({ onClose }: { onClose: () => void }) {
  const setProject = useEditor((s) => s.setProject);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const [viewerHeight, setViewerHeight] = useState<ViewerHeight>(
    DEFAULT_TEMPLATE.viewerHeightCm as ViewerHeight,
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

  function startBlank() {
    const p = createProject();
    p.template.viewerHeightCm = viewerHeight;
    setProject(p);
    onClose();
  }

  function startDemo() {
    const p = createDemoProject();
    p.template.viewerHeightCm = viewerHeight;
    setProject(p);
    onClose();
  }

  function pickExisting(p: Project) {
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

  async function handleDelete(e: React.MouseEvent, p: Project) {
    e.stopPropagation();
    if (!confirm(`Delete "${p.name}"? Cannot be undone.`)) return;
    await deleteProject(p.id);
    setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(10,10,20,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-[580px] max-w-[94vw] overflow-hidden rounded-2xl"
        style={{
          background: 'var(--color-panel)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid var(--color-border-soft)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'var(--color-accent-gradient)' }}
            >
              <img
                src={`${import.meta.env.BASE_URL}a.svg`}
                alt="ARena"
                className="h-[14px] w-[13px]"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <span className="text-[14px] font-semibold text-[var(--color-text-strong)]">
              ARena
            </span>
            <span className="text-[13px] text-[var(--color-text-dim)]">
              — otevřít nebo vytvořit projekt
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-dim)] transition hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
          >
            <IcoX />
          </button>
        </div>

        {/* ── Viewer height ── */}
        <div className="px-5 pb-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
            Výška pozorovatele
          </div>
          <div
            className="flex gap-[3px] rounded-full p-[3px]"
            style={{ background: 'var(--color-panel-2)' }}
          >
            {VIEWER_HEIGHTS.map((h) => {
              const active = viewerHeight === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setViewerHeight(h)}
                  className="flex flex-1 flex-col items-center rounded-full py-1.5 transition-all duration-150"
                  style={
                    active
                      ? {
                          background: '#ffffff',
                          color: 'var(--color-accent)',
                          boxShadow:
                            '0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(230,0,126,0.10)',
                        }
                      : { color: 'var(--color-text-dim)' }
                  }
                >
                  <span className="text-[12px] font-semibold leading-none">{h}</span>
                  <span
                    className="text-[10px] leading-none mt-0.5"
                    style={{ opacity: 0.65 }}
                  >
                    cm
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Action cards ── */}
        <div className="grid grid-cols-2 gap-2.5 px-5 pb-2.5">
          <button
            type="button"
            onClick={startBlank}
            className="group flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-left transition-all duration-150 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-softer)]"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] text-[var(--color-text-dim)] transition-colors group-hover:border-[var(--color-accent)] group-hover:bg-[var(--color-accent-soft)] group-hover:text-[var(--color-accent)]"
            >
              <IcoPlus />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--color-text-strong)]">
                Nový projekt
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                Prázdný 360° cylindr · 7741 × 2450 px
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={startDemo}
            className="group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-150 hover:brightness-95"
            style={{
              background: 'var(--color-accent-soft)',
              borderColor: 'rgba(230,0,126,0.25)',
            }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: 'rgba(230,0,126,0.12)',
                color: 'var(--color-accent)',
              }}
            >
              <IcoPlay />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--color-accent)]">
                Demo projekt
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                3 scény s hotspot navigací
              </div>
            </div>
          </button>
        </div>

        {/* ── Import ── */}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-left transition-all duration-150 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-softer)]"
          >
            <span className="text-[var(--color-text-dim)]">
              <IcoUpload />
            </span>
            <div>
              <div className="text-[12px] font-semibold text-[var(--color-text)]">
                Import .json
              </div>
              <div className="text-[11px] text-[var(--color-text-dim)]">
                Obnovit dříve exportovaný projekt
              </div>
            </div>
          </button>
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
        </div>

        {/* ── Recent projects ── */}
        <div className="border-t border-[var(--color-border-soft)]">
          <div className="flex items-center gap-2 px-5 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
              Nedávné projekty
            </span>
          </div>

          {error && (
            <div className="mx-5 mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
              {error}
            </div>
          )}

          <ul className="max-h-[200px] overflow-y-auto pb-1">
            {projects === null ? (
              <li className="px-5 py-3 text-[12px] text-[var(--color-text-dim)]">
                Načítám…
              </li>
            ) : projects.length === 0 ? (
              <li className="px-5 py-4 text-[12px] text-[var(--color-text-dim)]">
                Žádné uložené projekty.
              </li>
            ) : (
              projects.map((p) => (
                <li key={p.id} className="group">
                  <button
                    type="button"
                    onClick={() => pickExisting(p)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-[var(--color-panel-2)]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] text-[var(--color-text-dim)]">
                      <IcoFile />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[13px] font-medium text-[var(--color-text-strong)]">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-dim)]">
                        {p.scenes.length} scén{p.scenes.length === 1 ? 'a' : 'y'} · {p.assets.length} assetů · {formatTime(p.updatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, p)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-rose-50 hover:text-rose-500"
                        title="Smazat projekt"
                      >
                        <IcoTrash />
                      </button>
                      <span className="text-[var(--color-text-dim)]">
                        <IcoArrow />
                      </span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('cs-CZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function IcoX() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}

function IcoPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}

function IcoPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3,1.5 13,7 3,12.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IcoUpload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 9V2M4 5l3-3 3 3" />
      <path d="M2 11h10" />
    </svg>
  );
}

function IcoFile() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1H3a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L8 1z" />
      <path d="M8 1v5h5" />
    </svg>
  );
}

function IcoTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h10M5 4V2h4v2M11 4l-1 8H4L3 4" />
    </svg>
  );
}

function IcoArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3l4 4-4 4" />
    </svg>
  );
}
