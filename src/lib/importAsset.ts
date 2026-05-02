import type { Asset, AssetType } from '@/types/project';
import { newId } from '@/lib/factory';
import { putAssetBlob } from '@/lib/persistence';
import {
  generateImageThumbnail,
  generateSvgThumbnail,
  generateVideoThumbnail,
  readBlobAsText,
} from '@/lib/thumbnails';

export const ACCEPTED_TYPES =
  'image/png,image/jpeg,image/jpg,image/svg+xml,video/mp4,video/webm,video/quicktime';

function detectType(file: File): AssetType | null {
  const m = file.type.toLowerCase();
  if (m === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg'))
    return 'svg';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  return null;
}

export async function importAssetFile(file: File): Promise<Asset | null> {
  const type = detectType(file);
  if (!type) return null;
  const id = newId('as_');
  const blob = file as Blob;
  await putAssetBlob(id, blob);

  let width: number | undefined;
  let height: number | undefined;
  let duration: number | undefined;
  let thumbnailSrc: string | undefined;

  if (type === 'image') {
    const t = await generateImageThumbnail(blob);
    if (t) {
      thumbnailSrc = t.dataUrl;
      width = t.width;
      height = t.height;
    }
  } else if (type === 'svg') {
    const text = await readBlobAsText(blob);
    const t = await generateSvgThumbnail(text);
    if (t) {
      thumbnailSrc = t.dataUrl;
      width = t.width;
      height = t.height;
    }
  } else if (type === 'video') {
    const t = await generateVideoThumbnail(blob);
    if (t) {
      thumbnailSrc = t.dataUrl;
      width = t.width;
      height = t.height;
      duration = t.duration;
    }
  }

  const asset: Asset = {
    id,
    name: file.name,
    type,
    mimeType: file.type || (type === 'svg' ? 'image/svg+xml' : ''),
    src: `idb:${id}`,
    thumbnailSrc,
    width,
    height,
    duration,
  };
  return asset;
}

export async function importAssetFiles(
  files: FileList | File[],
): Promise<Asset[]> {
  const arr = Array.from(files);
  const results: Asset[] = [];
  for (const f of arr) {
    const a = await importAssetFile(f);
    if (a) results.push(a);
  }
  return results;
}
