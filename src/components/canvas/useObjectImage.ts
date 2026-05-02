import { useEffect, useState } from 'react';
import { getAssetObjectUrl } from '@/lib/assets';

export function useAssetImage(assetId: string | undefined): {
  image: HTMLImageElement | null;
  status: 'idle' | 'loading' | 'loaded' | 'error';
} {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >('idle');

  useEffect(() => {
    if (!assetId) {
      setImage(null);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    getAssetObjectUrl(assetId).then((url) => {
      if (cancelled) return;
      if (!url) {
        setImage(null);
        setStatus('error');
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        setImage(img);
        setStatus('loaded');
      };
      img.onerror = () => {
        if (cancelled) return;
        setStatus('error');
      };
      img.src = url;
    });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return { image, status };
}
