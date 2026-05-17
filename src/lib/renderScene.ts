import type {
  HotspotObjectProps,
  ImageObjectProps,
  Scene,
  ShapeObjectProps,
  SvgObjectProps,
  Template,
  TextObjectProps,
  VideoObjectProps,
} from '@/types/project';
import { getAssetObjectUrl } from '@/lib/assets';

const imageCache = new Map<string, HTMLImageElement>();

async function loadCachedImage(
  assetId: string,
): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(assetId);
  if (cached && cached.complete) return cached;
  const url = await getAssetObjectUrl(assetId);
  if (!url) return null;
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = url;
  });
  if (img) imageCache.set(assetId, img);
  return img;
}

export type RenderOptions = {
  width?: number;
  showGuides?: boolean;
  skipVideoObjects?: boolean;
};

export async function renderSceneToCanvas(
  scene: Scene | undefined,
  template: Template,
  opts: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  const targetWidth = opts.width ?? 2048;
  const ratio = template.height / template.width;
  const targetHeight = Math.round(targetWidth * ratio);
  const sx = targetWidth / template.width;
  const sy = targetHeight / template.height;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = scene?.background ?? '#1a1b1e';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  if (!scene) {
    drawGuides(ctx, template, sx, sy);
    return canvas;
  }

  const sorted = [...scene.objects].sort((a, b) => a.zIndex - b.zIndex);
  for (const obj of sorted) {
    if (!obj.visible) continue;
    ctx.save();
    ctx.globalAlpha = obj.opacity;
    ctx.translate(obj.x * sx, obj.y * sy);
    if (obj.rotation) {
      ctx.rotate((obj.rotation * Math.PI) / 180);
    }
    const w = obj.width * sx;
    const h = obj.height * sy;

    try {
      if (obj.type === 'image' || obj.type === 'svg') {
        const props = obj.props as ImageObjectProps | SvgObjectProps;
        const img = await loadCachedImage(props.assetId);
        if (img) {
          ctx.drawImage(img, 0, 0, w, h);
        } else {
          drawPlaceholder(ctx, w, h, obj.type.toUpperCase());
        }
      } else if (obj.type === 'video') {
        if (!opts.skipVideoObjects) {
          const props = obj.props as VideoObjectProps;
          ctx.fillStyle = '#0f1014';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = 'rgba(236,72,153,0.85)';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, w, h);
          if (props.posterSrc) {
            // skip — posterSrc not loaded synchronously here
          }
          ctx.fillStyle = 'rgba(236,72,153,0.85)';
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          const r = Math.min(w, h) * 0.05;
          ctx.moveTo(w / 2 - r, h / 2 - r * 1.5);
          ctx.lineTo(w / 2 - r, h / 2 + r * 1.5);
          ctx.lineTo(w / 2 + r * 1.5, h / 2);
          ctx.closePath();
          ctx.fill();
        }
      } else if (obj.type === 'text') {
        const props = obj.props as TextObjectProps;
        ctx.fillStyle = props.color;
        const fontSize = props.fontSize * sy;
        const weight = props.fontWeight >= 600 ? 'bold' : 'normal';
        ctx.font = `${weight} ${fontSize}px ${props.fontFamily}`;
        ctx.textBaseline = 'top';
        const lines = props.content.split(/\r?\n/);
        const lineHeight = fontSize * (props.lineHeight ?? 1.2);
        lines.forEach((line, i) => {
          let drawX = 0;
          if (props.align === 'center') {
            const m = ctx.measureText(line);
            drawX = (w - m.width) / 2;
          } else if (props.align === 'right') {
            const m = ctx.measureText(line);
            drawX = w - m.width;
          }
          ctx.fillText(line, drawX, i * lineHeight);
        });
      } else if (obj.type === 'hotspot') {
        const props = obj.props as HotspotObjectProps;
        const invisible = props.invisible ?? false;
        ctx.fillStyle =
          (invisible ? 'rgba(236,72,153,0.08)' : props.fill) ??
          'rgba(236,72,153,0.18)';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = props.stroke ?? 'rgba(236,72,153,0.95)';
        ctx.lineWidth = 3;
        if (invisible) ctx.setLineDash([12, 8]);
        ctx.strokeRect(0, 0, w, h);
        ctx.setLineDash([]);
        if (props.label && !invisible) {
          ctx.fillStyle = '#0f1014';
          const fs = Math.min(w, h) * 0.22;
          ctx.font = `bold ${fs}px ui-monospace, monospace`;
          ctx.textBaseline = 'middle';
          const m = ctx.measureText(props.label);
          ctx.fillText(props.label, (w - m.width) / 2, h / 2);
        }
      } else if (obj.type === 'shape') {
        const props = obj.props as ShapeObjectProps;
        ctx.fillStyle = props.fill ?? '#ec4899';
        if (props.shape === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          if (props.strokeWidth) {
            ctx.strokeStyle = props.stroke ?? '#ffffff';
            ctx.lineWidth = props.strokeWidth;
            ctx.stroke();
          }
        } else {
          if (props.cornerRadius) {
            roundRect(ctx, 0, 0, w, h, props.cornerRadius * sx);
            ctx.fill();
          } else {
            ctx.fillRect(0, 0, w, h);
          }
          if (props.strokeWidth) {
            ctx.strokeStyle = props.stroke ?? '#ffffff';
            ctx.lineWidth = props.strokeWidth;
            ctx.strokeRect(0, 0, w, h);
          }
        }
      }
    } finally {
      ctx.restore();
    }
  }

  if (opts.showGuides ?? true) drawGuides(ctx, template, sx, sy);

  return canvas;
}

function drawGuides(
  ctx: CanvasRenderingContext2D,
  template: Template,
  sx: number,
  sy: number,
) {
  const segmentWidth = template.width / template.segments;
  ctx.strokeStyle = 'rgba(236,72,153,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 6]);
  for (let x = 100; x < template.width; x += 100) {
    if (x % segmentWidth === 0) continue;
    ctx.beginPath();
    ctx.moveTo(x * sx, 0);
    ctx.lineTo(x * sx, template.height * sy);
    ctx.stroke();
  }
  for (let y = 100; y < template.height; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y * sy);
    ctx.lineTo(template.width * sx, y * sy);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(236,72,153,0.85)';
  for (let i = 0; i < template.segments; i++) {
    ctx.fillRect(i * segmentWidth * sx, 0, 20 * sx, template.height * sy);
  }
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  label: string,
) {
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(236,72,153,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(0, 0, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(236,72,153,0.9)';
  const fs = Math.min(w, h) * 0.12;
  ctx.font = `${fs}px ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  const m = ctx.measureText(label);
  ctx.fillText(label, (w - m.width) / 2, h / 2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
