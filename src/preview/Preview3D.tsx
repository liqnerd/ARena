import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditor } from '@/store/editor';
import type { Scene, Template } from '@/types/project';
import { renderSceneToCanvas } from '@/lib/renderScene';
import { usePreviewRuntime } from '@/preview/usePreviewRuntime';
import { pickObjectAt } from '@/preview/pick';
import { useVideoElements } from '@/preview/useVideoElements';

const RADIUS = 2.5;

export function Preview3D() {
  const project = useEditor((s) => s.project);
  const setPreviewMode = useEditor((s) => s.setPreviewMode);
  const setMode = useEditor((s) => s.setViewMode);
  const template = useEditor((s) => s.project.template);

  const {
    previewScene,
    previewSceneId,
    resolvedObjects,
    handleObjectClick,
    handleObjectHover,
    setPreviewSceneId,
  } = usePreviewRuntime();

  const liveScene: Scene | undefined = previewScene
    ? { ...previewScene, objects: resolvedObjects }
    : undefined;

  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <div className="relative flex h-full w-full flex-col bg-[#f7f7f9]">
      <div className="flex h-9 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)] px-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
            PREVIEW · 3D
          </span>
          <span className="text-[12px] text-[var(--color-text-strong)]">
            {previewScene?.name ?? '—'}
          </span>
          <span className="rounded border border-[var(--color-border-soft)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-dim)]">
            inside view · drag to look around
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
            onClick={() => setMode('2d')}
            className="rounded border border-[var(--color-border-soft)] px-2 py-1 hover:border-[var(--color-accent)]"
          >
            2D
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

      <div className="relative flex-1" style={{ cursor: hoverId ? 'pointer' : 'grab' }}>
        <Canvas
          camera={{ position: [0, 0, 0], fov: 75, near: 0.01, far: 100 }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#f7f7f9']} />
          <ambientLight intensity={1.2} />
          <Suspense fallback={null}>
            <Cylinder scene={liveScene} template={template} />
          </Suspense>
          <InsideControls />
          <ClickPicker
            scene={liveScene}
            template={template}
            onClick={(id) => handleObjectClick(id)}
            onHoverChange={(id) => {
              setHoverId(id);
              if (id) handleObjectHover(id);
            }}
          />
        </Canvas>

        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-white/70">
          drag to look around · scroll to zoom · click hotspots to fire interactions
        </div>
      </div>
    </div>
  );
}

function Cylinder({
  scene,
  template,
}: {
  scene: Scene | undefined;
  template: Template;
}) {
  const height = (template.height / template.width) * (Math.PI * 2 * RADIUS);
  const texture = useLiveTextureWithVideo(scene, template);
  return (
    <mesh>
      <cylinderGeometry args={[RADIUS, RADIUS, height, 128, 1, true]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function applyInsideTextureFlip(tex: THREE.Texture) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = -1;
  tex.offset.x = 1;
}

function useLiveTextureWithVideo(scene: Scene | undefined, template: Template) {
  const targetWidth = 2048;
  const targetHeight = Math.round(targetWidth * (template.height / template.width));
  const sx = targetWidth / template.width;
  const sy = targetHeight / template.height;

  // Composite canvas — updated every frame when videos are present
  const compositeCanvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = targetWidth;
    c.height = targetHeight;
    return c;
  }, [targetWidth, targetHeight]);

  // CanvasTexture wrapping the composite canvas
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture>(() => {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 16, 16); }
    const t = new THREE.CanvasTexture(c);
    applyInsideTextureFlip(t);
    return t;
  });

  useEffect(() => {
    const tex = new THREE.CanvasTexture(compositeCanvas);
    applyInsideTextureFlip(tex);
    texRef.current = tex;
    setTexture((prev) => { prev.dispose(); return tex; });
    return () => { tex.dispose(); };
  }, [compositeCanvas]);

  // Base canvas: static render of the scene without video objects
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const dirtyRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    dirtyRef.current = true;
    renderSceneToCanvas(scene, template, {
      width: targetWidth,
      showGuides: false,
      skipVideoObjects: true,
    }).then((canvas) => {
      if (cancelled) return;
      baseRef.current = canvas;
      dirtyRef.current = true;
    });
    return () => { cancelled = true; };
  }, [scene, template, targetWidth]);

  // Video elements pool (keyed by object id)
  const videoMap = useVideoElements(scene?.objects ?? []);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const hasVideos = (scene?.objects ?? []).some((o) => o.type === 'video' && o.visible);

  useFrame(() => {
    const tex = texRef.current;
    const base = baseRef.current;
    if (!tex || !base) return;
    if (!dirtyRef.current && !hasVideos) return;

    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(base, 0, 0);

    const currentScene = sceneRef.current;
    if (currentScene) {
      const sorted = [...currentScene.objects].sort((a, b) => a.zIndex - b.zIndex);
      for (const obj of sorted) {
        if (obj.type !== 'video' || !obj.visible) continue;
        const vid = videoMap.get(obj.id);
        if (!vid || vid.readyState < 2) continue;
        ctx.save();
        ctx.globalAlpha = obj.opacity;
        ctx.translate(obj.x * sx, obj.y * sy);
        if (obj.rotation) ctx.rotate((obj.rotation * Math.PI) / 180);
        ctx.drawImage(vid, 0, 0, obj.width * sx, obj.height * sy);
        ctx.restore();
      }
    }

    tex.needsUpdate = true;
    dirtyRef.current = false;
  });

  return texture;
}

function InsideControls() {
  const { camera, gl } = useThree();
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const yaw = useRef(0);
  const pitch = useRef(0);
  const fov = useRef((camera as THREE.PerspectiveCamera).fov ?? 75);

  useEffect(() => {
    const el = gl.domElement;
    const apply = () => {
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
    };
    apply();
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      const sens = 0.0035;
      yaw.current -= dx * sens;
      pitch.current -= dy * sens;
      const limit = Math.PI / 2 - 0.05;
      pitch.current = Math.max(-limit, Math.min(limit, pitch.current));
      apply();
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      el.style.cursor = 'grab';
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const persp = camera as THREE.PerspectiveCamera;
      fov.current = Math.max(25, Math.min(110, fov.current + e.deltaY * 0.05));
      persp.fov = fov.current;
      persp.updateProjectionMatrix();
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl, camera]);

  return null;
}

function ClickPicker({
  scene,
  template,
  onClick,
  onHoverChange,
}: {
  scene: Scene | undefined;
  template: Template;
  onClick: (id: string) => void;
  onHoverChange: (id: string | null) => void;
}) {
  const { gl, camera } = useThree();
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastHover = useRef<string | null>(null);

  useEffect(() => {
    const el = gl.domElement;
    const persp = camera as THREE.PerspectiveCamera;

    const ndc = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const cylHeight =
      (template.height / template.width) * (Math.PI * 2 * RADIUS);

    const pickAt = (ndcX: number, ndcY: number) => {
      if (!scene) return null;
      const dir = new THREE.Vector3(ndcX, ndcY, 0.5);
      dir.unproject(persp);
      dir.sub(persp.position).normalize();
      // Camera at origin; ray = t * dir. Intersect with cylinder x²+z² = R².
      const dx = dir.x;
      const dy = dir.y;
      const dz = dir.z;
      const denom = dx * dx + dz * dz;
      if (denom < 1e-9) return null;
      const t = RADIUS / Math.sqrt(denom);
      const yHit = t * dy;
      if (yHit < -cylHeight / 2 || yHit > cylHeight / 2) return null;
      const xHit = t * dx;
      const zHit = t * dz;
      // Three's CylinderGeometry: vertex.x = R*sin(θ), vertex.z = R*cos(θ),
      // u = θ/(2π). So θ = atan2(x, z) and u_geom = θ/(2π).
      const theta = Math.atan2(xHit, zHit);
      let uGeom = theta / (Math.PI * 2);
      if (uGeom < 0) uGeom += 1;
      // Texture has repeat.x = -1, offset.x = 1 (horizontal flip for inside view),
      // so the visible pixel column = (1 - uGeom) * template.width.
      const sceneX = (1 - uGeom) * template.width;
      const v = 0.5 - yHit / cylHeight;
      const sceneY = v * template.height;
      return pickObjectAt(scene.objects, sceneX, sceneY);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      downRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      const d = downRef.current;
      downRef.current = null;
      if (!d) return;
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      const dt = performance.now() - d.t;
      if (moved > 5 || dt > 600) return; // treat as drag
      const p = ndc(e);
      const hit = pickAt(p.x, p.y);
      if (hit) onClick(hit.id);
    };
    const onMove = (e: PointerEvent) => {
      if (downRef.current) return; // skip during drag
      const p = ndc(e);
      const hit = pickAt(p.x, p.y);
      const id = hit?.id ?? null;
      if (id !== lastHover.current) {
        lastHover.current = id;
        onHoverChange(id);
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointermove', onMove);
    };
  }, [gl, camera, scene, template, onClick, onHoverChange]);

  return null;
}
