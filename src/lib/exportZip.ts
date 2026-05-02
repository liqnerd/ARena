import JSZip from 'jszip';
import type { Project } from '@/types/project';
import { sceneToSvg } from '@/lib/exportSvg';
import { sceneToPngBlob } from '@/lib/exportPng';
import { projectToJson } from '@/lib/exportJson';
import { getAssetBlob } from '@/lib/persistence';
import { safeFilename } from '@/lib/download';

export type BundleOptions = {
  includePng?: boolean;
  includeAssets?: boolean;
};

export async function bundleProjectZip(
  project: Project,
  opts: BundleOptions = {},
): Promise<Blob> {
  const includePng = opts.includePng ?? true;
  const includeAssets = opts.includeAssets ?? true;
  const zip = new JSZip();

  zip.file('project.json', await projectToJson(project));

  const scenesDir = zip.folder('scenes')!;
  const previewsDir = includePng ? zip.folder('previews')! : null;

  const manifest: {
    project: { id: string; name: string };
    scenes: { index: number; id: string; name: string; svg: string; png?: string }[];
    assets: { id: string; name: string; type: string; file?: string }[];
  } = {
    project: { id: project.id, name: project.name },
    scenes: [],
    assets: [],
  };

  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    const idx = String(i + 1).padStart(2, '0');
    const base = `scene-${idx}-${safeFilename(scene.name)}`;
    const svgName = `${base}.svg`;
    const svg = await sceneToSvg(scene, project);
    scenesDir.file(svgName, svg);
    let pngName: string | undefined;
    if (includePng) {
      const png = await sceneToPngBlob(scene, project, 1280);
      if (png && previewsDir) {
        pngName = `${base}.png`;
        previewsDir.file(pngName, png);
      }
    }
    manifest.scenes.push({
      index: i + 1,
      id: scene.id,
      name: scene.name,
      svg: `scenes/${svgName}`,
      png: pngName ? `previews/${pngName}` : undefined,
    });
  }

  if (includeAssets && project.assets.length > 0) {
    const assetsDir = zip.folder('assets')!;
    for (const asset of project.assets) {
      const blob = await getAssetBlob(asset.id);
      if (!blob) {
        manifest.assets.push({ id: asset.id, name: asset.name, type: asset.type });
        continue;
      }
      const ext = guessExt(asset.mimeType, asset.name, asset.type);
      const file = `${safeFilename(asset.name) || asset.id}.${ext}`;
      assetsDir.file(file, blob);
      manifest.assets.push({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        file: `assets/${file}`,
      });
    }
  } else {
    for (const asset of project.assets) {
      manifest.assets.push({ id: asset.id, name: asset.name, type: asset.type });
    }
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob' });
}

function guessExt(mime: string, name: string, type: string): string {
  const dot = name.lastIndexOf('.');
  if (dot > -1 && dot < name.length - 1) return name.slice(dot + 1).toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'video/quicktime') return 'mov';
  if (type === 'image') return 'png';
  if (type === 'svg') return 'svg';
  if (type === 'video') return 'mp4';
  return 'bin';
}
