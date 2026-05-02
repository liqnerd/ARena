import { lazy, Suspense } from 'react';
import { useEditor, useCurrentScene } from '@/store/editor';
import { Canvas2D } from '@/components/canvas/Canvas2D';
import { Toolbar } from '@/components/Toolbar';
import { PreviewCanvas } from '@/preview/PreviewCanvas';

const CanvasShell3D = lazy(() =>
  import('@/components/CanvasShell3D').then((m) => ({ default: m.CanvasShell3D })),
);
const Preview3D = lazy(() =>
  import('@/preview/Preview3D').then((m) => ({ default: m.Preview3D })),
);

function ChunkLoader({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-canvas)] text-[var(--color-text-dim)]">
      <span className="text-[11px] uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function Viewport() {
  const mode = useEditor((s) => s.view.mode);
  const resetView = useEditor((s) => s.resetView);
  const zoom = useEditor((s) => s.view.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.history.past.length);
  const future = useEditor((s) => s.history.future.length);
  const scene = useCurrentScene();
  const template = useEditor((s) => s.project.template);
  const previewMode = useEditor((s) => s.previewMode);

  if (previewMode) {
    return (
      <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
        {mode === '3d' ? (
          <Suspense fallback={<ChunkLoader label="Loading 3D preview…" />}>
            <Preview3D />
          </Suspense>
        ) : (
          <PreviewCanvas />
        )}
      </main>
    );
  }

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
      <div className="relative flex-1 overflow-hidden">
        {mode === '2d' ? (
          <>
            <Toolbar />
            <Canvas2D />
          </>
        ) : (
          <Suspense fallback={<ChunkLoader label="Loading 3D…" />}>
            <CanvasShell3D scene={scene} />
          </Suspense>
        )}
      </div>

      {/* floating bottom-right HUD */}
      <div className="pointer-events-none absolute bottom-4 right-6 flex items-center gap-2">
        {mode === '2d' && (
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] p-0.5 shadow-[var(--shadow-pop)]">
            <HudButton onClick={undo} disabled={past === 0} title="Undo (Ctrl+Z)">
              ↶
            </HudButton>
            <HudButton
              onClick={redo}
              disabled={future === 0}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷
            </HudButton>
            <span className="mx-1 h-4 w-px bg-[var(--color-border)]" />
            <HudButton onClick={() => setZoom(zoom * 0.85)} title="Zoom out">
              −
            </HudButton>
            <span className="w-12 text-center text-[11px] text-[var(--color-text)]">
              {Math.round(zoom * 100)}%
            </span>
            <HudButton onClick={() => setZoom(zoom * 1.15)} title="Zoom in">
              +
            </HudButton>
            <button
              type="button"
              onClick={resetView}
              className="rounded-full px-3 py-1 text-[11px] font-medium text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
            >
              Fit
            </button>
          </div>
        )}
        <div className="pointer-events-auto flex h-9 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-[11px] text-[var(--color-text-dim)] shadow-[var(--shadow-pop)]">
          <span>
            {template.width} × {template.height}
          </span>
          <span className="text-[var(--color-border)]">·</span>
          <span>{template.segments} seg</span>
        </div>
      </div>

    </main>
  );
}

function HudButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] text-[var(--color-text)] transition hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)] disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
