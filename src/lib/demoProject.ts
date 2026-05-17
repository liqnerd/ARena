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
          x: T.width / 2 - 705,
          y: T.height / 2 - 309,
          width: 1411,
          height: 5,
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
          x: T.width / 2 - 970,
          y: T.height / 2 - 265,
          width: 1942,
          height: 282,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: {
            content: 'ARena',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 247,
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
          x: T.width / 2 - 970,
          y: T.height / 2 + 71,
          width: 1942,
          height: 106,
          rotation: 0,
          opacity: 0.8,
          visible: true,
          locked: false,
          props: {
            content: '360° cylindrical scene composition',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 56,
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
          x: T.width / 2 - 265,
          y: T.height - 617,
          width: 529,
          height: 194,
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
          x: 176,
          y: 247,
          width: T.width - 353,
          height: 123,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: {
            content: 'SIX SEGMENTS',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 106,
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
            x: i * (T.width / 6) + 71,
            y: T.height / 2 - 317,
            width: T.width / 6 - 141,
            height: 635,
            rotation: 0,
            opacity: 0.85,
            visible: true,
            locked: false,
            props: {
              shape: 'rect',
              fill: i % 2 === 0 ? '#ec4899' : '#3b82f6',
              cornerRadius: 21,
            },
          },
          1 + i,
        ),
      ),
      obj(
        {
          type: 'hotspot',
          name: 'Next',
          x: T.width / 2 - 220,
          y: T.height - 529,
          width: 441,
          height: 159,
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
          x: 176,
          y: T.height - 529,
          width: 441,
          height: 159,
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
          x: T.width / 2 - 970,
          y: T.height / 2 - 176,
          width: 1942,
          height: 353,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          props: {
            content: 'THANK YOU',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 282,
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
          x: T.width / 2 - 220,
          y: T.height - 529,
          width: 441,
          height: 159,
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
