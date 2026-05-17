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
import type { Guide, PersonHeightCm } from '@/store/editor';
import type { Asset, SceneObject } from '@/types/project';
import { newId } from '@/lib/factory';
import { KonvaObject } from '@/components/canvas/KonvaObject';

const GRID_PX = 50;
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
  const safeZonePersonHeight = useEditor((s) => s.view.safeZonePersonHeight);
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
  const guides = useEditor((s) => s.guides);
  const addGuide = useEditor((s) => s.addGuide);
  const updateGuide = useEditor((s) => s.updateGuide);
  const removeGuide = useEditor((s) => s.removeGuide);

  const outerRef = useRef<HTMLDivElement | null>(null);
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

  // Guide drag state: dragging a guide out of a ruler
  const [guideDrag, setGuideDrag] = useState<{ axis: 'h' | 'v'; outerPos: number } | null>(null);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const zoomRef = useRef(zoom);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const handleRulerMouseDown = useCallback((axis: 'h' | 'v') => (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = outerRef.current!.getBoundingClientRect();
    const RS = 20;

    const getOuterPos = (me: MouseEvent | React.MouseEvent) =>
      axis === 'h' ? me.clientY - rect.top : me.clientX - rect.left;

    setGuideDrag({ axis, outerPos: getOuterPos(e) });

    const onMove = (me: MouseEvent) => setGuideDrag({ axis, outerPos: getOuterPos(me) });

    const onUp = (me: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const outerX = me.clientX - rect.left;
      const outerY = me.clientY - rect.top;
      if (outerX > RS && outerY > RS) {
        const innerX = outerX - RS;
        const innerY = outerY - RS;
        if (axis === 'h') {
          addGuide('h', (innerY - panYRef.current) / zoomRef.current);
        } else {
          addGuide('v', (innerX - panXRef.current) / zoomRef.current);
        }
      }
      setGuideDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [addGuide]);

  // Snap function for object drag — returns Konva dragBoundFunc
  const makeSnapBound = useCallback((obj: SceneObject) => {
    if (!guides.length) return undefined;
    return (absPos: { x: number; y: number }) => {
      const wx = (absPos.x - panX) / zoom;
      const wy = (absPos.y - panY) / zoom;
      const threshold = 6 / zoom;
      let nx = wx, ny = wy;
      for (const g of guides) {
        if (g.axis === 'v') {
          if (Math.abs(nx - g.position) < threshold) nx = g.position;
          else if (Math.abs(nx + obj.width - g.position) < threshold) nx = g.position - obj.width;
          else if (Math.abs(nx + obj.width / 2 - g.position) < threshold) nx = g.position - obj.width / 2;
        } else {
          if (Math.abs(ny - g.position) < threshold) ny = g.position;
          else if (Math.abs(ny + obj.height - g.position) < threshold) ny = g.position - obj.height;
          else if (Math.abs(ny + obj.height / 2 - g.position) < threshold) ny = g.position - obj.height / 2;
        }
      }
      return { x: nx * zoom + panX, y: ny * zoom + panY };
    };
  }, [guides, panX, panY, zoom]);

  // Snap during resize — used as Transformer boundBoxFunc
  const snapBoundBox = useCallback((
    oldBox: { x: number; y: number; width: number; height: number; rotation: number },
    newBox: { x: number; y: number; width: number; height: number; rotation: number },
  ) => {
    if (newBox.width < 4 || newBox.height < 4) return oldBox;
    if (!guides.length || newBox.rotation !== 0) return newBox;

    const THRESHOLD = 6; // screen px
    const leftMoved = Math.abs(newBox.x - oldBox.x) > 0.5;
    const topMoved  = Math.abs(newBox.y - oldBox.y) > 0.5;

    let { x, y, width, height } = newBox;

    for (const g of guides) {
      if (g.axis !== 'v') continue;
      const gAbs = g.position * zoom + panX;
      if (leftMoved) {
        if (Math.abs(x - gAbs) < THRESHOLD) { const r = x + width; x = gAbs; width = r - x; break; }
      } else {
        if (Math.abs(x + width - gAbs) < THRESHOLD) { width = gAbs - x; break; }
      }
    }

    for (const g of guides) {
      if (g.axis !== 'h') continue;
      const gAbs = g.position * zoom + panY;
      if (topMoved) {
        if (Math.abs(y - gAbs) < THRESHOLD) { const b = y + height; y = gAbs; height = b - y; break; }
      } else {
        if (Math.abs(y + height - gAbs) < THRESHOLD) { height = gAbs - y; break; }
      }
    }

    if (width < 4 || height < 4) return oldBox;
    return { ...newBox, x, y, width, height };
  }, [guides, panX, panY, zoom]);

  const RS = 20; // ruler size px

  return (
    <div
      ref={outerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ cursor: spacePan ? (panStateRef.current?.active ? 'grabbing' : 'grab') : 'default' }}
    >
      {/* Corner block */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-20 border-b border-r border-[var(--color-border)]"
        style={{ width: RS, height: RS, background: 'var(--color-panel-2)' }}
      />

      {/* Rulers */}
      {size.w > 0 && size.h > 0 && (
        <>
          <HorizontalRuler
            length={size.w}
            panX={panX}
            zoom={zoom}
            sceneWidth={template.width}
            rulerSize={RS}
          />
          <VerticalRuler
            length={size.h}
            panY={panY}
            zoom={zoom}
            sceneHeight={template.height}
            rulerSize={RS}
          />
          {/* Transparent drag zones on rulers */}
          <div
            style={{ position: 'absolute', top: 0, left: RS, right: 0, height: RS, zIndex: 25, cursor: 'row-resize' }}
            onMouseDown={handleRulerMouseDown('h')}
          />
          <div
            style={{ position: 'absolute', top: RS, left: 0, width: RS, bottom: 0, zIndex: 25, cursor: 'col-resize' }}
            onMouseDown={handleRulerMouseDown('v')}
          />
        </>
      )}

      {/* Guide drag preview */}
      {guideDrag && (
        <div
          className="pointer-events-none absolute z-30"
          style={guideDrag.axis === 'h'
            ? { top: guideDrag.outerPos, left: RS, right: 0, height: 1, background: 'rgba(0,192,255,0.9)' }
            : { left: guideDrag.outerPos, top: RS, bottom: 0, width: 1, background: 'rgba(0,192,255,0.9)' }
          }
        />
      )}

      {/* Canvas area offset by ruler */}
      <div
        ref={containerRef}
        className="absolute overflow-hidden"
        style={{ top: RS, left: RS, right: 0, bottom: 0 }}
        onDrop={onContainerDrop}
        onDragOver={onContainerDragOver}
      >
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
                fill={scene?.background ?? '#1a1b1e'}
                shadowColor="rgba(0,0,0,0.45)"
                shadowBlur={20}
                shadowOpacity={1}
                shadowOffset={{ x: 0, y: 8 }}
                listening
              />

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
                  dragBoundFunc={makeSnapBound(obj)}
                />
              ))}

              {showGrid && (
                <GridLayer
                  width={template.width}
                  height={template.height}
                />
              )}

              {showSafeZone && (
                <SafeZoneLayer
                  width={template.width}
                  height={template.height}
                  personHeight={safeZonePersonHeight}
                />
              )}

              {showSegments && (
                <SegmentLayer
                  width={template.width}
                  height={template.height}
                  segments={template.segments}
                />
              )}

              {/* Guides */}
              {guides.map((g) => (
                <GuideLine
                  key={g.id}
                  guide={g}
                  zoom={zoom}
                  panX={panX}
                  panY={panY}
                  sceneWidth={template.width}
                  sceneHeight={template.height}
                  onUpdate={updateGuide}
                  onRemove={removeGuide}
                />
              ))}

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
                boundBoxFunc={snapBoundBox}
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
    </div>
  );
}

function GridLayer({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const lines: React.ReactNode[] = [];
  // Continuous lines (no dash) to eliminate the cross-hatch "+" artifact
  for (let x = GRID_PX; x < width; x += GRID_PX) {
    lines.push(
      <Line
        key={`gv-${x}`}
        points={[x, 0, x, height]}
        stroke="rgba(236,72,153,0.06)"
        strokeWidth={0.5}
        listening={false}
      />,
    );
  }
  for (let y = GRID_PX; y < height; y += GRID_PX) {
    lines.push(
      <Line
        key={`gh-${y}`}
        points={[0, y, width, y]}
        stroke="rgba(236,72,153,0.06)"
        strokeWidth={0.5}
        listening={false}
      />,
    );
  }
  return <Group listening={false}>{lines}</Group>;
}

// Zone boundaries (heights from floor in px, canvas height = 2160)
const ZONE_DEFS: Record<PersonHeightCm, { noTextBottom: number; interactionTop: number; contentTop: number; noTextTop: number }> = {
  110: { noTextBottom: 229,  interactionTop: 670,  contentTop: 1375, noTextTop: 2160 },
  150: { noTextBottom: 582,  interactionTop: 1023, contentTop: 1728, noTextTop: 2160 },
  170: { noTextBottom: 749,  interactionTop: 1190, contentTop: 1904, noTextTop: 2160 },
  190: { noTextBottom: 935,  interactionTop: 1375, contentTop: 2081, noTextTop: 2160 },
};

function SafeZoneLayer({
  width,
  height,
  personHeight,
}: {
  width: number;
  height: number;
  personHeight: PersonHeightCm;
}) {
  const z = ZONE_DEFS[personHeight];
  // Convert heights-from-floor to canvas y (y=0 is top/ceiling, y=height is floor)
  const yNoTextBottom = height - z.noTextBottom;  // canvas y of no_text_bottom top edge
  const yInteraction  = height - z.interactionTop; // canvas y of interaction_zone top edge
  const yContent      = height - z.contentTop;     // canvas y of content_zone top edge

  const STROKE = 'rgba(236,72,153,0.6)';
  const DASH: [number, number] = [16, 8];
  const SW = 1.5;
  const FONT = 'ui-monospace, monospace';
  const FS = 32;
  const LABEL_COLOR = 'rgba(236,72,153,0.9)';
  const PAD = 40;

  return (
    <Group listening={false}>
      {/* Restricted zone fills — neutral gray (not pink) so content zone reads as white */}
      <Rect x={0} y={0}            width={width} height={yContent}               fill="rgba(0,0,0,0.04)" />
      <Rect x={0} y={yInteraction} width={width} height={yNoTextBottom - yInteraction} fill="rgba(0,0,0,0.025)" />
      <Rect x={0} y={yNoTextBottom} width={width} height={height - yNoTextBottom} fill="rgba(0,0,0,0.04)" />

      {/* Zone boundary dashed lines */}
      <Line points={[0, yContent,      width, yContent]}      stroke={STROKE} strokeWidth={SW} dash={DASH} />
      <Line points={[0, yInteraction,  width, yInteraction]}  stroke={STROKE} strokeWidth={SW} dash={DASH} />
      <Line points={[0, yNoTextBottom, width, yNoTextBottom]} stroke={STROKE} strokeWidth={SW} dash={DASH} />

      {/* Zone labels */}
      {yContent > FS + PAD && (
        <Text x={PAD} y={PAD} text="NO_TEXT_TOP" fontFamily={FONT} fontSize={FS} fill={LABEL_COLOR} />
      )}
      <Text x={PAD} y={yContent + PAD}      text="CONTENT_ZONE"     fontFamily={FONT} fontSize={FS} fill={LABEL_COLOR} />
      <Text x={PAD} y={yInteraction + PAD}  text="INTERACTION_ZONE" fontFamily={FONT} fontSize={FS} fill={LABEL_COLOR} />
      <Text x={PAD} y={yNoTextBottom + PAD} text="NO_TEXT_BOTTOM"   fontFamily={FONT} fontSize={FS} fill={LABEL_COLOR} />
    </Group>
  );
}

const PANEL_MARGIN = 50; // safe-zone px on each side of a panel boundary

function SegmentLayer({
  width,
  height,
  segments,
}: {
  width: number;
  height: number;
  segments: number;
}) {
  const segW = width / segments;
  const cols = segments * 2; // 12 equal columns for 6 segments
  const colW = width / cols;
  const colsPerSeg = 2;

  const elements: React.ReactNode[] = [];

  // ── Safe-zone gray fills: 50px band on each side of every panel boundary ──
  // Left canvas edge band
  elements.push(
    <Rect key="margin-fill-left" x={0} y={0} width={PANEL_MARGIN} height={height} fill="rgba(0,0,0,0.05)" listening={false} />,
  );
  // Right canvas edge band
  elements.push(
    <Rect key="margin-fill-right" x={width - PANEL_MARGIN} y={0} width={PANEL_MARGIN} height={height} fill="rgba(0,0,0,0.05)" listening={false} />,
  );
  // Both sides of each internal panel boundary
  for (let i = 1; i < segments; i++) {
    const x = Math.round(segW * i);
    elements.push(
      <Rect key={`margin-fill-${i}l`} x={x - PANEL_MARGIN} y={0} width={PANEL_MARGIN} height={height} fill="rgba(0,0,0,0.05)" listening={false} />,
      <Rect key={`margin-fill-${i}r`} x={x} y={0} width={PANEL_MARGIN} height={height} fill="rgba(0,0,0,0.05)" listening={false} />,
    );
  }

  // ── 12-column midpoint dashed lines (odd multiples of W/12) ──────────────
  // These fall exactly between each pair of adjacent panel boundaries.
  for (let i = 1; i < cols; i++) {
    if (i % colsPerSeg === 0) continue; // panel boundary — handled below
    const x = Math.round(colW * i);
    elements.push(
      <Line
        key={`col12-${i}`}
        points={[x, 0, x, height]}
        stroke="rgba(236,72,153,0.22)"
        strokeWidth={1}
        dash={[10, 8]}
        listening={false}
      />,
    );
  }

  // ── Panel boundary solid lines ────────────────────────────────────────────
  for (let i = 1; i < segments; i++) {
    const x = Math.round(segW * i);
    elements.push(
      <Line
        key={`seg-${i}`}
        points={[x, 0, x, height]}
        stroke="rgba(236,72,153,0.72)"
        strokeWidth={1.5}
        listening={false}
      />,
    );
  }

  // ── Panel edge safe-zone dashed lines (±50 px from each boundary + canvas edges) ──
  // Use a Set to avoid duplicate x positions (e.g. if PANEL_MARGIN lines coincide).
  const marginXs = new Set<number>([PANEL_MARGIN, width - PANEL_MARGIN]);
  for (let i = 1; i < segments; i++) {
    const x = Math.round(segW * i);
    marginXs.add(x - PANEL_MARGIN);
    marginXs.add(x + PANEL_MARGIN);
  }
  for (const mx of marginXs) {
    if (mx <= 0 || mx >= width) continue;
    elements.push(
      <Line
        key={`margin-${mx}`}
        points={[mx, 0, mx, height]}
        stroke="rgba(236,72,153,0.4)"
        strokeWidth={1}
        dash={[6, 6]}
        listening={false}
      />,
    );
  }

  return <Group listening={false}>{elements}</Group>;
}

// ─── Guide Line ────────────────────────────────────────────────────────────

function GuideLine({
  guide,
  zoom,
  panX,
  panY,
  sceneWidth,
  sceneHeight,
  onUpdate,
  onRemove,
}: {
  guide: Guide;
  zoom: number;
  panX: number;
  panY: number;
  sceneWidth: number;
  sceneHeight: number;
  onUpdate: (id: string, pos: number) => void;
  onRemove: (id: string) => void;
}) {
  const SPAN = 20000;
  const isV = guide.axis === 'v';
  const points = isV
    ? [0, -SPAN, 0, sceneHeight + SPAN]
    : [-SPAN, 0, sceneWidth + SPAN, 0];

  return (
    <Line
      x={isV ? guide.position : 0}
      y={isV ? 0 : guide.position}
      points={points}
      stroke="rgba(0,192,255,0.85)"
      strokeWidth={1 / zoom}
      hitStrokeWidth={10 / zoom}
      listening
      draggable
      dragBoundFunc={(pos) =>
        isV ? { x: pos.x, y: panY } : { x: panX, y: pos.y }
      }
      onDragEnd={(e) => {
        const worldPos = isV ? e.target.x() : e.target.y();
        onUpdate(guide.id, worldPos);
        if (isV) e.target.y(0); else e.target.x(0);
      }}
      onDblClick={() => onRemove(guide.id)}
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = isV ? 'ew-resize' : 'ns-resize';
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = '';
      }}
    />
  );
}

// ─── Rulers ────────────────────────────────────────────────────────────────

const RULER_INTERVALS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

function pickRulerInterval(zoom: number): number {
  for (const iv of RULER_INTERVALS) {
    if (iv * zoom >= 55) return iv;
  }
  return RULER_INTERVALS[RULER_INTERVALS.length - 1];
}

function drawHRuler(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  panX: number,
  zoom: number,
  sceneWidth: number,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#313237';
  ctx.fillRect(0, 0, w, h);

  const iv = pickRulerInterval(zoom);
  const worldLeft = -panX / zoom;
  const worldRight = (w - panX) / zoom;
  const first = Math.floor(worldLeft / iv) * iv;

  ctx.font = '9px ui-sans-serif,system-ui,sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  for (let wx = first; wx <= worldRight + iv; wx += iv) {
    const sx = Math.round(wx * zoom + panX);
    if (sx < -1 || sx > w + 1) continue;

    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(sx, h - 6, 1, 6);

    const halfSx = Math.round((wx + iv / 2) * zoom + panX);
    if (halfSx >= 0 && halfSx <= w) {
      ctx.fillRect(halfSx, h - 3, 1, 3);
    }

    if (sx + 2 < w) {
      ctx.fillStyle = '#7a7d87';
      ctx.fillText(String(Math.round(wx)), sx + 2, 2);
    }
  }

  // scene boundaries
  const x0 = Math.round(panX);
  const x1 = Math.round(sceneWidth * zoom + panX);
  ctx.fillStyle = '#E6007E';
  if (x0 >= 0 && x0 <= w) ctx.fillRect(x0, 0, 1, h);
  if (x1 >= 0 && x1 <= w) ctx.fillRect(x1, 0, 1, h);

  // border
  ctx.fillStyle = '#3f4047';
  ctx.fillRect(0, h - 1, w, 1);
}

function drawVRuler(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  panY: number,
  zoom: number,
  sceneHeight: number,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#313237';
  ctx.fillRect(0, 0, w, h);

  const iv = pickRulerInterval(zoom);
  const worldTop = -panY / zoom;
  const worldBottom = (h - panY) / zoom;
  const first = Math.floor(worldTop / iv) * iv;

  ctx.font = '9px ui-sans-serif,system-ui,sans-serif';

  for (let wy = first; wy <= worldBottom + iv; wy += iv) {
    const sy = Math.round(wy * zoom + panY);
    if (sy < -1 || sy > h + 1) continue;

    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(w - 6, sy, 6, 1);

    const halfSy = Math.round((wy + iv / 2) * zoom + panY);
    if (halfSy >= 0 && halfSy <= h) {
      ctx.fillRect(w - 3, halfSy, 3, 1);
    }

    if (sy - 2 > 0) {
      ctx.save();
      ctx.fillStyle = '#7a7d87';
      ctx.translate(w - 8, sy - 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(String(Math.round(wy)), 0, 0);
      ctx.restore();
    }
  }

  // scene boundaries
  const y0 = Math.round(panY);
  const y1 = Math.round(sceneHeight * zoom + panY);
  ctx.fillStyle = '#E6007E';
  if (y0 >= 0 && y0 <= h) ctx.fillRect(0, y0, w, 1);
  if (y1 >= 0 && y1 <= h) ctx.fillRect(0, y1, w, 1);

  // border
  ctx.fillStyle = '#3f4047';
  ctx.fillRect(w - 1, 0, 1, h);
}

function HorizontalRuler({
  length,
  panX,
  zoom,
  sceneWidth,
  rulerSize,
}: {
  length: number;
  panX: number;
  zoom: number;
  sceneWidth: number;
  rulerSize: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || length <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = length * dpr;
    c.height = rulerSize * dpr;
    c.style.width = `${length}px`;
    c.style.height = `${rulerSize}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawHRuler(ctx, length, rulerSize, panX, zoom, sceneWidth);
  }, [length, panX, zoom, sceneWidth, rulerSize]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute z-20"
      style={{ top: 0, left: rulerSize }}
    />
  );
}

function VerticalRuler({
  length,
  panY,
  zoom,
  sceneHeight,
  rulerSize,
}: {
  length: number;
  panY: number;
  zoom: number;
  sceneHeight: number;
  rulerSize: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || length <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = rulerSize * dpr;
    c.height = length * dpr;
    c.style.width = `${rulerSize}px`;
    c.style.height = `${length}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawVRuler(ctx, rulerSize, length, panY, zoom, sceneHeight);
  }, [length, panY, zoom, sceneHeight, rulerSize]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute z-20"
      style={{ top: rulerSize, left: 0 }}
    />
  );
}

// ───────────────────────────────────────────────────────────────────────────

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
    const w = 706;
    const h = 123;
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
    const w = 529;
    const h = 529;
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
  const w = 441;
  const h = 441;
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
