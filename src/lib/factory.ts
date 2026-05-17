import { nanoid } from 'nanoid';
import {
  DEFAULT_TEMPLATE,
  PROJECT_SCHEMA_VERSION,
  type Project,
  type Scene,
} from '@/types/project';

export const newId = (prefix = '') => `${prefix}${nanoid(10)}`;

export const createScene = (name = 'Scene 1'): Scene => ({
  id: newId('sc_'),
  name,
  background: '#1a1b1e',
  objects: [],
});

export const createProject = (name = 'Untitled ARena project'): Project => {
  const now = new Date().toISOString();
  const firstScene = createScene('Scene 1');
  return {
    id: newId('pr_'),
    name,
    version: PROJECT_SCHEMA_VERSION,
    template: { ...DEFAULT_TEMPLATE },
    startSceneId: firstScene.id,
    assets: [],
    scenes: [firstScene],
    createdAt: now,
    updatedAt: now,
  };
};
