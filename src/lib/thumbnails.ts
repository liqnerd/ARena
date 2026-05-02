export type ThumbnailResult = {
  dataUrl: string;
  width: number;
  height: number;
  duration?: number;
};

const MAX_THUMB = 256;

export async function generateImageThumbnail(
  blob: Blob,
): Promise<ThumbnailResult | null> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const { canvas, w, h } = drawScaled(img, img.naturalWidth, img.naturalHeight);
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: img.naturalWidth,
      height: img.naturalHeight,
      ...(w && h ? {} : {}),
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function generateSvgThumbnail(
  text: string,
): Promise<ThumbnailResult | null> {
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const { canvas } = drawScaled(
      img,
      img.naturalWidth || 800,
      img.naturalHeight || 600,
    );
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: img.naturalWidth || 800,
      height: img.naturalHeight || 600,
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function generateVideoThumbnail(
  blob: Blob,
): Promise<ThumbnailResult | null> {
  const url = URL.createObjectURL(blob);
  return new Promise<ThumbnailResult | null>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    let settled = false;
    const finish = (r: ThumbnailResult | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(r);
    };
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
      } catch {
        video.currentTime = 0;
      }
    };
    video.onseeked = () => {
      try {
        const w = video.videoWidth || 800;
        const h = video.videoHeight || 450;
        const { canvas } = drawScaled(video, w, h);
        finish({
          dataUrl: canvas.toDataURL('image/png'),
          width: w,
          height: h,
          duration: video.duration,
        });
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
  });
}

function drawScaled(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
): { canvas: HTMLCanvasElement; w: number; h: number } {
  const ratio = Math.min(MAX_THUMB / srcW, MAX_THUMB / srcH, 1);
  const w = Math.max(1, Math.round(srcW * ratio));
  const h = Math.max(1, Math.round(srcH * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0, w, h);
  }
  return { canvas, w, h };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export async function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
    r.onerror = () => reject(r.error);
    r.readAsText(blob);
  });
}
