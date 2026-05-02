import { useEffect, useState } from 'react';
import { useEditor } from '@/store/editor';
import { listProjects, loadLastProject } from '@/lib/persistence';

export type BootstrapState =
  | { kind: 'loading' }
  | { kind: 'pick' } // show picker
  | { kind: 'ready' };

export function useProjectBootstrap() {
  const [state, setState] = useState<BootstrapState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listProjects();
        if (cancelled) return;
        if (list.length === 0) {
          setState({ kind: 'ready' }); // first run, default new project already created
          return;
        }
        const last = await loadLastProject();
        if (cancelled) return;
        if (last) {
          useEditor.getState().setProject(last);
        }
        setState({ kind: 'pick' });
      } catch (err) {
        console.warn('[arena] bootstrap failed', err);
        if (!cancelled) setState({ kind: 'ready' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    state,
    dismissPicker: () => setState({ kind: 'ready' }),
    showPicker: () => setState({ kind: 'pick' }),
  };
}
