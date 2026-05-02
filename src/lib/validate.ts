import type { ActionType, Project, SceneObject } from '@/types/project';

export type RefIssue = {
  sceneId: string;
  objectId: string;
  interactionId: string;
  kind: 'missing-scene' | 'missing-object' | 'missing-target';
  detail: string;
};

const ACTIONS_NEED_OBJECT: ActionType[] = [
  'showObject',
  'hideObject',
  'toggleObject',
  'setText',
  'playVideo',
  'pauseVideo',
];

export function findReferenceIssues(project: Project): RefIssue[] {
  const issues: RefIssue[] = [];
  const sceneIds = new Set(project.scenes.map((s) => s.id));
  const objectIndex = new Map<string, SceneObject>();
  for (const sc of project.scenes) {
    for (const obj of sc.objects) objectIndex.set(obj.id, obj);
  }

  for (const sc of project.scenes) {
    for (const obj of sc.objects) {
      for (const it of obj.interactions ?? []) {
        if (it.action === 'goToScene') {
          if (!it.targetId || !sceneIds.has(it.targetId)) {
            issues.push({
              sceneId: sc.id,
              objectId: obj.id,
              interactionId: it.id,
              kind: 'missing-scene',
              detail: it.targetId
                ? `Scene "${it.targetId}" no longer exists`
                : 'No target scene set',
            });
          }
        } else if (ACTIONS_NEED_OBJECT.includes(it.action)) {
          if (!it.targetId || !objectIndex.has(it.targetId)) {
            issues.push({
              sceneId: sc.id,
              objectId: obj.id,
              interactionId: it.id,
              kind: 'missing-object',
              detail: it.targetId
                ? `Object "${it.targetId}" no longer exists`
                : 'No target object set',
            });
          }
        }
      }
    }
  }
  return issues;
}

export function findIssuesForObject(
  project: Project,
  objectId: string,
): RefIssue[] {
  return findReferenceIssues(project).filter((i) => i.objectId === objectId);
}

export function sceneIsReferenced(project: Project, sceneId: string): number {
  let n = 0;
  for (const sc of project.scenes) {
    for (const obj of sc.objects) {
      for (const it of obj.interactions ?? []) {
        if (it.action === 'goToScene' && it.targetId === sceneId) n++;
      }
    }
  }
  return n;
}

export function objectIsReferenced(
  project: Project,
  objectId: string,
): number {
  let n = 0;
  for (const sc of project.scenes) {
    for (const obj of sc.objects) {
      for (const it of obj.interactions ?? []) {
        if (it.targetId === objectId) n++;
      }
    }
  }
  return n;
}
