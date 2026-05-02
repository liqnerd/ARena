import type { Project, Scene } from '@/types/project';
import { renderSceneToCanvas } from '@/lib/renderScene';

export async function sceneToPngBlob(
  scene: Scene,
  project: Project,
  width = 2048,
): Promise<Blob | null> {
  const canvas = await renderSceneToCanvas(scene, project.template, {
    width,
    showGuides: false,
  });
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
}
