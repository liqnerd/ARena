import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Stage, Layer, Rect, Line, Text, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useEditor, useCurrentScene } from '@/store/editor';
import type { Asset, SceneObject, Template } from '@/types/project';
import { computeSafeZone } from '@/types/project';
import { newId } from '@/lib/factory';
import { KonvaObject } from '@/components/canvas/KonvaObject';

const GRID_PX = 100;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 4;

type Marquee = { x1: number; y1: number; x2: number; y2: number } | null;

export type CanvasDropPayload =
  | { kind: 'asset'; assetId: string }
  | { kind: 'tool'; tool: 'text' | 'hotspot' | 'shape-rect' | 'shape-ellipse' };

const dragMimeType = 'application/x-arena';

export function setCanvasDragData(
  e: React.DragEvent,
  payload: CanvasDropPayload,
) {
  e.dataTransfer.setData(dragMimeType, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'copy';
}

function readCanvasDropData(e: React.DragEvent): CanvasDropPayload | null {
  const raw = e.dataTransfer.getData(dragMimeType);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CanvasDropPayload;
  } catch {
    return null;
  }
}

export function Canvas2D() {
  const scene = useCurrentScene();
  const template = useEditor((s) => s.project.template);
  const assets = useEditor((s) => s.project.assets);
  const showGrid = useEditor((s) => s.view.showGrid);
  const showSegments = useEditor((s) => s.view.showSegments);
  const showSafeZone = useEditor((s) => s.view.showSafeZone);
  const zoom = useEditor((s) => s.view.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const panX = useEditor((s) => s.view.panX);
  const panY = useEditor((s) => s.view.panY);
  const setPan = useEditor((s) => s.setPan);
  const selectedIds = useEditor((s) => s.selectedObjectIds);
  const selectObject = useEditor((s) => s.selectObject);
  const selectMany = useEditor((s) => s.selectMany);
  const clearSelection = useEditor((s) => s.clearSelection);
  const updateObject = useEditor((s) => s.updateObject);
  const addObject = useEditor((s) => s.addObject);
  const pushHistory = useEditor((s) => s.pushHistory);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const objectNodesRef = useRef(new Map<string, Konva.Node>());
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [autoFitDone, setAutoFitDone] = useState(false);
  const [spacePan, setSpacePan] = useState(false);
  const panStateRef = useRef<{ active: boolean; startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePan(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePan(false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Auto-fit once the container has size and we still have the default zoom/pan.
  useEffect(() => {
    if (autoFitDone || size.w === 0 || size.h === 0) return;
    const padding = 32;
    const fitX = (size.w - padding * 2) / template.width;
    const fitY = (size.h - padding * 2) / template.height;
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(fitX, fitY)));
    const newPanX = (size.w - template.width * next) / 2;
    const newPanY = (size.h - template.height * next) / 2;
    setZoom(next);
    setPan(newPanX, newPanY);
    setAutoFitDone(true);
  }, [autoFitDone, size, template, setZoom, setPan]);

  // Keep transformer attached to currently selected nodes.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = selectedIds
      .map((id) => objectNodesRef.current.get(id))
      .filter((n): n is Konva.Node => Boolean(n));
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, scene]);

  const registerNode = useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      objectNodesRef.current.set(id, node);
    } else {
      objectNodesRef.current.delete(id);
    }
  }, []);

  const onSelectObject = useCallback(
    (id: string, additive: boolean) => {
      selectObject(id, additive);
    },
    [selectObject],
  );

  const dragGroupRef = useRef<{
    leadId: string;
    leadStart: { x: number; y: number };
    others: { id: string; startX: number; startY: number }[];
  } | null>(null);

  const onDragStart = useCallback(
    (id: string) => {
      pushHistory();
      const sc = scene;
      if (!sc) return;
      const lead = sc.objects.find((o) => o.id === id);
      if (!lead) return;
      const others = selectedIds
        .filter((sid) => sid !== id)
        .map((sid) => sc.objects.find((o) => o.id === sid))
        .filter((o): o is NonNullable<typeof o> => Boolean(o) && !o!.locked)
        .map((o) => ({ id: o.id, startX: o.x, startY: o.y }));
      dragGroupRef.current = {
        leadId: id,
        leadStart: { x: lead.x, y: lead.y },
        others,
      };
    },
    [pushHistory, scene, selectedIds],
  );

  const onDragMove = useCallback((id: string, x: number, y: number) => {
    const grp = dragGroupRef.current;
    if (!grp || grp.leadId !== id || grp.others.length === 0) return;
    const dx = x - grp.leadStart.x;
    const dy = y - grp.leadStart.y;
    for (const o of grp.others) {
      const node = objectNodesRef.current.get(o.id);
      if (node) {
        node.x(o.startX + dx);
        node.y(o.startY + dy);
      }
    }
    transformerRef.current?.forceUpdate();
    transformerRef.current?.getLayer()?.batchDraw();
  }, []);

  const onDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateObject(id, { x, y });
      const grp = dragGroupRef.current;
      if (grp && grp.leadId === id && grp.others.length > 0) {
        const dx = x - grp.leadStart.x;
        const dy = y - grp.leadStart.y;
        for (const o of grp.others) {
          updateObject(o.id, { x: o.startX + dx, y: o.startY + dy });
        }
      }
      dragGroupRef.current = null;
    },
    [updateObject],
  );

  const onTransformEnd = useCallback(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = tr.nodes();
    pushHistory();
    nodes.forEach((node) => {
      const id = node.id();
      const sx = node.scaleX();
      const sy = node.scaleY();
      const obj = scene?.objects.find((o) => o.id === id);
      if (!obj) return;
      node.scaleX(1);
      node.scaleY(1);
      updateObject(id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        width: Math.max(4, obj.width * sx),
        height: Math.max(4, obj.height * sy),
      });
    });
  }, [pushHistory, scene, updateObject]);

  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      const native = e.evt;
      native.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      if (native.ctrlKey || native.metaKey) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const direction = native.deltaY < 0 ? 1 : -1;
        const factor = 1 + direction * 0.12;
        const next = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, zoom * factor),
        );
        const worldX = (pointer.x - panX) / zoom;
        const worldY = (pointer.y - panY) / zoom;
        const newPanX = pointer.x - worldX * next;
        const newPanY = pointer.y - worldY * next;
        setZoom(next);
        setPan(newPanX, newPanY);
      } else {
        setPan(panX - native.deltaX, panY - native.deltaY);
      }
    },
    [zoom, panX, panY, setZoom, setPan],
  );

  const onStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current!;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      if (spacePan) {
        panStateRef.current = {
          active: true,
          startX: pointer.x,
          startY: pointer.y,
          startPanX: panX,
          startPanY: panY,
        };
        return;
      }
      const target = e.target;
      if (target === stageRef.current) return;
      const isBackground = target.name() === 'canvas-bg';
      if (!isBackground) return;
      if (!e.evt.shiftKey) clearSelection();
      const wx = (pointer.x - panX) / zoom;
      const wy = (pointer.y - panY) / zoom;
      setMarquee({ x1: wx, y1: wy, x2: wx, y2: wy });
    },
    [panX, panY, zoom, clearSelection, spacePan],
  );

  const onStageMouseMove = useCallback(() => {
    const stage = stageRef.current!;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    if (panStateRef.current?.active) {
      const dx = pointer.x - panStateRef.current.startX;
      const dy = pointer.y - panStateRef.current.startY;
      setPan(panStateRef.current.startPanX + dx, panStateRef.current.startPanY + dy);
      return;
    }
    if (!marquee) return;
    const wx = (pointer.x - panX) / zoom;
    const wy = (pointer.y - panY) / zoom;
    setMarquee((m) => (m ? { ...m, x2: wx, y2: wy } : m));
  }, [marquee, panX, panY, zoom, setPan]);

  const onStageMouseUp = useCallback(() => {
    if (panStateRef.current?.active) {
      panStateRef.current = null;
      return;
    }
    if (!marquee || !scene) {
      setMarquee(null);
      return;
    }
    const x1 = Math.min(marquee.x1, marquee.x2);
    const y1 = Math.min(marquee.y1, marquee.y2);
    const x2 = Math.max(marquee.x1, marquee.x2);
    const y2 = Math.max(marquee.y1, marquee.y2);
    const tinyClick = x2 - x1 < 4 && y2 - y1 < 4;
    if (!tinyClick) {
      const hits = scene.objects.filter((o) => {
        if (!o.visible || o.locked) return false;
        return (
          o.x < x2 && o.x + o.width > x1 && o.y < y2 && o.y + o.height > y1
        );
      });
      selectMany(hits.map((h) => h.id));
    }
    setMarquee(null);
  }, [marquee, scene, selectMany]);

  const onContainerDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const payload = readCanvasDropData(e);
      if (!payload || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const wx = (px - panX) / zoom;
      const wy = (py - panY) / zoom;

      if (payload.kind === 'asset') {
        const asset = assets.find((a) => a.id === payload.assetId);
        if (!asset) return;
        addObject(buildAssetObject(asset, wx, wy));
      } else if (payload.kind === 'tool') {
        addObject(buildToolObject(payload.tool, wx, wy));
      }
    },
    [addObject, assets, panX, panY, zoom],
  );

  const onContainerDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(dragMimeType)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const sortedObjects = useMemo(
    () => (scene ? [...scene.objects].sort((a, b) => a.zIndex - b.zIndex) : []),
    [scene],
  );

  const segmentWidth = template.width / template.segments;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      onDrop={onContainerDrop}
      onDragOver={onContainerDragOver}
      style={{ cursor: spacePan ? (panStateRef.current?.active ? 'grabbing' : 'grab') : 'default' }}
    >
      <DotPattern />
      {size.w > 0 && size.h > 0 && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          onWheel={onWheel}
          onMouseDown={onStageMouseDown}
          onMouseMove={onStageMouseMove}
          onMouseUp={onStageMouseUp}
        >
          <Layer x={panX} y={panY} scaleX={zoom} scaleY={zoom}>
            <Rect
              name="canvas-bg"
              x={0}
              y={0}
              width={template.width}
              height={template.height}
              fill={scene?.background ?? '#ffffff'}
              shadowColor="rgba(0,0,0,0.45)"
              shadowBlur={20}
              shadowOpacity={1}
              shadowOffset={{ x: 0, y: 8 }}
              listening
            />

            {showGrid && (
              <GridLayer
                width={template.width}
                height={template.height}
                segmentWidth={segmentWidth}
              />
            )}

            {showSafeZone && (
              <SafeZoneLayer template={template} />
            )}

            {sortedObjects.map((obj) => (
              <KonvaObject
                key={obj.id}
                obj={obj}
                onSelect={onSelectObject}
                onDragStart={onDragStart}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
                draggable={!spacePan}
                registerNode={registerNode}
              />
            ))}

            {showSegments && (
              <SegmentLayer
                width={template.width}
                height={template.height}
                segments={template.segments}
              />
            )}

            <Transformer
              ref={transformerRef}
              rotateEnabled
              keepRatio={false}
              anchorSize={10}
              anchorStroke="#ec4899"
              anchorFill="#ffffff"
              borderStroke="#ec4899"
              borderDash={[4, 4]}
              onTransformEnd={onTransformEnd}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 4 || newBox.height < 4) return oldBox;
                return newBox;
              }}
            />

            {marquee && (
              <Rect
                x={Math.min(marquee.x1, marquee.x2)}
                y={Math.min(marquee.y1, marquee.y2)}
                width={Math.abs(marquee.x2 - marquee.x1)}
                height={Math.abs(marquee.y2 - marquee.y1)}
                fill="rgba(236,72,153,0.12)"
                stroke="rgba(236,72,153,0.9)"
                strokeWidth={1.5 / zoom}
                dash={[6 / zoom, 4 / zoom]}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      )}
      {scene && scene.objects.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-panel)]/70 px-6 py-4 text-center text-[var(--color-text-dim)] backdrop-blur">
            <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-strong)]">
              Empty scene
            </div>
            <div className="text-[11px] leading-snug">
              Drag an asset from the library, or use the toolbar above to add
              text / hotspot / shapes.
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-white/70">
        2D unwrap · ctrl/⌘+wheel zoom · wheel pan · space+drag pan · ? help
      </div>
    </div>
  );
}

function GridLayer({
  width,
  height,
  segmentWidth,
}: {
  width: number;
  height: number;
  segmentWidth: number;
}) {
  const lines: React.ReactNode[] = [];
  for (let x = GRID_PX; x < width; x += GRID_PX) {
    if (x % segmentWidth === 0) continue;
    lines.push(
      <Line
        key={`gv-${x}`}
        points={[x, 0, x, height]}
        stroke="rgba(236,72,153,0.35)"
        strokeWidth={2}
        dash={[14, 10]}
        listening={false}
      />,
    );
  }
  for (let y = GRID_PX; y < height; y += GRID_PX) {
    lines.push(
      <Line
        key={`gh-${y}`}
        points={[0, y, width, y]}
        stroke="rgba(236,72,153,0.35)"
        strokeWidth={2}
        dash={[14, 10]}
        listening={false}
      />,
    );
  }
  return <Group listening={false}>{lines}</Group>;
}

function SafeZoneLayer({ template }: { template: Template }) {
  const { width, height } = template;
  const safe = computeSafeZone(template);
  return (
    <Group listening={false}>
      <Rect
        x={0}
        y={0}
        width={width}
        height={safe.topPx}
        fill="rgba(180,180,180,0.18)"
      />
      <Rect
        x={0}
        y={height - safe.bottomPx}
        width={width}
        height={safe.bottomPx}
        fill="rgba(180,180,180,0.18)"
      />
      {safe.topPx > 60 && (
        <Text
          x={40}
          y={Math.max(60, safe.topPx - 80)}
          text="NO_TEXT_TOP"
          fontFamily="ui-monospace, monospace"
          fontSize={36}
          fill="rgba(236,72,153,0.85)"
        />
      )}
      {safe.bottomPx > 60 && (
        <Text
          x={40}
          y={height - safe.bottomPx + 40}
          text="NO_TEXT_BOTTOM"
          fontFamily="ui-monospace, monospace"
          fontSize={36}
          fill="rgba(236,72,153,0.85)"
        />
      )}
      <Line
        points={[0, safe.eyeLevelPx, width, safe.eyeLevelPx]}
        stroke="rgba(236,72,153,0.55)"
        strokeWidth={2}
        dash={[20, 12]}
      />
      <Text
        x={40}
        y={safe.eyeLevelPx - 44}
        text={`EYE_LEVEL · viewer ${template.viewerHeightCm ?? 170}cm`}
        fontFamily="ui-monospace, monospace"
        fontSize={28}
        fill="rgba(236,72,153,0.85)"
      />
      <Text
        x={width / 2 - 200}
        y={(safe.topPx + height - safe.bottomPx) / 2}
        text="TEXT_SAFE_ZONE"
        fontFamily="ui-monospace, monospace"
        fontSize={36}
        fill="rgba(140,140,140,0.9)"
      />
    </Group>
  );
}

function SegmentLayer({
  width,
  height,
  segments,
}: {
  width: number;
  height: number;
  segments: number;
}) {
  const segmentWidth = width / segments;
  return (
    <Group listening={false}>
      {Array.from({ length: segments }).map((_, i) => (
        <Group key={`seg-${i}`}>
          <Rect
            x={i * segmentWidth}
            y={0}
            width={20}
            height={height}
            fill="rgba(236,72,153,0.85)"
          />
          <Text
            x={i * segmentWidth + 30}
            y={50}
            text="100px"
            fontFamily="ui-monospace, monospace"
            fontSize={32}
            fill="rgba(236,72,153,0.95)"
          />
        </Group>
      ))}
    </Group>
  );
}

function DotPattern() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.06]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="dot" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot)" />
    </svg>
  );
}

function buildAssetObject(
  asset: Asset,
  cx: number,
  cy: number,
): Omit<SceneObject, 'id' | 'zIndex'> {
  const w = asset.width ?? 800;
  const h = asset.height ?? 600;
  return {
    type: asset.type,
    name: asset.name,
    x: cx - w / 2,
    y: cy - h / 2,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    props:
      asset.type === 'video'
        ? { assetId: asset.id, autoplay: false, loop: true, muted: true }
        : { assetId: asset.id, preserveAspectRatio: true },
  };
}

function buildToolObject(
  tool: 'text' | 'hotspot' | 'shape-rect' | 'shape-ellipse',
  cx: number,
  cy: number,
): Omit<SceneObject, 'id' | 'zIndex'> {
  if (tool === 'text') {
    const w = 800;
    const h = 140;
    return {
      type: 'text',
      name: 'Text',
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      props: {
        content: 'Type something',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 96,
        fontWeight: 600,
        color: '#1a1c22',
        align: 'left',
      },
    };
  }
  if (tool === 'hotspot') {
    const w = 600;
    const h = 600;
    return {
      type: 'hotspot',
      name: 'Hotspot',
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      props: {
        label: 'Tap',
        invisible: false,
      },
      interactions: [
        {
          id: newId('it_'),
          trigger: 'onClick',
          action: 'goToScene',
        },
      ],
    };
  }
  const w = 500;
  const h = 500;
  return {
    type: 'shape',
    name: tool === 'shape-ellipse' ? 'Ellipse' : 'Rectangle',
    x: cx - w / 2,
    y: cy - h / 2,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    props: {
      shape: tool === 'shape-ellipse' ? 'ellipse' : 'rect',
      fill: '#ec4899',
    },
  };
}
