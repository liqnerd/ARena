import type { SceneObject } from '@/types/project';

export function pickObjectAt(
  objects: SceneObject[],
  wx: number,
  wy: number,
): SceneObject | null {
  const sorted = [...objects].sort((a, b) => b.zIndex - a.zIndex);
  for (const o of sorted) {
    if (!o.visible) continue;
    if (
      wx >= o.x &&
      wx <= o.x + o.width &&
      wy >= o.y &&
      wy <= o.y + o.height
    ) {
      return o;
    }
  }
  return null;
}
