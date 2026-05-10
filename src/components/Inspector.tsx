import { useEditor, useCurrentScene } from '@/store/editor';
import type {
  HotspotObjectProps,
  SceneObject,
  ShapeObjectProps,
  TextObjectProps,
  VideoObjectProps,
} from '@/types/project';
import { InteractionsEditor } from '@/components/InteractionsEditor';
import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

const FONTS = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Arial Black', value: '"Arial Black", sans-serif' },
];

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const matched = FONTS.find((f) => f.value === value);
  const displayLabel = matched ? matched.label : value.split(',')[0].replace(/"/g, '');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-full bg-[var(--color-panel-2)] px-3 py-1.5 text-[12px] text-[var(--color-text-strong)] outline-none hover:bg-[var(--color-panel-3)] focus:ring-1 focus:ring-[var(--color-accent)]"
      >
        <span style={{ fontFamily: value }}>{displayLabel}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-1 shrink-0 opacity-50">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-[var(--glass-border)]"
          style={{
            background: 'var(--glass-float)',
            backdropFilter: 'var(--glass-blur-md)',
            WebkitBackdropFilter: 'var(--glass-blur-md)',
            boxShadow: 'var(--shadow-float-strong)',
          }}
        >
          {FONTS.map((font) => (
            <button
              key={font.value}
              type="button"
              onClick={() => { onChange(font.value); setOpen(false); }}
              className={`flex w-full items-center px-3 py-2 text-left text-[13px] hover:bg-[var(--color-panel-2)] ${value === font.value ? 'text-[#E6007E]' : 'text-[var(--color-text-strong)]'}`}
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Inspector() {
  const scene = useCurrentScene();
  const selectedIds = useEditor((s) => s.selectedObjectIds);
  const selected = scene?.objects.find((o) => selectedIds.includes(o.id));

  return (
    <aside
      className="flex w-[300px] shrink-0 flex-col border-l border-[var(--color-border-soft)]"
      style={{
        background: 'var(--glass-panel)',
        backdropFilter: 'var(--glass-blur-sm)',
        WebkitBackdropFilter: 'var(--glass-blur-sm)',
      }}
    >
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
      <div className="mb-2.5 flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--color-border-soft)]" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
          {title}
        </span>
        <div className="h-px flex-1 bg-[var(--color-border-soft)]" />
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
        <span className="w-16 shrink-0 text-[12px] text-[var(--color-text)]">
          {label}
        </span>
      )}
      <div className="flex flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

function NumberField({
  prefix,
  suffix,
  value,
  onChange,
  step = 1,
}: {
  prefix?: string;
  suffix?: string;
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
      {suffix && (
        <span className="shrink-0 text-[10px] font-semibold text-[var(--color-text-dim)]">
          {suffix}
        </span>
      )}
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hex = value.startsWith('#') ? value : `#${value}`;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-full bg-[var(--color-panel-2)] px-2 py-1 transition hover:bg-[var(--color-panel-3)]"
      >
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-[var(--color-border)]"
          style={{ background: hex }}
        />
        <span className="w-full text-left text-[11px] uppercase tracking-wider text-[var(--color-text-strong)]">
          {hex.replace('#', '')}
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[var(--glass-border)] p-3"
          style={{
            background: 'var(--glass-float)',
            backdropFilter: 'var(--glass-blur-lg)',
            WebkitBackdropFilter: 'var(--glass-blur-lg)',
            boxShadow: 'var(--shadow-float-strong)',
          }}
        >
          <HexColorPicker color={hex} onChange={onChange} />
          <div className="mt-2 flex items-center gap-2 rounded-full bg-[var(--color-panel-2)] px-3 py-1.5">
            <span className="text-[11px] text-[var(--color-text-dim)]">#</span>
            <input
              type="text"
              value={hex.replace('#', '').toUpperCase()}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                if (raw.length === 6) onChange(`#${raw}`);
              }}
              className="w-full bg-transparent text-[12px] uppercase tracking-widest text-[var(--color-text-strong)] outline-none"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
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
            {obj.locked ? <IcoLockClosed /> : <IcoLockOpen />}
          </IconButton>
          <IconButton
            onClick={() => commit({ visible: !obj.visible })}
            active={!obj.visible}
            title={obj.visible ? 'Hide' : 'Show'}
          >
            {obj.visible ? <IcoEyeOpen /> : <IcoEyeClosed />}
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
            <IcoRotateCCW />
          </button>
          <button
            type="button"
            onClick={() => commit({ rotation: obj.rotation + 90 })}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
            title="Rotate 90°"
          >
            <IcoRotateCW />
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
            className="flex h-7 flex-1 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
          >
            <IcoToFront />
          </button>
          <button
            type="button"
            onClick={() => bringForward(obj.id)}
            title="Bring forward"
            className="flex h-7 flex-1 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
          >
            <IcoForward />
          </button>
          <button
            type="button"
            onClick={() => sendBackward(obj.id)}
            title="Send backward"
            className="flex h-7 flex-1 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
          >
            <IcoBackward />
          </button>
          <button
            type="button"
            onClick={() => sendToBack(obj.id)}
            title="Send to back"
            className="flex h-7 flex-1 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-text)] hover:bg-[var(--color-panel-3)]"
          >
            <IcoToBack />
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
          <FontSelect value={props.fontFamily} onChange={(v) => { pushHistory(); patch({ fontFamily: v }); }} />
        </Row>
        <Row label="Size">
          <NumberField
            prefix="sz"
            value={props.fontSize}
            onChange={(v) => {
              pushHistory();
              patch({ fontSize: Math.max(1, v) });
            }}
          />
          <NumberField
            prefix="wt"
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
            {(['left', 'center', 'right'] as const).map((a) => {
              const active = props.align === a;
              const fill = active ? '#ffffff' : 'var(--color-text)';
              return (
                <button
                  key={a}
                  type="button"
                  title={a[0].toUpperCase() + a.slice(1)}
                  onClick={() => { pushHistory(); patch({ align: a }); }}
                  className={`flex flex-1 items-center justify-center rounded-full py-1.5 transition ${
                    active
                      ? 'bg-[#E6007E]'
                      : 'bg-[var(--color-panel-2)] hover:bg-[var(--color-panel-3)]'
                  }`}
                >
                  {a === 'left' && (
                    <svg width="16" height="16" viewBox="0 0 16 16">
                      <rect x="1" y="2" width="1.5" height="12" rx="0.75" fill={fill}/>
                      <rect x="3.5" y="3.5" width="9" height="2.5" rx="1" fill={fill}/>
                      <rect x="3.5" y="10" width="6" height="2.5" rx="1" fill={fill}/>
                    </svg>
                  )}
                  {a === 'center' && (
                    <svg width="16" height="16" viewBox="0 0 16 16">
                      <rect x="7.25" y="2" width="1.5" height="12" rx="0.75" fill={fill}/>
                      <rect x="3" y="3.5" width="10" height="2.5" rx="1" fill={fill}/>
                      <rect x="4.5" y="10" width="7" height="2.5" rx="1" fill={fill}/>
                    </svg>
                  )}
                  {a === 'right' && (
                    <svg width="16" height="16" viewBox="0 0 16 16">
                      <rect x="13.5" y="2" width="1.5" height="12" rx="0.75" fill={fill}/>
                      <rect x="3.5" y="3.5" width="9" height="2.5" rx="1" fill={fill}/>
                      <rect x="5.5" y="10" width="7" height="2.5" rx="1" fill={fill}/>
                    </svg>
                  )}
                </button>
              );
            })}
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
              suffix="px"
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

function IcoLockClosed() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  );
}

function IcoLockOpen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 017.5-2" />
    </svg>
  );
}

function IcoEyeOpen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IcoEyeClosed() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 3l18 18M10.5 6.2A10 10 0 0112 6c6.5 0 10 7 10 7a17 17 0 01-3 3.6M6.6 6.6A17 17 0 002 12s3.5 7 10 7a10 10 0 005-1.4" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </svg>
  );
}

function IcoRotateCCW() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 109-9H3" />
      <path d="M3 3v6h6" />
    </svg>
  );
}

function IcoRotateCW() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-9-9h9" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function IcoToFront() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
      <line x1="5" y1="21" x2="19" y2="21" />
    </svg>
  );
}

function IcoForward() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function IcoBackward() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function IcoToBack() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
      <line x1="5" y1="3" x2="19" y2="3" />
    </svg>
  );
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

      <div className="px-4 py-4 text-[11px] leading-snug text-[var(--color-text-dim)]">
        Select an object to edit it. Drag from assets or use the toolbar above the canvas.
      </div>
    </div>
  );
}

