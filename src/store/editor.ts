import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Project, Scene, SceneObject } from '@/types/project';
import { createProject, createScene, newId } from '@/lib/factory';

export type ViewMode = '2d' | '3d';

export type Guide = { id: string; axis: 'h' | 'v'; position: number };

export type SaveState = 'saved' | 'saving' | 'unsaved';

export type PersonHeightCm = 110 | 150 | 170 | 190;

export type ViewSettings = {
  mode: ViewMode;
  showGrid: boolean;
  showSegments: boolean;
  showSafeZone: boolean;
  safeZonePersonHeight: PersonHeightCm;
  zoom: number;
  panX: number;
  panY: number;
};

export type EditorState = {
  project: Project;
  currentSceneId: string;
  selectedObjectIds: string[];
  view: ViewSettings;
  saveState: SaveState;
  history: {
    past: Project[];
    future: Project[];
  };

  // history
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setSaveState: (state: SaveState) => void;

  // project / scene
  setProject: (project: Project) => void;
  renameProject: (name: string) => void;
  setCurrentScene: (sceneId: string) => void;
  addScene: (name?: string) => string;
  duplicateScene: (sceneId: string) => string | null;
  renameScene: (sceneId: string, name: string) => void;
  deleteScene: (sceneId: string) => void;
  reorderScenes: (orderedIds: string[]) => void;
  setStartScene: (sceneId: string) => void;
  updateSceneBackground: (sceneId: string, color: string) => void;
  updateSceneNotes: (sceneId: string, notes: string) => void;

  // selection
  selectObject: (id: string | null, additive?: boolean) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;

  // objects
  addObject: (object: Omit<SceneObject, 'id' | 'zIndex'>) => string;
  updateObject: (id: string, patch: Partial<SceneObject>) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => string | null;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveObjectToZIndex: (id: string, newZIndex: number) => void;
  nudgeSelection: (dx: number, dy: number) => void;

  // assets
  addAsset: (asset: import('@/types/project').Asset) => void;
  removeAsset: (assetId: string) => void;

  // template settings
  updateTemplate: (
    patch: Partial<import('@/types/project').Template>,
  ) => void;

  // interactions
  addInteraction: (
    objectId: string,
    interaction: Omit<import('@/types/project').Interaction, 'id'>,
  ) => string;
  updateInteraction: (
    objectId: string,
    interactionId: string,
    patch: Partial<import('@/types/project').Interaction>,
  ) => void;
  deleteInteraction: (objectId: string, interactionId: string) => void;

  // preview mode
  previewMode: boolean;
  setPreviewMode: (on: boolean) => void;

  // clipboard
  clipboard: SceneObject[];
  copySelection: () => number;
  pasteClipboard: () => string[];

  // view
  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: number) => void;
  setPan: (panX: number, panY: number) => void;
  toggleGrid: () => void;
  toggleSegments: () => void;
  toggleSafeZone: () => void;
  setSafeZonePersonHeight: (h: PersonHeightCm) => void;
  resetView: () => void;

  // guides
  guides: Guide[];
  addGuide: (axis: 'h' | 'v', position: number) => void;
  updateGuide: (id: string, position: number) => void;
  removeGuide: (id: string) => void;
};

const DEFAULT_VIEW: ViewSettings = {
  mode: '2d',
  showGrid: true,
  showSegments: true,
  showSafeZone: false,
  safeZonePersonHeight: 170,
  zoom: 0.12,
  panX: 0,
  panY: 0,
};

const HISTORY_LIMIT = 100;

const findScene = (project: Project, sceneId: string): Scene | undefined =>
  project.scenes.find((s) => s.id === sceneId);

const touchProject = (project: Project) => {
  project.updatedAt = new Date().toISOString();
};

const reindexZ = (scene: Scene) => {
  scene.objects
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach((obj, i) => {
      obj.zIndex = i;
    });
};

const snapshot = (p: Project): Project =>
  JSON.parse(JSON.stringify(p)) as Project;

export const useEditor = create<EditorState>()(
  immer((set, get) => {
    const initialProject = createProject();
    return {
      project: initialProject,
      currentSceneId: initialProject.startSceneId,
      selectedObjectIds: [],
      view: { ...DEFAULT_VIEW },
      saveState: 'saved',
      history: { past: [], future: [] },
      previewMode: false,
      clipboard: [],
      guides: [],

      pushHistory: () =>
        set((s) => {
          s.history.past.push(snapshot(s.project));
          if (s.history.past.length > HISTORY_LIMIT) s.history.past.shift();
          s.history.future = [];
        }),

      undo: () =>
        set((s) => {
          const prev = s.history.past.pop();
          if (!prev) return;
          s.history.future.push(snapshot(s.project));
          s.project = prev;
          if (!findScene(s.project, s.currentSceneId)) {
            s.currentSceneId = s.project.scenes[0]?.id ?? '';
          }
          s.selectedObjectIds = s.selectedObjectIds.filter((id) =>
            s.project.scenes.some((sc) => sc.objects.some((o) => o.id === id)),
          );
        }),

      redo: () =>
        set((s) => {
          const next = s.history.future.pop();
          if (!next) return;
          s.history.past.push(snapshot(s.project));
          s.project = next;
          if (!findScene(s.project, s.currentSceneId)) {
            s.currentSceneId = s.project.scenes[0]?.id ?? '';
          }
          s.selectedObjectIds = s.selectedObjectIds.filter((id) =>
            s.project.scenes.some((sc) => sc.objects.some((o) => o.id === id)),
          );
        }),

      canUndo: () => get().history.past.length > 0,
      canRedo: () => get().history.future.length > 0,

      setSaveState: (state) =>
        set((s) => {
          s.saveState = state;
        }),

      setProject: (project) =>
        set((s) => {
          s.project = project;
          s.currentSceneId =
            project.startSceneId ?? project.scenes[0]?.id ?? '';
          s.selectedObjectIds = [];
          s.history = { past: [], future: [] };
        }),

      renameProject: (name) => {
        get().pushHistory();
        set((s) => {
          s.project.name = name;
          touchProject(s.project);
        });
      },

      setCurrentScene: (sceneId) =>
        set((s) => {
          if (findScene(s.project, sceneId)) {
            s.currentSceneId = sceneId;
            s.selectedObjectIds = [];
          }
        }),

      addScene: (name) => {
        get().pushHistory();
        const scene = createScene(
          name ?? `Scene ${get().project.scenes.length + 1}`,
        );
        set((s) => {
          s.project.scenes.push(scene);
          s.currentSceneId = scene.id;
          s.selectedObjectIds = [];
          touchProject(s.project);
        });
        return scene.id;
      },

      duplicateScene: (sceneId) => {
        const src = findScene(get().project, sceneId);
        if (!src) return null;
        get().pushHistory();
        const copy: Scene = {
          ...src,
          id: newId('sc_'),
          name: `${src.name} copy`,
          objects: src.objects.map((o) => ({ ...o, id: newId('ob_') })),
        };
        set((s) => {
          const idx = s.project.scenes.findIndex((x) => x.id === sceneId);
          s.project.scenes.splice(idx + 1, 0, copy);
          s.currentSceneId = copy.id;
          s.selectedObjectIds = [];
          touchProject(s.project);
        });
        return copy.id;
      },

      renameScene: (sceneId, name) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, sceneId);
          if (sc) {
            sc.name = name;
            touchProject(s.project);
          }
        });
      },

      deleteScene: (sceneId) => {
        if (get().project.scenes.length <= 1) return;
        get().pushHistory();
        set((s) => {
          const idx = s.project.scenes.findIndex((sc) => sc.id === sceneId);
          if (idx === -1) return;
          s.project.scenes.splice(idx, 1);
          if (s.currentSceneId === sceneId) {
            s.currentSceneId = s.project.scenes[0].id;
            s.selectedObjectIds = [];
          }
          if (s.project.startSceneId === sceneId) {
            s.project.startSceneId = s.project.scenes[0].id;
          }
          touchProject(s.project);
        });
      },

      reorderScenes: (orderedIds) => {
        get().pushHistory();
        set((s) => {
          const map = new Map(s.project.scenes.map((sc) => [sc.id, sc]));
          const reordered = orderedIds
            .map((id) => map.get(id))
            .filter((sc): sc is Scene => Boolean(sc));
          if (reordered.length === s.project.scenes.length) {
            s.project.scenes = reordered;
            touchProject(s.project);
          }
        });
      },

      setStartScene: (sceneId) => {
        get().pushHistory();
        set((s) => {
          if (findScene(s.project, sceneId)) {
            s.project.startSceneId = sceneId;
            touchProject(s.project);
          }
        });
      },

      updateSceneBackground: (sceneId, color) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, sceneId);
          if (sc) {
            sc.background = color;
            touchProject(s.project);
          }
        });
      },

      updateSceneNotes: (sceneId, notes) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, sceneId);
          if (sc) {
            sc.notes = notes;
            touchProject(s.project);
          }
        });
      },

      selectObject: (id, additive = false) =>
        set((s) => {
          if (id === null) {
            s.selectedObjectIds = [];
            return;
          }
          if (additive) {
            const exists = s.selectedObjectIds.includes(id);
            s.selectedObjectIds = exists
              ? s.selectedObjectIds.filter((x) => x !== id)
              : [...s.selectedObjectIds, id];
          } else {
            s.selectedObjectIds = [id];
          }
        }),

      selectMany: (ids) =>
        set((s) => {
          s.selectedObjectIds = [...ids];
        }),

      clearSelection: () =>
        set((s) => {
          s.selectedObjectIds = [];
        }),

      addObject: (object) => {
        get().pushHistory();
        const id = newId('ob_');
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          const zIndex = sc.objects.length;
          sc.objects.push({ ...object, id, zIndex });
          s.selectedObjectIds = [id];
          touchProject(s.project);
        });
        return id;
      },

      updateObject: (id, patch) =>
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          const obj = sc.objects.find((o) => o.id === id);
          if (!obj) return;
          Object.assign(obj, patch);
          touchProject(s.project);
        }),

      deleteObject: (id) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          sc.objects = sc.objects.filter((o) => o.id !== id);
          s.selectedObjectIds = s.selectedObjectIds.filter((x) => x !== id);
          reindexZ(sc);
          touchProject(s.project);
        });
      },

      duplicateObject: (id) => {
        const sc = findScene(get().project, get().currentSceneId);
        if (!sc) return null;
        const src = sc.objects.find((o) => o.id === id);
        if (!src) return null;
        get().pushHistory();
        const copyId = newId('ob_');
        set((s) => {
          const target = findScene(s.project, s.currentSceneId);
          if (!target) return;
          target.objects.push({
            ...src,
            id: copyId,
            x: src.x + 40,
            y: src.y + 40,
            zIndex: target.objects.length,
            interactions: src.interactions
              ? src.interactions.map((it) => ({ ...it, id: newId('it_') }))
              : undefined,
          });
          s.selectedObjectIds = [copyId];
          touchProject(s.project);
        });
        return copyId;
      },

      bringForward: (id) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          const obj = sc.objects.find((o) => o.id === id);
          if (!obj) return;
          const above = sc.objects.find((o) => o.zIndex === obj.zIndex + 1);
          if (above) {
            const tmp = obj.zIndex;
            obj.zIndex = above.zIndex;
            above.zIndex = tmp;
            touchProject(s.project);
          }
        });
      },

      sendBackward: (id) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          const obj = sc.objects.find((o) => o.id === id);
          if (!obj) return;
          const below = sc.objects.find((o) => o.zIndex === obj.zIndex - 1);
          if (below) {
            const tmp = obj.zIndex;
            obj.zIndex = below.zIndex;
            below.zIndex = tmp;
            touchProject(s.project);
          }
        });
      },

      bringToFront: (id) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          const obj = sc.objects.find((o) => o.id === id);
          if (!obj) return;
          obj.zIndex = sc.objects.length + 1;
          reindexZ(sc);
          touchProject(s.project);
        });
      },

      sendToBack: (id) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          const obj = sc.objects.find((o) => o.id === id);
          if (!obj) return;
          obj.zIndex = -1;
          reindexZ(sc);
          touchProject(s.project);
        });
      },

      moveObjectToZIndex: (id, newZIndex) => {
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          const sorted = [...sc.objects].sort((a, b) => a.zIndex - b.zIndex);
          const fromIdx = sorted.findIndex((o) => o.id === id);
          if (fromIdx < 0) return;
          const target = Math.max(0, Math.min(newZIndex, sorted.length - 1));
          if (target === fromIdx) return;
          const [moved] = sorted.splice(fromIdx, 1);
          sorted.splice(target, 0, moved);
          sorted.forEach((o, i) => {
            const ref = sc.objects.find((x) => x.id === o.id);
            if (ref) ref.zIndex = i;
          });
          touchProject(s.project);
        });
      },

      nudgeSelection: (dx, dy) => {
        const ids = get().selectedObjectIds;
        if (ids.length === 0) return;
        get().pushHistory();
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          for (const id of ids) {
            const obj = sc.objects.find((o) => o.id === id);
            if (!obj || obj.locked) continue;
            obj.x += dx;
            obj.y += dy;
          }
          touchProject(s.project);
        });
      },

      addAsset: (asset) => {
        get().pushHistory();
        set((s) => {
          if (!s.project.assets.some((a) => a.id === asset.id)) {
            s.project.assets.push(asset);
            touchProject(s.project);
          }
        });
      },

      removeAsset: (assetId) => {
        get().pushHistory();
        set((s) => {
          s.project.assets = s.project.assets.filter((a) => a.id !== assetId);
          touchProject(s.project);
        });
      },

      updateTemplate: (patch) => {
        get().pushHistory();
        set((s) => {
          Object.assign(s.project.template, patch);
          touchProject(s.project);
        });
      },

      addInteraction: (objectId, interaction) => {
        get().pushHistory();
        const id = newId('it_');
        set((s) => {
          for (const sc of s.project.scenes) {
            const obj = sc.objects.find((o) => o.id === objectId);
            if (obj) {
              if (!obj.interactions) obj.interactions = [];
              obj.interactions.push({ ...interaction, id });
              touchProject(s.project);
              return;
            }
          }
        });
        return id;
      },

      updateInteraction: (objectId, interactionId, patch) => {
        set((s) => {
          for (const sc of s.project.scenes) {
            const obj = sc.objects.find((o) => o.id === objectId);
            if (obj && obj.interactions) {
              const it = obj.interactions.find((x) => x.id === interactionId);
              if (it) {
                Object.assign(it, patch);
                touchProject(s.project);
              }
              return;
            }
          }
        });
      },

      deleteInteraction: (objectId, interactionId) => {
        get().pushHistory();
        set((s) => {
          for (const sc of s.project.scenes) {
            const obj = sc.objects.find((o) => o.id === objectId);
            if (obj && obj.interactions) {
              obj.interactions = obj.interactions.filter(
                (x) => x.id !== interactionId,
              );
              touchProject(s.project);
              return;
            }
          }
        });
      },

      setPreviewMode: (on) =>
        set((s) => {
          s.previewMode = on;
          if (on) s.selectedObjectIds = [];
        }),

      copySelection: () => {
        const state = get();
        const sc = findScene(state.project, state.currentSceneId);
        if (!sc) return 0;
        const picked = sc.objects.filter((o) =>
          state.selectedObjectIds.includes(o.id),
        );
        if (picked.length === 0) return 0;
        const cloned = picked.map((o) => JSON.parse(JSON.stringify(o)) as SceneObject);
        set((s) => {
          s.clipboard = cloned;
        });
        return cloned.length;
      },

      pasteClipboard: () => {
        const state = get();
        if (state.clipboard.length === 0) return [];
        get().pushHistory();
        const newIds: string[] = [];
        set((s) => {
          const sc = findScene(s.project, s.currentSceneId);
          if (!sc) return;
          for (const src of state.clipboard) {
            const id = newId('ob_');
            newIds.push(id);
            sc.objects.push({
              ...src,
              id,
              x: src.x + 40,
              y: src.y + 40,
              zIndex: sc.objects.length,
              interactions: src.interactions
                ? src.interactions.map((it) => ({ ...it, id: newId('it_') }))
                : undefined,
            });
          }
          s.selectedObjectIds = newIds;
          touchProject(s.project);
        });
        return newIds;
      },

      setViewMode: (mode) =>
        set((s) => {
          s.view.mode = mode;
        }),
      setZoom: (zoom) =>
        set((s) => {
          s.view.zoom = Math.max(0.02, Math.min(4, zoom));
        }),
      setPan: (panX, panY) =>
        set((s) => {
          s.view.panX = panX;
          s.view.panY = panY;
        }),
      toggleGrid: () =>
        set((s) => {
          s.view.showGrid = !s.view.showGrid;
        }),
      toggleSegments: () =>
        set((s) => {
          s.view.showSegments = !s.view.showSegments;
        }),
      toggleSafeZone: () =>
        set((s) => {
          s.view.showSafeZone = !s.view.showSafeZone;
        }),
      setSafeZonePersonHeight: (h) =>
        set((s) => {
          s.view.safeZonePersonHeight = h;
        }),
      resetView: () =>
        set((s) => {
          s.view = { ...DEFAULT_VIEW, mode: s.view.mode };
        }),

      addGuide: (axis, position) =>
        set((s) => {
          s.guides.push({ id: newId('g_'), axis, position });
        }),
      updateGuide: (id, position) =>
        set((s) => {
          const g = s.guides.find((x) => x.id === id);
          if (g) g.position = position;
        }),
      removeGuide: (id) =>
        set((s) => {
          s.guides = s.guides.filter((x) => x.id !== id);
        }),
    };
  }),
);

export const useCurrentScene = () =>
  useEditor((s) => s.project.scenes.find((sc) => sc.id === s.currentSceneId));
