import { useEditor, useCurrentScene } from '@/store/editor';
import type {
  HotspotObjectProps,
  SceneObject,
  ShapeObjectProps,
  TextObjectProps,
  VideoObjectProps,
} from '@/types/project';
import { InteractionsEditor } from '@/components/InteractionsEditor';

export function Inspector() {
  const scene = useCurrentScene();
  const selectedIds = useEditor((s) => s.selectedObjectIds);
  const selected = scene?.objects.find((o) => selectedIds.includes(o.id));

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="flex-1 overflow-y-auto">
        {selectedIds.length > 1 ? (
          <MultiSelectInspector count={selectedIds.length} />
        ) : selected ? (
          <ObjectInspector obj={selected} />
        ) : (
          <SceneInspector />
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--color-border-soft)] px-4 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {label !== undefined && (
        <span className="w-20 shrink-0 text-[12px] text-[var(--color-text)]">
          {label}
        </span>
      )}
      <div className="flex flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

function NumberField({
  prefix,
  value,
  onChange,
  step = 1,
}: {
  prefix?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-1 items-center gap-1 rounded-full bg-[var(--color-panel-2)] px-2.5 py-1 transition focus-within:bg-[var(--color-panel)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]">
      {prefix && (
        <span className="text-[10px] font-semibold text-[var(--color-text-dim)]">
          {prefix}
        </span>
      )}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => onChange(parseFloat(e.target.value || '0'))}
        className="arena-num w-full bg-transparent text-[12px] text-[var(--color-text-strong)] outline-none"
      />
    </label>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-full bg-[var(--color-panel-2)] px-3 py-1.5 text-[12px] text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-dim)] focus:bg-[var(--color-panel)] focus:ring-1 focus:ring-[var(--color-accent)]"
    />
  );
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-1 items-center gap-3">
      <input
        type="range"
        className="arena-slider flex-1"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ['--val' as string]: `${pct}%` }}
      />
      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text)]">
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  );
}

function ColorSwatch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex w-full items-center gap-2 rounded-full bg-[var(--color-panel-2)] px-2 py-1 transition hover:bg-[var(--color-panel-3)]">
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-[var(--color-border)]"
        style={{ background: value }}
      />
      <input
        type="text"
        value={value.replace('#', '').toUpperCase()}
        onChange={(e) => {
          const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
          onChange(v);
        }}
        className="w-full bg-transparent text-[11px] uppercase text-[var(--color-text-strong)] outline-none"
      />
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute opacity-0"
        style={{ width: 0, height: 0 }}
      />
    </label>
  );
}

function MultiSelectInspector({ count }: { count: number }) {
  const deleteObject = useEditor((s) => s.deleteObject);
  const selectedIds = useEditor((s) => s.selectedObjectIds);
  return (
    <div className="px-4 py-5 text-[12px] text-[var(--color-text-dim)]">
      <div className="mb-3 text-[14px] font-semibold text-[var(--color-text-strong)]">
        {count} objects selected
      </div>
      <button
        type="button"
        onClick={() => selectedIds.forEach((id) => deleteObject(id))}
        className="rounded-full bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-600 hover:bg-rose-100"
      >
        Delete selection
      </button>
    </div>
  );
}

function ObjectInspector({ obj }: { obj: SceneObject }) {
  const updateObject = useEditor((s) => s.updateObject);
  const pushHistory = useEditor((s) => s.pushHistory);
  const deleteObject = useEditor((s) => s.deleteObject);
  const duplicateObject = useEditor((s) => s.duplicateObject);
  const bringForward = useEditor((s) => s.bringForward);
  const sendBackward = useEditor((s) => s.sendBackward);
  const bringToFront = useEditor((s) => s.bringToFront);
  const sendToBack = useEditor((s) => s.sendToBack);

  const commit = (patch: Partial<SceneObject>) => {
    pushHistory();
    updateObject(obj.id, patch);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
            Object
          </div>
          <input
            value={obj.name}
            onChange={(e) => updateObject(obj.id, { name: e.target.value })}
            onBlur={() => pushHistory()}
            className="bg-transparent text-[14px] font-semibold text-[var(--color-text-strong)] outline-none"
          />
        </div>
        <div className="flex gap-1">
          <IconButton
            onClick={() => commit({ locked: !obj.locked })}
            active={obj.locked}
            title={obj.locked ? 'Unlock' : 'Lock'}
          >
            {obj.locked ? '🔒' : '🔓'}
          </IconButton>
          <IconButton
            onClick={() => commit({ visible: !obj.visible })}
            active={!obj.visible}
            title={obj.visible ? 'Hide' : 'Show'}
          >
            {obj.visible ? '◉' : '◌'}
          </IconButton>
        </div>
      </div>

      <Section title="Editor">
        <Row label="Position">
          <NumberField prefix="X" value={obj.x} onChange={(v) => commit({ x: v })} />
          <NumberField prefix="Y" value={obj.y} onChange={(v) => commit({ y: v })} />
        </Row>
        <Row label="Rotation">
          <NumberField
            prefix="°"
            value={obj.rotation}
            onChange={(v) => commit({ rotation: v })}
          />
          <button
            type="button"
            onClick={() => commit({ rotation: obj.rotation - 90 })}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
            title="Rotate -90°"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={() => commit({ rotation: obj.rotation + 90 })}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
            title="Rotate 90°"
          >
            ↻
          </button>
        </Row>
      </Section>

      <Section title="Layout">
        <Row label="Dimensions">
          <NumberField
            prefix="W"
            value={obj.width}
            onChange={(v) => commit({ width: Math.max(1, v) })}
          />
          <NumberField
            prefix="H"
            value={obj.height}
            onChange={(v) => commit({ height: Math.max(1, v) })}
          />
        </Row>
        <Row label="Layer">
          <button
            type="button"
            onClick={() => bringToFront(obj.id)}
            title="Bring to front"
            className="flex h-7 flex-1 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[12px] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
          >
            ⇈
          </button>
          <button
            type="button"
            onClick={() => bringForward(obj.id)}
            title="Bring forward"
            className="flex h-7 flex-1 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[12px] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => sendBackward(obj.id)}
            title="Send backward"
            className="flex h-7 flex-1 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[12px] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => sendToBack(obj.id)}
            title="Send to back"
            className="flex h-7 flex-1 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[12px] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
          >
            ⇊
          </button>
        </Row>
      </Section>

      <Section title="Appearance">
        <Row label="Opacity">
          <Slider
            min={0}
            max={100}
            value={Math.round(obj.opacity * 100)}
            onChange={(v) => commit({ opacity: Math.max(0, Math.min(1, v / 100)) })}
            suffix="%"
          />
        </Row>
      </Section>

      <TypeSpecific obj={obj} />

      <Section title="Action">
        <InteractionsEditor obj={obj} />
      </Section>

      <div className="flex gap-1 p-4">
        <button
          type="button"
          onClick={() => duplicateObject(obj.id)}
          className="flex-1 rounded-full bg-[var(--color-panel-2)] px-3 py-1.5 text-[12px] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => deleteObject(obj.id)}
          className="flex-1 rounded-full bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-600 hover:bg-rose-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition ${
        active
          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
          : 'text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]'
      }`}
    >
      {children}
    </button>
  );
}

function TypeSpecific({ obj }: { obj: SceneObject }) {
  const updateObject = useEditor((s) => s.updateObject);
  const pushHistory = useEditor((s) => s.pushHistory);

  const patch = (props: Record<string, unknown>) =>
    updateObject(obj.id, { props: { ...obj.props, ...props } });

  if (obj.type === 'text') {
    const props = obj.props as TextObjectProps;
    return (
      <Section title="Text">
        <textarea
          value={props.content}
          onChange={(e) => patch({ content: e.target.value })}
          onBlur={() => pushHistory()}
          placeholder="Type text…"
          className="h-20 w-full resize-none rounded-xl bg-[var(--color-panel-2)] px-3 py-2 text-[12px] text-[var(--color-text)] outline-none focus:bg-[var(--color-panel)] focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <Row label="Font">
          <TextField value={props.fontFamily} onChange={(v) => patch({ fontFamily: v })} />
        </Row>
        <Row label="Size">
          <NumberField
            value={props.fontSize}
            onChange={(v) => {
              pushHistory();
              patch({ fontSize: Math.max(1, v) });
            }}
          />
          <NumberField
            prefix="W"
            value={props.fontWeight}
            onChange={(v) => {
              pushHistory();
              patch({ fontWeight: Math.max(100, Math.min(900, v)) });
            }}
          />
        </Row>
        <Row label="Color">
          <ColorSwatch
            value={props.color}
            onChange={(v) => {
              pushHistory();
              patch({ color: v });
            }}
          />
        </Row>
        <Row label="Align">
          <div className="flex w-full gap-1">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  pushHistory();
                  patch({ align: a });
                }}
                className={`flex-1 rounded-full px-2 py-1 text-[11px] font-medium transition ${
                  props.align === a
                    ? 'bg-[#E6007E] text-[#ffffff]'
                    : 'bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]'
                }`}
              >
                {a[0].toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </Row>
      </Section>
    );
  }

  if (obj.type === 'shape') {
    const props = obj.props as ShapeObjectProps;
    return (
      <Section title="Fill">
        <Row label="Fill">
          <ColorSwatch
            value={props.fill ?? '#E6007E'}
            onChange={(v) => {
              pushHistory();
              patch({ fill: v });
            }}
          />
        </Row>
        {props.shape === 'rect' && (
          <Row label="Corner radius">
            <Slider
              min={0}
              max={200}
              value={props.cornerRadius ?? 0}
              onChange={(v) => {
                pushHistory();
                patch({ cornerRadius: Math.max(0, v) });
              }}
            />
          </Row>
        )}
      </Section>
    );
  }

  if (obj.type === 'hotspot') {
    const props = obj.props as HotspotObjectProps;
    return (
      <Section title="Hotspot">
        <Row label="Label">
          <TextField
            value={props.label ?? ''}
            onChange={(v) => {
              pushHistory();
              patch({ label: v });
            }}
            placeholder="Tap"
          />
        </Row>
        <Row label="Style">
          <button
            type="button"
            onClick={() => {
              pushHistory();
              patch({ invisible: !(props.invisible ?? false) });
            }}
            className={`rounded-full px-3 py-1 text-[11px] font-medium ${
              props.invisible
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'bg-[var(--color-panel-2)] text-[var(--color-text)]'
            }`}
          >
            {props.invisible ? 'Invisible' : 'Visible'}
          </button>
        </Row>
      </Section>
    );
  }

  if (obj.type === 'video') {
    const props = obj.props as VideoObjectProps;
    return (
      <Section title="Video">
        <Row label="Playback">
          <button
            type="button"
            onClick={() => {
              pushHistory();
              patch({ loop: !(props.loop ?? false) });
            }}
            className={`flex-1 rounded-full px-3 py-1 text-[11px] font-medium ${
              props.loop
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'bg-[var(--color-panel-2)] text-[var(--color-text)]'
            }`}
          >
            {props.loop ? 'Loop on' : 'Loop off'}
          </button>
          <button
            type="button"
            onClick={() => {
              pushHistory();
              patch({ muted: !(props.muted ?? true) });
            }}
            className={`flex-1 rounded-full px-3 py-1 text-[11px] font-medium ${
              props.muted
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'bg-[var(--color-panel-2)] text-[var(--color-text)]'
            }`}
          >
            {props.muted ? 'Muted' : 'Sound'}
          </button>
        </Row>
      </Section>
    );
  }

  return null;
}

function SceneInspector() {
  const scene = useCurrentScene();
  const renameScene = useEditor((s) => s.renameScene);
  const updateBg = useEditor((s) => s.updateSceneBackground);
  const updateNotes = useEditor((s) => s.updateSceneNotes);
  const startSceneId = useEditor((s) => s.project.startSceneId);
  const setStartScene = useEditor((s) => s.setStartScene);

  if (!scene) return null;
  const isStart = scene.id === startSceneId;

  return (
    <div>
      <div className="border-b border-[var(--color-border-soft)] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
          Scene
        </div>
        <div className="text-[14px] font-semibold text-[var(--color-text-strong)]">
          {scene.name}
        </div>
      </div>

      <Section title="Scene">
        <Row label="Name">
          <TextField value={scene.name} onChange={(v) => renameScene(scene.id, v)} />
        </Row>
        <Row label="Background">
          <ColorSwatch
            value={scene.background ?? '#ffffff'}
            onChange={(v) => updateBg(scene.id, v)}
          />
        </Row>
        <Row label="Start">
          <button
            type="button"
            onClick={() => setStartScene(scene.id)}
            disabled={isStart}
            className={`rounded-full px-3 py-1 text-[11px] font-medium ${
              isStart
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]'
            }`}
          >
            {isStart ? '★ Start scene' : 'Set as start'}
          </button>
        </Row>
      </Section>

      <Section title="Notes">
        <textarea
          value={scene.notes ?? ''}
          onChange={(e) => updateNotes(scene.id, e.target.value)}
          placeholder="Scene notes…"
          className="h-20 w-full resize-none rounded-xl bg-[var(--color-panel-2)] px-3 py-2 text-[12px] text-[var(--color-text)] outline-none focus:bg-[var(--color-panel)] focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </Section>

      <ProjectionSettings />

      <div className="px-4 py-4 text-[11px] leading-snug text-[var(--color-text-dim)]">
        Select an object to edit it. Drag from assets or use the toolbar above the canvas.
      </div>
    </div>
  );
}

function ProjectionSettings() {
  const template = useEditor((s) => s.project.template);
  const updateTemplate = useEditor((s) => s.updateTemplate);

  const projection = template.projectionHeightCm ?? 250;
  const viewer = template.viewerHeightCm ?? 170;
  const radius = template.safeRadiusCm ?? 60;

  return (
    <Section title="Projection · safe zone">
      <Row label="Height">
        <NumberField
          prefix="cm"
          value={projection}
          onChange={(v) => updateTemplate({ projectionHeightCm: Math.max(50, v) })}
        />
      </Row>
      <Row label="Viewer">
        <NumberField
          prefix="cm"
          value={viewer}
          onChange={(v) =>
            updateTemplate({
              viewerHeightCm: Math.max(40, Math.min(v, projection)),
            })
          }
        />
      </Row>
      <Row label="Radius">
        <NumberField
          prefix="cm"
          value={radius}
          onChange={(v) => updateTemplate({ safeRadiusCm: Math.max(10, v) })}
        />
      </Row>
      <div className="flex flex-wrap gap-1 pt-1">
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
            onClick={() => updateTemplate({ viewerHeightCm: h })}
            style={
              viewer === h
                ? { background: '#E6007E', color: '#ffffff' }
                : undefined
            }
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
              viewer === h
                ? ''
                : 'bg-[var(--color-panel-2)] text-[var(--color-text-dim)] hover:bg-[var(--color-panel-3)]'
            }`}
          >
            {label} {h}
          </button>
        ))}
      </div>
    </Section>
  );
}
