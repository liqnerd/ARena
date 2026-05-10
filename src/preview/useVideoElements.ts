import { useEffect, useRef } from 'react';
import type { SceneObject, VideoObjectProps } from '@/types/project';
import { getAssetObjectUrl } from '@/lib/assets';

// Manages a pool of HTMLVideoElement per scene object id.
// Returned map is stable (same Map object, mutated in place) — safe to read in useFrame.
export function useVideoElements(objects: SceneObject[]): Map<string, HTMLVideoElement> {
  const mapRef = useRef(new Map<string, HTMLVideoElement>());

  useEffect(() => {
    const map = mapRef.current;
    const videoObjs = objects.filter((o) => o.type === 'video');
    const needed = new Set(videoObjs.map((o) => o.id));

    for (const id of [...map.keys()]) {
      if (!needed.has(id)) {
        const v = map.get(id)!;
        v.pause();
        v.removeAttribute('src');
        v.load();
        map.delete(id);
      }
    }

    for (const obj of videoObjs) {
      if (map.has(obj.id)) continue;
      const props = obj.props as VideoObjectProps;
      const v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.crossOrigin = 'anonymous';
      map.set(obj.id, v);
      getAssetObjectUrl(props.assetId).then((url) => {
        if (!url || !map.has(obj.id)) return;
        v.src = url;
        v.play().catch(() => {});
      });
    }
  }, [objects]);

  useEffect(() => {
    return () => {
      for (const v of mapRef.current.values()) {
        v.pause();
        v.removeAttribute('src');
        v.load();
      }
      mapRef.current.clear();
    };
  }, []);

  return mapRef.current;
}
