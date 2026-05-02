import type {
  Asset,
  HotspotObjectProps,
  ImageObjectProps,
  Project,
  Scene,
  SceneObject,
  ShapeObjectProps,
  SvgObjectProps,
  TextObjectProps,
  VideoObjectProps,
} from '@/types/project';
import { getAssetBlob } from '@/lib/persistence';
import { blobToDataUrl, blobToText } from '@/lib/download';

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const attrEscape = xmlEscape;

type AssetData = {
  asset: Asset;
  dataUrl?: string;
  svgInline?: string;
};

async function loadAssetData(asset: Asset): Promise<AssetData> {
  try {
    const blob = await getAssetBlob(asset.id);
    if (!blob) return { asset };
    if (asset.type === 'svg') {
      const text = await blobToText(blob);
      return { asset, svgInline: text };
    }
    const dataUrl = await blobToDataUrl(blob);
    return { asset, dataUrl };
  } catch {
    return { asset };
  }
}

export type SvgExportOptions = {
  includeHidden?: boolean;
};

export async function sceneToSvg(
  scene: Scene,
  project: Project,
  opts: SvgExportOptions = {},
): Promise<string> {
  const { width, height } = project.template;
  const includeHidden = opts.includeHidden ?? false;

  const referencedAssetIds = new Set<string>();
  for (const obj of scene.objects) {
    const props = obj.props as { assetId?: string };
    if (props && typeof props.assetId === 'string') {
      referencedAssetIds.add(props.assetId);
    }
  }
  const assetEntries = await Promise.all(
    project.assets
      .filter((a) => referencedAssetIds.has(a.id))
      .map((a) => loadAssetData(a)),
  );
  const assetMap = new Map(assetEntries.map((e) => [e.asset.id, e]));

  const sorted = [...scene.objects].sort((a, b) => a.zIndex - b.zIndex);

  const body: string[] = [];

  // Background
  if (scene.background) {
    body.push(
      `  <rect x="0" y="0" width="${width}" height="${height}" fill="${attrEscape(
        scene.background,
      )}"/>`,
    );
  }

  for (const obj of sorted) {
    if (!obj.visible && !includeHidden) continue;
    if (obj.type === 'hotspot') {
      const props = obj.props as HotspotObjectProps;
      if (props.invisible) continue;
    }
    body.push(renderObject(obj, assetMap));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-arena-scene="${attrEscape(scene.id)}" data-arena-project="${attrEscape(project.id)}">`,
    `  <title>${attrEscape(scene.name)}</title>`,
    `  <desc>ARena scene · ${project.template.segments} segments · ${width}×${height}</desc>`,
    body.join('\n'),
    '</svg>',
    '',
  ].join('\n');
}

function transformAttr(obj: SceneObject): string {
  const parts: string[] = [];
  parts.push(`translate(${obj.x}, ${obj.y})`);
  if (obj.rotation) {
    parts.push(`rotate(${obj.rotation}, ${obj.width / 2}, ${obj.height / 2})`);
  }
  return parts.join(' ');
}

function renderObject(obj: SceneObject, assets: Map<string, AssetData>): string {
  const transform = transformAttr(obj);
  const opacityAttr = obj.opacity !== 1 ? ` opacity="${obj.opacity}"` : '';
  const idAttr = ` id="${attrEscape(obj.id)}" data-arena-name="${attrEscape(obj.name)}"`;

  switch (obj.type) {
    case 'image': {
      const props = obj.props as ImageObjectProps;
      const data = assets.get(props.assetId);
      if (!data?.dataUrl) {
        return placeholderRect(transform, obj.width, obj.height, idAttr, opacityAttr);
      }
      const par = props.preserveAspectRatio === false ? 'none' : 'xMidYMid meet';
      return `  <image${idAttr} transform="${transform}"${opacityAttr} width="${obj.width}" height="${obj.height}" preserveAspectRatio="${par}" xlink:href="${data.dataUrl}"/>`;
    }
    case 'svg': {
      const props = obj.props as SvgObjectProps;
      const data = assets.get(props.assetId);
      if (data?.svgInline) {
        return `  <g${idAttr} transform="${transform}"${opacityAttr}>\n${embedSvg(data.svgInline, obj.width, obj.height)}\n  </g>`;
      }
      if (data?.dataUrl) {
        return `  <image${idAttr} transform="${transform}"${opacityAttr} width="${obj.width}" height="${obj.height}" xlink:href="${data.dataUrl}"/>`;
      }
      return placeholderRect(transform, obj.width, obj.height, idAttr, opacityAttr);
    }
    case 'video': {
      const props = obj.props as VideoObjectProps;
      const data = assets.get(props.assetId);
      const poster = data?.dataUrl;
      const inner: string[] = [
        `<rect x="0" y="0" width="${obj.width}" height="${obj.height}" fill="#0f1014"/>`,
      ];
      if (poster) {
        inner.push(
          `<image x="0" y="0" width="${obj.width}" height="${obj.height}" xlink:href="${poster}" opacity="0.85"/>`,
        );
      }
      inner.push(
        `<rect x="0" y="0" width="${obj.width}" height="${obj.height}" fill="none" stroke="#ec4899" stroke-width="3"/>`,
      );
      return `  <g${idAttr} data-arena-type="video" transform="${transform}"${opacityAttr}>\n    ${inner.join('\n    ')}\n  </g>`;
    }
    case 'text': {
      const props = obj.props as TextObjectProps;
      const lines = props.content.split(/\r?\n/);
      const lineHeight = props.fontSize * (props.lineHeight ?? 1.2);
      const anchor =
        props.align === 'center'
          ? 'middle'
          : props.align === 'right'
            ? 'end'
            : 'start';
      const xPos =
        props.align === 'center'
          ? obj.width / 2
          : props.align === 'right'
            ? obj.width
            : 0;
      const fontWeight = props.fontWeight;
      const tspans = lines
        .map((line, i) => {
          const dy = i === 0 ? props.fontSize : lineHeight;
          return `<tspan x="${xPos}" dy="${dy}">${xmlEscape(line)}</tspan>`;
        })
        .join('');
      const ls = props.letterSpacing
        ? ` letter-spacing="${props.letterSpacing}"`
        : '';
      return `  <text${idAttr} transform="${transform}"${opacityAttr} font-family="${attrEscape(props.fontFamily)}" font-size="${props.fontSize}" font-weight="${fontWeight}" fill="${attrEscape(props.color)}" text-anchor="${anchor}"${ls}>${tspans}</text>`;
    }
    case 'hotspot': {
      const props = obj.props as HotspotObjectProps;
      const fill = props.fill ?? 'rgba(236,72,153,0.18)';
      const stroke = props.stroke ?? 'rgba(236,72,153,0.95)';
      const inner = [
        `<rect x="0" y="0" width="${obj.width}" height="${obj.height}" rx="8" ry="8" fill="${attrEscape(fill)}" stroke="${attrEscape(stroke)}" stroke-width="3"/>`,
      ];
      if (props.label) {
        inner.push(
          `<text x="${obj.width / 2}" y="${obj.height / 2}" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace, monospace" font-size="${Math.min(obj.width, obj.height) * 0.22}" font-weight="bold" fill="#0f1014">${xmlEscape(props.label)}</text>`,
        );
      }
      return `  <g${idAttr} data-arena-type="hotspot" transform="${transform}"${opacityAttr}>\n    ${inner.join('\n    ')}\n  </g>`;
    }
    case 'shape': {
      const props = obj.props as ShapeObjectProps;
      const fill = attrEscape(props.fill ?? '#ec4899');
      const strokeAttrs = props.strokeWidth
        ? ` stroke="${attrEscape(props.stroke ?? '#ffffff')}" stroke-width="${props.strokeWidth}"`
        : '';
      if (props.shape === 'ellipse') {
        return `  <ellipse${idAttr} transform="${transform}"${opacityAttr} cx="${obj.width / 2}" cy="${obj.height / 2}" rx="${obj.width / 2}" ry="${obj.height / 2}" fill="${fill}"${strokeAttrs}/>`;
      }
      const r = props.cornerRadius ?? 0;
      const radiusAttr = r ? ` rx="${r}" ry="${r}"` : '';
      return `  <rect${idAttr} transform="${transform}"${opacityAttr} x="0" y="0" width="${obj.width}" height="${obj.height}"${radiusAttr} fill="${fill}"${strokeAttrs}/>`;
    }
    default:
      return '';
  }
}

function placeholderRect(
  transform: string,
  w: number,
  h: number,
  idAttr: string,
  opacityAttr: string,
): string {
  return `  <rect${idAttr} transform="${transform}"${opacityAttr} x="0" y="0" width="${w}" height="${h}" fill="rgba(255,255,255,0.04)" stroke="rgba(236,72,153,0.6)" stroke-width="2" stroke-dasharray="10 6"/>`;
}

function embedSvg(svgText: string, w: number, h: number): string {
  // Strip XML prolog and DOCTYPE, change <svg> to <g> with viewBox-derived scaling.
  const cleaned = svgText
    .replace(/<\?xml[^>]*\?>/i, '')
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .trim();
  const match = cleaned.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  if (!match) return cleaned;
  const attrs = match[1];
  const inner = match[2];
  const vbMatch = attrs.match(/viewBox\s*=\s*"([^"]+)"/i);
  let vbW = w;
  let vbH = h;
  if (vbMatch) {
    const parts = vbMatch[1].split(/[\s,]+/).map(parseFloat);
    if (parts.length === 4) {
      vbW = parts[2];
      vbH = parts[3];
    }
  } else {
    const wMatch = attrs.match(/\bwidth\s*=\s*"([0-9.]+)"/i);
    const hMatch = attrs.match(/\bheight\s*=\s*"([0-9.]+)"/i);
    if (wMatch) vbW = parseFloat(wMatch[1]);
    if (hMatch) vbH = parseFloat(hMatch[1]);
  }
  const sx = w / vbW;
  const sy = h / vbH;
  return `    <g transform="scale(${sx}, ${sy})">${inner}</g>`;
}
