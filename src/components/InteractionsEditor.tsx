import { useEditor } from '@/store/editor';
import type {
  ActionType,
  Interaction,
  SceneObject,
  TriggerType,
} from '@/types/project';
import { findIssuesForObject } from '@/lib/validate';
import { useT } from '@/i18n';

export function InteractionsEditor({ obj }: { obj: SceneObject }) {
  const { t } = useT();
  const project = useEditor((s) => s.project);
  const addInteraction = useEditor((s) => s.addInteraction);
  const updateInteraction = useEditor((s) => s.updateInteraction);
  const deleteInteraction = useEditor((s) => s.deleteInteraction);
  const pushHistory = useEditor((s) => s.pushHistory);

  const interactions = obj.interactions ?? [];
  const issues = findIssuesForObject(project, obj.id);

  const TRIGGERS: { value: TriggerType; label: string }[] = [
    { value: 'onClick', label: t.trigger_onClick },
    { value: 'onHover', label: t.trigger_onHover },
    { value: 'onSceneEnter', label: t.trigger_onSceneEnter },
    { value: 'onTimer', label: t.trigger_onTimer },
  ];

  const ACTIONS: { value: ActionType; label: string }[] = [
    { value: 'goToScene', label: t.action_goToScene },
    { value: 'showObject', label: t.action_showObject },
    { value: 'hideObject', label: t.action_hideObject },
    { value: 'toggleObject', label: t.action_toggleObject },
    { value: 'setText', label: t.action_setText },
    { value: 'playVideo', label: t.action_playVideo },
    { value: 'pauseVideo', label: t.action_pauseVideo },
  ];

  const allObjects = project.scenes.flatMap((sc) =>
    sc.objects.map((o) => ({ id: o.id, name: o.name, sceneName: sc.name })),
  );

  return (
    <div className="px-3 pt-1 pb-2">
      {interactions.length === 0 && (
        <div className="mb-2 text-[11px] leading-snug text-[var(--color-text-dim)]">
          {t.interactions_none}
        </div>
      )}
      {interactions.map((it) => {
        const issue = issues.find((i) => i.interactionId === it.id);
        return (
          <InteractionRow
            key={it.id}
            it={it}
            issue={issue?.detail}
            scenes={project.scenes}
            allObjects={allObjects}
            triggers={TRIGGERS}
            actions={ACTIONS}
            t={t}
            onChange={(patch) => {
              pushHistory();
              updateInteraction(obj.id, it.id, patch);
            }}
            onDelete={() => deleteInteraction(obj.id, it.id)}
          />
        );
      })}
      <button
        type="button"
        onClick={() =>
          addInteraction(obj.id, {
            trigger: 'onClick',
            action: 'goToScene',
          })
        }
        className="mt-1 w-full rounded border border-dashed border-[var(--color-border-soft)] px-2 py-1 text-[11px] text-[var(--color-text-dim)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-strong)]"
      >
        {t.interactions_add}
      </button>
    </div>
  );
}

const ACTIONS_NEED_OBJECT: ActionType[] = [
  'showObject',
  'hideObject',
  'toggleObject',
  'setText',
  'playVideo',
  'pauseVideo',
];

function InteractionRow({
  it,
  issue,
  scenes,
  allObjects,
  triggers,
  actions,
  t,
  onChange,
  onDelete,
}: {
  it: Interaction;
  issue: string | undefined;
  scenes: { id: string; name: string }[];
  allObjects: { id: string; name: string; sceneName: string }[];
  triggers: { value: TriggerType; label: string }[];
  actions: { value: ActionType; label: string }[];
  t: ReturnType<typeof useT>['t'];
  onChange: (patch: Partial<Interaction>) => void;
  onDelete: () => void;
}) {
  const needsScene = it.action === 'goToScene';
  const needsObject = ACTIONS_NEED_OBJECT.includes(it.action);
  const needsValue = it.action === 'setText';
  const needsDelay = it.trigger === 'onTimer';

  return (
    <div
      className={`mb-2 rounded border px-2 py-2 ${
        issue
          ? 'border-amber-500/60 bg-amber-500/5'
          : 'border-[var(--color-border-soft)] bg-[var(--color-bg)]'
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
          {it.id.slice(0, 8)}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="text-[var(--color-text-dim)] hover:text-rose-400"
          title={t.interactions_delete}
        >
          ×
        </button>
      </div>

      <Field label={t.interactions_when}>
        <Select
          value={it.trigger}
          onChange={(v) => onChange({ trigger: v as TriggerType })}
          options={triggers}
        />
      </Field>

      {needsDelay && (
        <Field label={t.interactions_delay}>
          <input
            type="number"
            min={0}
            value={it.delayMs ?? 1000}
            onChange={(e) =>
              onChange({ delayMs: Math.max(0, parseInt(e.target.value || '0', 10)) })
            }
            className="w-full rounded border border-[var(--color-border-soft)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-[var(--color-text-strong)] outline-none focus:border-[var(--color-accent)]"
          />
          <span className="ml-1 text-[10px] text-[var(--color-text-dim)]">ms</span>
        </Field>
      )}

      <Field label={t.interactions_then}>
        <Select
          value={it.action}
          onChange={(v) =>
            onChange({ action: v as ActionType, targetId: undefined, value: undefined })
          }
          options={actions}
        />
      </Field>

      {needsScene && (
        <Field label={t.interactions_scene}>
          <Select
            value={it.targetId ?? ''}
            onChange={(v) => onChange({ targetId: v || undefined })}
            options={[
              { value: '', label: t.interactions_pickScene },
              ...scenes.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </Field>
      )}

      {needsObject && (
        <Field label={t.interactions_object}>
          <Select
            value={it.targetId ?? ''}
            onChange={(v) => onChange({ targetId: v || undefined })}
            options={[
              { value: '', label: t.interactions_pickObject },
              ...allObjects.map((o) => ({
                value: o.id,
                label: `${o.name} · ${o.sceneName}`,
              })),
            ]}
          />
        </Field>
      )}

      {needsValue && (
        <Field label={t.interactions_value}>
          <input
            type="text"
            value={it.value ?? ''}
            onChange={(e) => onChange({ value: e.target.value })}
            className="w-full rounded border border-[var(--color-border-soft)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-[var(--color-text-strong)] outline-none focus:border-[var(--color-accent)]"
          />
        </Field>
      )}

      {issue && (
        <div className="mt-1 text-[10px] text-amber-400">⚠ {issue}</div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-1 flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] uppercase text-[var(--color-text-dim)]">
        {label}
      </span>
      <div className="flex flex-1 items-center">{children}</div>
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none rounded border border-[var(--color-border-soft)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-[var(--color-text-strong)] outline-none focus:border-[var(--color-accent)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
