import type {
  Interaction,
  Project,
  Scene,
  SceneObject,
  TextObjectProps,
} from '@/types/project';

export type ObjectOverride = {
  visible?: boolean;
  text?: string;
  videoState?: 'play' | 'pause';
};

export type PreviewState = {
  currentSceneId: string;
  overrides: Map<string, ObjectOverride>;
};

export type RuntimeApi = {
  getState: () => PreviewState;
  goToScene: (sceneId: string) => void;
  setObjectVisible: (id: string, v: boolean) => void;
  toggleObject: (id: string) => void;
  setObjectText: (id: string, text: string) => void;
  setVideoState: (id: string, v: 'play' | 'pause') => void;
  trigger: (
    obj: SceneObject,
    triggerType: Interaction['trigger'],
  ) => void;
};

export function applyOverrides(
  obj: SceneObject,
  overrides: Map<string, ObjectOverride>,
): SceneObject {
  const o = overrides.get(obj.id);
  if (!o) return obj;
  let next = obj;
  if (o.visible !== undefined && o.visible !== obj.visible) {
    next = { ...next, visible: o.visible };
  }
  if (o.text !== undefined && obj.type === 'text') {
    next = {
      ...next,
      props: { ...(next.props as TextObjectProps), content: o.text },
    };
  }
  return next;
}

export function findObject(
  project: Project,
  objectId: string,
): { scene: Scene; object: SceneObject } | null {
  for (const sc of project.scenes) {
    const obj = sc.objects.find((o) => o.id === objectId);
    if (obj) return { scene: sc, object: obj };
  }
  return null;
}

export function executeAction(
  api: RuntimeApi,
  project: Project,
  it: Interaction,
): void {
  switch (it.action) {
    case 'goToScene':
      if (it.targetId && project.scenes.some((s) => s.id === it.targetId)) {
        api.goToScene(it.targetId);
      }
      return;
    case 'showObject':
      if (it.targetId) api.setObjectVisible(it.targetId, true);
      return;
    case 'hideObject':
      if (it.targetId) api.setObjectVisible(it.targetId, false);
      return;
    case 'toggleObject':
      if (it.targetId) api.toggleObject(it.targetId);
      return;
    case 'setText':
      if (it.targetId) api.setObjectText(it.targetId, it.value ?? '');
      return;
    case 'playVideo':
      if (it.targetId) api.setVideoState(it.targetId, 'play');
      return;
    case 'pauseVideo':
      if (it.targetId) api.setVideoState(it.targetId, 'pause');
      return;
  }
}
