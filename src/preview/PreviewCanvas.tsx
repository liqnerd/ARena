import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditor } from '@/store/editor';
import type { Scene, SceneObject, VideoObjectProps } from '@/types/project';
import { renderSceneToCanvas } from '@/lib/renderScene';
import { usePreviewRuntime } from '@/preview/usePreviewRuntime';
import { pickObjectAt } from '@/preview/pick';
import { getAssetObjectUrl } from '@/lib/assets';

export function PreviewCanvas() {
  const template = useEditor((s) => s.project.template);
  const project = useEditor((s) => s.project);
  const setPreviewMode = useEditor((s) => s.setPreviewMode);
  const setMode = useEditor((s) => s.setViewMode);
  const viewMode = useEditor((s) => s.view.mode);

  const {
    previewScene,
    previewSceneId,
    resolvedObjects,
    handleObjectClick,
    handleObjectHover,
    setPreviewSceneId,
  } = usePreviewRuntime();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const liveScene: Scene | undefined = previewScene
    ? { ...previewScene, objects: resolvedObjects }
    : undefined;

  const fitScale =
    size.w && size.h
      ? Math.min(
          (size.w - 32) / template.width,
          (size.h - 32) / template.height,
        )
      : 0;
  const cw = template.width * fitScale;
  const ch = template.height * fitScale;
  const offsetX = (size.w - cw) / 2;
  const offsetY = (size.h - ch) / 2;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!liveScene || fitScale === 0) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const px = e.clientX - rect.left - offsetX;
      const py = e.clientY - rect.top - offsetY;
      const wx = px / fitScale;
      const wy = py / fitScale;
      const hit = pickObjectAt(liveScene.objects, wx, wy);
      if (hit) handleObjectClick(hit.id);
    },
    [liveScene, fitScale, offsetX, offsetY, handleObjectClick],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!liveScene || fitScale === 0) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const px = e.clientX - rect.left - offsetX;
      const py = e.clientY - rect.top - offsetY;
      const wx = px / fitScale;
      const wy = py / fitScale;
      const hit = pickObjectAt(liveScene.objects, wx, wy);
      const id = hit?.id ?? null;
      if (id !== hoverId) {
        setHoverId(id);
        if (id) handleObjectHover(id);
      }
    },
    [liveScene, fitScale, offsetX, offsetY, hoverId, handleObjectHover],
  );

  return (
    <div className="relative flex h-full w-full flex-col bg-[var(--color-canvas)]">
      <div className="flex h-9 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] px-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
            PREVIEW
          </span>
          <span className="text-[12px] text-[var(--color-text-strong)]">
            {previewScene?.name ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-dim)]">
          <select
            value={previewSceneId}
            onChange={(e) => setPreviewSceneId(e.target.value)}
            className="rounded border border-[var(--color-border-soft)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-[var(--color-text-strong)] outline-none"
          >
            {project.scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setMode(viewMode === '3d' ? '2d' : '3d')}
            className="rounded border border-[var(--color-border-soft)] px-2 py-1 hover:border-[var(--color-accent)]"
          >
            {viewMode === '3d' ? '2D' : '3D'}
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className="rounded border border-[var(--color-accent)] px-2 py-1 text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            Exit preview
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        style={{ cursor: hoverId ? 'pointer' : 'default' }}
      >
        {size.w > 0 && (
          <>
            <RasterCanvas
              scene={liveScene}
              template={template}
              offsetX={offsetX}
              offsetY={offsetY}
              cw={cw}
              ch={ch}
            />
            {liveScene && (
              <VideoOverlay
                objects={liveScene.objects}
                fitScale={fitScale}
                offsetX={offsetX}
                offsetY={offsetY}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RasterCanvas({
  scene,
  template,
  offsetX,
  offsetY,
  cw,
  ch,
}: {
  scene: Scene | undefined;
  template: { width: number; height: number; segments: number; mode: 'cylinder-360' };
  offsetX: number;
  offsetY: number;
  cw: number;
  ch: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await renderSceneToCanvas(scene, template, {
        width: 2048,
        showGuides: false,
        skipVideoObjects: true,
      });
      if (cancelled) return;
      setDataUrl(c.toDataURL('image/png'));
    })();
    return () => {
      cancelled = true;
    };
  }, [scene, template]);

  return (
    <div
      className="absolute bg-white shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
      style={{ left: offsetX, top: offsetY, width: cw, height: ch }}
    >
      {dataUrl && (
        <img
          src={dataUrl}
          alt="preview"
          draggable={false}
          className="h-full w-full select-none"
        />
      )}
    </div>
  );
}

function VideoOverlay({
  objects,
  fitScale,
  offsetX,
  offsetY,
}: {
  objects: SceneObject[];
  fitScale: number;
  offsetX: number;
  offsetY: number;
}) {
  const videoObjs = objects
    .filter((o) => o.type === 'video' && o.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <>
      {videoObjs.map((obj) => (
        <VideoElement
          key={obj.id}
          obj={obj}
          fitScale={fitScale}
          offsetX={offsetX}
          offsetY={offsetY}
        />
      ))}
    </>
  );
}

function VideoElement({
  obj,
  fitScale,
  offsetX,
  offsetY,
}: {
  obj: SceneObject;
  fitScale: number;
  offsetX: number;
  offsetY: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const props = obj.props as VideoObjectProps;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let cancelled = false;
    getAssetObjectUrl(props.assetId).then((url) => {
      if (cancelled || !url || !ref.current) return;
      ref.current.src = url;
      ref.current.play().catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [props.assetId]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      style={{
        position: 'absolute',
        left: offsetX + obj.x * fitScale,
        top: offsetY + obj.y * fitScale,
        width: obj.width * fitScale,
        height: obj.height * fitScale,
        opacity: obj.opacity,
        pointerEvents: 'none',
        objectFit: 'fill',
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
        transformOrigin: '0 0',
      }}
    />
  );
}
