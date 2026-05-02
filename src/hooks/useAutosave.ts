import { useEffect, useRef } from 'react';
import { useEditor } from '@/store/editor';
import { saveProject } from '@/lib/persistence';

const DEBOUNCE_MS = 600;

export function useAutosave() {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = useEditor.subscribe((state, prev) => {
      if (state.project === prev.project) return;
      const setSaveState = useEditor.getState().setSaveState;
      setSaveState('unsaved');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        const current = useEditor.getState().project;
        try {
          setSaveState('saving');
          await saveProject(current);
          setSaveState('saved');
        } catch {
          setSaveState('unsaved');
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);
}
