import { setCanvasDragData } from '@/components/canvas/Canvas2D';
import { useEditor } from '@/store/editor';

type Tool = 'text' | 'hotspot' | 'shape-rect' | 'shape-ellipse';

const TOOLS: { tool: Tool; label: string; icon: React.ReactNode; hint: string }[] = [
  {
    tool: 'text',
    label: 'Text',
    hint: 'Drag to canvas',
    icon: <span className="font-semibold">T</span>,
  },
  {
    tool: 'hotspot',
    label: 'Hotspot',
    hint: 'Click target',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    tool: 'shape-rect',
    label: 'Rectangle',
    hint: 'Rectangle',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    ),
  },
  {
    tool: 'shape-ellipse',
    label: 'Ellipse',
    hint: 'Ellipse',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
];

export function Toolbar() {
  const template = useEditor((s) => s.project.template);
  const addObject = useEditor((s) => s.addObject);

  return (
    <div className="pointer-events-none absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-[var(--shadow-pop)]">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          type="button"
          draggable
          onDragStart={(e) => setCanvasDragData(e, { kind: 'tool', tool: t.tool })}
          onClick={() => {
            const cx = template.width / 2;
            const cy = template.height / 2;
            addObject(buildToolObject(t.tool, cx, cy));
          }}
          title={`${t.label} — drag to canvas, or click to add at center`}
          className="pointer-events-auto flex h-8 w-8 cursor-grab items-center justify-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-panel-2)] hover:text-[var(--color-accent)] active:cursor-grabbing"
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}

function buildToolObject(tool: Tool, cx: number, cy: number) {
  if (tool === 'text') {
    const w = 800;
    const h = 140;
    return {
      type: 'text' as const,
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
        fontFamily: 'Aspekta, Inter, system-ui, sans-serif',
        fontSize: 96,
        fontWeight: 600,
        color: '#0f1116',
        align: 'left' as const,
      },
    };
  }
  if (tool === 'hotspot') {
    const w = 600;
    const h = 600;
    return {
      type: 'hotspot' as const,
      name: 'Hotspot',
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      props: { label: 'Tap', invisible: false },
    };
  }
  const w = 500;
  const h = 500;
  return {
    type: 'shape' as const,
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
      shape: tool === 'shape-ellipse' ? ('ellipse' as const) : ('rect' as const),
      fill: '#E6007E',
    },
  };
}
