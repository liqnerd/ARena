import {
  PROJECT_SCHEMA_VERSION,
  type Project,
} from '@/types/project';
import {
  getAssetBlob,
  putAssetBlob,
} from '@/lib/persistence';
import { blobToDataUrl, dataUrlToBlob } from '@/lib/download';

export type ProjectExport = {
  format: 'arena-project';
  formatVersion: '1';
  schemaVersion: string;
  exportedAt: string;
  project: Project;
  assetBlobs: Record<string, string>; // assetId → data URL
};

export async function projectToJson(project: Project): Promise<string> {
  const assetBlobs: Record<string, string> = {};
  for (const a of project.assets) {
    const blob = await getAssetBlob(a.id);
    if (blob) {
      try {
        assetBlobs[a.id] = await blobToDataUrl(blob);
      } catch {
        // skip; reference may be missing on import
      }
    }
  }
  const payload: ProjectExport = {
    format: 'arena-project',
    formatVersion: '1',
    schemaVersion: project.version || PROJECT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project,
    assetBlobs,
  };
  return JSON.stringify(payload, null, 2);
}

export class ImportError extends Error {}

export async function projectFromJson(text: string): Promise<Project> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new ImportError(`Invalid JSON: ${(err as Error).message}`);
  }
  if (!isProjectExport(parsed)) {
    throw new ImportError(
      'Not an ARena project export (missing "format": "arena-project")',
    );
  }
  validateProject(parsed.project);
  // Restore blobs into IDB
  await Promise.all(
    Object.entries(parsed.assetBlobs).map(async ([id, dataUrl]) => {
      try {
        const blob = dataUrlToBlob(dataUrl);
        await putAssetBlob(id, blob);
      } catch (err) {
        console.warn('[arena] failed to restore asset blob', id, err);
      }
    }),
  );
  return parsed.project;
}

function isProjectExport(v: unknown): v is ProjectExport {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    o.format === 'arena-project' &&
    typeof o.project === 'object' &&
    o.project !== null &&
    typeof (o.assetBlobs ?? {}) === 'object'
  );
}

function validateProject(p: unknown): asserts p is Project {
  if (!p || typeof p !== 'object') throw new ImportError('Project missing');
  const o = p as Record<string, unknown>;
  if (typeof o.id !== 'string') throw new ImportError('Project.id missing');
  if (typeof o.name !== 'string') throw new ImportError('Project.name missing');
  if (!o.template || typeof o.template !== 'object')
    throw new ImportError('Project.template missing');
  const tpl = o.template as Record<string, unknown>;
  if (
    typeof tpl.width !== 'number' ||
    typeof tpl.height !== 'number' ||
    typeof tpl.segments !== 'number'
  )
    throw new ImportError('Project.template invalid');
  if (!Array.isArray(o.scenes) || o.scenes.length === 0)
    throw new ImportError('Project.scenes empty');
  for (const s of o.scenes) {
    const sc = s as Record<string, unknown>;
    if (typeof sc.id !== 'string') throw new ImportError('Scene.id missing');
    if (typeof sc.name !== 'string')
      throw new ImportError('Scene.name missing');
    if (!Array.isArray(sc.objects))
      throw new ImportError('Scene.objects missing');
  }
  if (typeof o.startSceneId !== 'string')
    throw new ImportError('Project.startSceneId missing');
  if (!Array.isArray(o.assets)) throw new ImportError('Project.assets missing');
}
