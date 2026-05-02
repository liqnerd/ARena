import {
  DEFAULT_TEMPLATE,
  PROJECT_SCHEMA_VERSION,
  type Project,
  type Scene,
  type SceneObject,
} from '@/types/project';
import { newId } from '@/lib/factory';

const T = DEFAULT_TEMPLATE;

const obj = (
  partial: Omit<SceneObject, 'id' | 'zIndex'> & { zIndex?: number },
  i: number,
): SceneObject => ({
  id: newId('ob_'),
  zIndex: partial.zIndex ?? i,
  ...partial,
});

export function createDemoProject(): Project {
  const sceneIntroId = `sc_intro_${newId('').slice(0, 6)}`;
  const sceneTwoId = `sc_two_${newId('').slice(0, 6)}`;
  const sceneThreeId = `sc_three_${newId('').slice(0, 6)}`;

  const intro: Scene = {
    id: sceneIntroId,
    name: 'Intro',
    background: '#0f1014',
    objects: [
      obj(
        {
          type: 'shape',
          name: 'Accent bar',
          x: T.width / 2 - 800,
          y: T.height / 2 - 350,
          width: 1600,
          height: 6,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: { shape: 'rect', fill: '#ec4899' },
        },
        0,
      ),
      obj(
        {
          type: 'text',
          name: 'Title',
          x: T.width / 2 - 1100,
          y: T.height / 2 - 300,
          width: 2200,
          height: 320,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: {
            content: 'ARena',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 280,
            fontWeight: 800,
            color: '#ffffff',
            align: 'center',
          },
        },
        1,
      ),
      obj(
        {
          type: 'text',
          name: 'Subtitle',
          x: T.width / 2 - 1100,
          y: T.height / 2 + 80,
          width: 2200,
          height: 120,
          rotation: 0,
          opacity: 0.8,
          visible: true,
          locked: false,
          props: {
            content: '360° cylindrical scene composition',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 64,
            fontWeight: 400,
            color: '#d4d6dc',
            align: 'center',
          },
        },
        2,
      ),
      obj(
        {
          type: 'hotspot',
          name: 'Continue →',
          x: T.width / 2 - 300,
          y: T.height - 700,
          width: 600,
          height: 220,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: { label: 'CONTINUE →', invisible: false },
          interactions: [
            {
              id: newId('it_'),
              trigger: 'onClick',
              action: 'goToScene',
              targetId: sceneTwoId,
            },
          ],
        },
        3,
      ),
    ],
  };

  const two: Scene = {
    id: sceneTwoId,
    name: 'Cylinder map',
    background: '#22252d',
    objects: [
      obj(
        {
          type: 'text',
          name: 'Heading',
          x: 200,
          y: 280,
          width: T.width - 400,
          height: 140,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: {
            content: 'SIX SEGMENTS',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 120,
            fontWeight: 700,
            color: '#ec4899',
            align: 'center',
          },
        },
        0,
      ),
      ...Array.from({ length: 6 }).map((_, i) =>
        obj(
          {
            type: 'shape',
            name: `Block ${i + 1}`,
            x: i * (T.width / 6) + 80,
            y: T.height / 2 - 360,
            width: T.width / 6 - 160,
            height: 720,
            rotation: 0,
            opacity: 0.85,
            visible: true,
            locked: false,
            props: {
              shape: 'rect',
              fill: i % 2 === 0 ? '#ec4899' : '#3b82f6',
              cornerRadius: 24,
            },
          },
          1 + i,
        ),
      ),
      obj(
        {
          type: 'hotspot',
          name: 'Next',
          x: T.width / 2 - 250,
          y: T.height - 600,
          width: 500,
          height: 180,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: { label: 'OUTRO →', invisible: false },
          interactions: [
            {
              id: newId('it_'),
              trigger: 'onClick',
              action: 'goToScene',
              targetId: sceneThreeId,
            },
          ],
        },
        7,
      ),
      obj(
        {
          type: 'hotspot',
          name: 'Back',
          x: 200,
          y: T.height - 600,
          width: 500,
          height: 180,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: { label: '← BACK', invisible: false },
          interactions: [
            {
              id: newId('it_'),
              trigger: 'onClick',
              action: 'goToScene',
              targetId: sceneIntroId,
            },
          ],
        },
        8,
      ),
    ],
  };

  const three: Scene = {
    id: sceneThreeId,
    name: 'Outro',
    background: '#ec4899',
    objects: [
      obj(
        {
          type: 'text',
          name: 'Outro',
          x: T.width / 2 - 1100,
          y: T.height / 2 - 200,
          width: 2200,
          height: 400,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: {
            content: 'THANK YOU',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 320,
            fontWeight: 800,
            color: '#0f1014',
            align: 'center',
          },
        },
        0,
      ),
      obj(
        {
          type: 'hotspot',
          name: 'Restart',
          x: T.width / 2 - 250,
          y: T.height - 600,
          width: 500,
          height: 180,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: { label: '↺ RESTART', invisible: false },
          interactions: [
            {
              id: newId('it_'),
              trigger: 'onClick',
              action: 'goToScene',
              targetId: sceneIntroId,
            },
          ],
        },
        1,
      ),
    ],
  };

  const now = new Date().toISOString();
  return {
    id: newId('pr_'),
    name: 'ARena demo',
    version: PROJECT_SCHEMA_VERSION,
    template: { ...T },
    startSceneId: sceneIntroId,
    assets: [],
    scenes: [intro, two, three],
    createdAt: now,
    updatedAt: now,
  };
}
