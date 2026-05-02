import { getAssetBlob } from '@/lib/persistence';

const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

export async function getAssetObjectUrl(
  assetId: string,
): Promise<string | null> {
  if (urlCache.has(assetId)) return urlCache.get(assetId)!;
  if (pending.has(assetId)) return pending.get(assetId)!;
  const p = (async () => {
    const blob = await getAssetBlob(assetId);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(assetId, url);
    return url;
  })();
  pending.set(assetId, p);
  try {
    return await p;
  } finally {
    pending.delete(assetId);
  }
}

export function revokeAssetObjectUrl(assetId: string) {
  const url = urlCache.get(assetId);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(assetId);
  }
}

export function clearAssetUrlCache() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}
