import { useState } from 'react';
import { useEditor } from '@/store/editor';
import type { SceneObject } from '@/types/project';
import { useT } from '@/i18n';

const LAYER_DRAG_MIME = 'application/x-arena-layer';

const TYPE_ICON: Record<SceneObject['type'], React.ReactNode> = {
  image: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  svg: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 3 22 12 12 21 2 12 12 3" />
    </svg>
  ),
  video: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  ),
  text: <span className="font-semibold text-[10px]">T</span>,
  hotspot: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  shape: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
    </svg>
  ),
};

export function LayersPanel() {
  const { t } = useT();
  const scenes = useEditor((s) => s.project.scenes);
  const currentSceneId = useEditor((s) => s.currentSceneId);
  const setCurrentScene = useEditor((s) => s.setCurrentScene);
  const selectedIds = useEditor((s) => s.selectedObjectIds);
  const selectObject = useEditor((s) => s.selectObject);
  const updateObject = useEditor((s) => s.updateObject);
  const deleteObject = useEditor((s) => s.deleteObject);
  const moveObjectToZIndex = useEditor((s) => s.moveObjectToZIndex);
  const pushHistory = useEditor((s) => s.pushHistory);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ sceneId: string; idx: number } | null>(
    null,
  );

  function onDrop(sceneId: string, total: number, targetIdx: number) {
    if (!dragId) return;
    const targetZ = total - 1 - targetIdx;
    moveObjectToZIndex(dragId, targetZ);
    setDragId(null);
    setDropTarget(null);
    if (sceneId !== currentSceneId) setCurrentScene(sceneId);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 items-center justify-between border-b border-[var(--color-border)] px-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
          {t.layers_title}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {scenes.map((scene) => {
          const sortedDesc = [...scene.objects].sort((a, b) => b.zIndex - a.zIndex);
          const total = sortedDesc.length;
          const isCollapsed = collapsed[scene.id] ?? false;
          const isCurrent = scene.id === currentSceneId;

          return (
            <div key={scene.id} className="mb-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentScene(scene.id);
                  setCollapsed((c) => ({ ...c, [scene.id]: !c[scene.id] }));
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] font-medium transition ${
                  isCurrent
                    ? 'text-[var(--color-text-strong)]'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-panel-2)]'
                }`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="currentColor"
                  className={`shrink-0 transition ${isCollapsed ? '-rotate-90' : ''}`}
                >
                  <path d="M2 3l3 4 3-4z" />
                </svg>
                <SceneIcon />
                <span className="flex-1 truncate text-left">{scene.name}</span>
              </button>

              {!isCollapsed && (
                <ul className="pb-1">
                  {total === 0 ? (
                    <li className="px-9 py-1 text-[11px] text-[var(--color-text-dim)]">
                      {t.layers_empty}
                    </li>
                  ) : (
                    sortedDesc.map((obj, idx) => {
                      const isSelected = isCurrent && selectedIds.includes(obj.id);
                      const isDragging = dragId === obj.id;
                      const isDropZone =
                        dropTarget?.sceneId === scene.id &&
                        dropTarget?.idx === idx &&
                        dragId !== obj.id;
                      return (
                        <li
                          key={obj.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(LAYER_DRAG_MIME, obj.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDragId(obj.id);
                          }}
                          onDragOver={(e) => {
                            if (!e.dataTransfer.types.includes(LAYER_DRAG_MIME)) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDropTarget({ sceneId: scene.id, idx });
                          }}
                          onDragLeave={() => {
                            if (
                              dropTarget?.sceneId === scene.id &&
                              dropTarget?.idx === idx
                            )
                              setDropTarget(null);
                          }}
                          onDrop={(e) => {
                            if (!e.dataTransfer.types.includes(LAYER_DRAG_MIME)) return;
                            e.preventDefault();
                            onDrop(scene.id, total, idx);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setDropTarget(null);
                          }}
                          onClick={(e) => {
                            if (!isCurrent) setCurrentScene(scene.id);
                            selectObject(obj.id, e.shiftKey);
                          }}
                          className={`group mx-2 flex cursor-pointer items-center gap-2 rounded-md pl-7 pr-2 py-1.5 text-[12px] transition ${
                            isSelected
                              ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                              : 'text-[var(--color-text)] hover:bg-[var(--color-panel-2)]'
                          } ${isDragging ? 'opacity-40' : ''} ${
                            isDropZone
                              ? 'ring-1 ring-[var(--color-accent)] ring-inset'
                              : ''
                          }`}
                          title={`zIndex ${obj.zIndex}`}
                        >
                          <span className="w-3 shrink-0 text-center text-[var(--color-text-dim)]">
                            {TYPE_ICON[obj.type]}
                          </span>
                          <span className="flex-1 truncate">
                            {obj.name || `${obj.type} ${obj.id.slice(-4)}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              pushHistory();
                              updateObject(obj.id, { locked: !obj.locked });
                            }}
                            title={obj.locked ? t.layers_unlock : t.layers_lock}
                            className={`h-4 w-4 shrink-0 transition ${
                              obj.locked
                                ? 'text-[var(--color-text)]'
                                : 'text-[var(--color-text-dim)] opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {obj.locked ? <LockClosed /> : <LockOpen />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              pushHistory();
                              updateObject(obj.id, { visible: !obj.visible });
                            }}
                            title={obj.visible ? t.layers_hide : t.layers_show}
                            className={`h-4 w-4 shrink-0 transition ${
                              !obj.visible
                                ? 'text-[var(--color-text)]'
                                : 'text-[var(--color-text-dim)] opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {obj.visible ? <EyeOpen /> : <EyeClosed />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteObject(obj.id);
                            }}
                            title={t.layers_delete}
                            className="hidden h-4 w-4 shrink-0 items-center justify-center text-[var(--color-text-dim)] hover:text-rose-500 group-hover:flex"
                          >
                            ×
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SceneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function EyeOpen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosed() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 3l18 18M10.5 6.2A10 10 0 0112 6c6.5 0 10 7 10 7a17 17 0 01-3 3.6M6.6 6.6A17 17 0 002 12s3.5 7 10 7a10 10 0 005-1.4" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </svg>
  );
}

function LockClosed() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  );
}

function LockOpen() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 017.5-2" />
    </svg>
  );
}
