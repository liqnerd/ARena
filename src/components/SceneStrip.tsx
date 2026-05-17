import { useEditor } from '@/store/editor';
import { sceneIsReferenced } from '@/lib/validate';
import { useT } from '@/i18n';

export function SceneStrip({ onCollapse }: { onCollapse: () => void }) {
  const { t, lang } = useT();
  const scenes = useEditor((s) => s.project.scenes);
  const currentSceneId = useEditor((s) => s.currentSceneId);
  const startSceneId = useEditor((s) => s.project.startSceneId);
  const setCurrentScene = useEditor((s) => s.setCurrentScene);
  const addScene = useEditor((s) => s.addScene);
  const duplicateScene = useEditor((s) => s.duplicateScene);
  const deleteScene = useEditor((s) => s.deleteScene);

  return (
    <footer
      className="flex h-[88px] shrink-0 items-center gap-3 border-t border-[var(--color-border-soft)] px-4"
      style={{
        background: 'var(--glass-bar)',
        backdropFilter: 'var(--glass-blur-md)',
        WebkitBackdropFilter: 'var(--glass-blur-md)',
      }}
    >
      {scenes.map((scene, i) => {
        const active = scene.id === currentSceneId;
        const isStart = scene.id === startSceneId;
        return (
          <div key={scene.id} className="flex shrink-0 flex-col items-start gap-1">
            <div
              className={`group relative h-[54px] w-[96px] cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-150 ${
                active
                  ? 'border-[var(--color-accent)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-dim)]'
              }`}
              onClick={() => setCurrentScene(scene.id)}
              style={{
                background: scene.background ?? '#1a1b1e',
                ...(active
                  ? { boxShadow: '0 0 0 3px rgba(230,0,126,0.15), 0 2px 8px rgba(230,0,126,0.12)' }
                  : {}),
              }}
            >
              <ThumbnailGuides />
              {isStart && (
                <div className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E6007E] text-[8px] font-semibold text-[#ffffff]">
                  ★
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-0.5 bg-gradient-to-t from-black/30 to-transparent px-1 pt-2 pb-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateScene(scene.id);
                  }}
                  title={t.strip_duplicate}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] text-[var(--color-text)] hover:bg-white"
                >
                  ⎘
                </button>
                {scenes.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const refs = sceneIsReferenced(
                        useEditor.getState().project,
                        scene.id,
                      );
                      const msg = refs
                        ? lang === 'cs'
                          ? `Smazat "${scene.name}"? ${refs} interakce${refs > 1 ? (refs < 5 ? '' : '') : ''} cílí na tuto scénu a stanou se neplatné.`
                          : `Delete "${scene.name}"? ${refs} interaction${refs > 1 ? 's' : ''} target${refs > 1 ? '' : 's'} this scene and will become invalid.`
                        : lang === 'cs'
                          ? `Smazat "${scene.name}"?`
                          : `Delete "${scene.name}"?`;
                      if (confirm(msg)) deleteScene(scene.id);
                    }}
                    title={t.strip_delete}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] text-[var(--color-text)] hover:bg-rose-500 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 px-0.5">
              <span className="text-[10px] tabular-nums text-[var(--color-text-dim)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={`truncate text-[11px] ${
                  active
                    ? 'font-semibold text-[var(--color-text-strong)]'
                    : 'text-[var(--color-text)]'
                }`}
                style={{ maxWidth: '90px' }}
              >
                {scene.name}
              </span>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => addScene()}
        className="flex h-[54px] shrink-0 items-center gap-1.5 rounded-xl px-4 text-[12px] font-medium text-white transition hover:brightness-95"
        style={{
          background: 'var(--color-accent-gradient)',
          boxShadow: '0 4px 16px rgba(230,0,126,0.25)',
        }}
      >
        <span className="text-[14px] leading-none">+</span> {t.strip_new.replace('+ ', '')}
      </button>
      <div className="ml-auto flex items-center">
        <button
          type="button"
          onClick={onCollapse}
          title={t.strip_collapse}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-dim)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
        >
          ⌄
        </button>
      </div>
    </footer>
  );
}

function ThumbnailGuides() {
  const segments = 6;
  return (
    <svg
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      {Array.from({ length: segments }).map((_, i) => (
        <rect
          key={i}
          x={i * (100 / segments)}
          y={0}
          width={0.4}
          height={36}
          fill="rgba(230,0,126,0.5)"
        />
      ))}
    </svg>
  );
}
