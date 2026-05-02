import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@/store/editor';
import type {
  Interaction,
  Project,
  SceneObject,
} from '@/types/project';
import {
  applyOverrides,
  executeAction,
  findObject,
  type ObjectOverride,
  type RuntimeApi,
} from '@/preview/runtime';

type Overrides = Map<string, ObjectOverride>;

export function usePreviewRuntime() {
  const previewMode = useEditor((s) => s.previewMode);
  const project = useEditor((s) => s.project);
  const editorSceneId = useEditor((s) => s.currentSceneId);

  const [previewSceneId, setPreviewSceneId] = useState<string>(editorSceneId);
  const [overrides, setOverrides] = useState<Overrides>(new Map());
  const timersRef = useRef<number[]>([]);

  // Reset state when entering preview
  useEffect(() => {
    if (previewMode) {
      setPreviewSceneId(project.startSceneId || editorSceneId);
      setOverrides(new Map());
    } else {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    }
  }, [previewMode, project.startSceneId, editorSceneId]);

  const api: RuntimeApi = useMemo(
    () => ({
      getState: () => ({ currentSceneId: previewSceneId, overrides }),
      goToScene: (sceneId) => setPreviewSceneId(sceneId),
      setObjectVisible: (id, v) =>
        setOverrides((m) => {
          const next = new Map(m);
          next.set(id, { ...next.get(id), visible: v });
          return next;
        }),
      toggleObject: (id) =>
        setOverrides((m) => {
          const next = new Map(m);
          const found = findObject(project, id);
          const baseVisible = found?.object.visible ?? true;
          const cur = next.get(id);
          const curVisible = cur?.visible ?? baseVisible;
          next.set(id, { ...cur, visible: !curVisible });
          return next;
        }),
      setObjectText: (id, text) =>
        setOverrides((m) => {
          const next = new Map(m);
          next.set(id, { ...next.get(id), text });
          return next;
        }),
      setVideoState: (id, v) =>
        setOverrides((m) => {
          const next = new Map(m);
          next.set(id, { ...next.get(id), videoState: v });
          return next;
        }),
      trigger: (obj, triggerType) => {
        const interactions =
          (obj.interactions ?? []).filter((it) => it.trigger === triggerType);
        for (const it of interactions) runWithDelay(api, project, it);
      },
    }),
    [overrides, previewSceneId, project],
  );

  const runWithDelay = useCallback(
    (apiArg: RuntimeApi, projectArg: Project, it: Interaction) => {
      const delay = it.trigger === 'onTimer' ? Math.max(0, it.delayMs ?? 0) : 0;
      if (delay > 0) {
        const id = window.setTimeout(() => {
          executeAction(apiArg, projectArg, it);
          timersRef.current = timersRef.current.filter((t) => t !== id);
        }, delay);
        timersRef.current.push(id);
      } else {
        executeAction(apiArg, projectArg, it);
      }
    },
    [],
  );

  // Fire onSceneEnter / onTimer when scene changes (in preview)
  useEffect(() => {
    if (!previewMode) return;
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    const scene = project.scenes.find((s) => s.id === previewSceneId);
    if (!scene) return;
    for (const obj of scene.objects) {
      for (const it of obj.interactions ?? []) {
        if (it.trigger === 'onSceneEnter' || it.trigger === 'onTimer') {
          runWithDelay(api, project, it);
        }
      }
    }
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [previewMode, previewSceneId, project, api, runWithDelay]);

  const previewScene = useMemo(
    () => project.scenes.find((s) => s.id === previewSceneId),
    [project, previewSceneId],
  );

  const resolvedObjects: SceneObject[] = useMemo(() => {
    if (!previewScene) return [];
    return previewScene.objects.map((o) => applyOverrides(o, overrides));
  }, [previewScene, overrides]);

  const handleObjectClick = useCallback(
    (objectId: string) => {
      const found = findObject(project, objectId);
      if (!found) return;
      api.trigger(found.object, 'onClick');
    },
    [api, project],
  );

  const handleObjectHover = useCallback(
    (objectId: string) => {
      const found = findObject(project, objectId);
      if (!found) return;
      api.trigger(found.object, 'onHover');
    },
    [api, project],
  );

  return {
    previewScene,
    previewSceneId,
    resolvedObjects,
    handleObjectClick,
    handleObjectHover,
    setPreviewSceneId,
  };
}
