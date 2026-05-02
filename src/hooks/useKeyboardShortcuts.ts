import { useEffect } from 'react';
import { useEditor } from '@/store/editor';

const isEditableTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
};

export type ShortcutOptions = {
  onHelp?: () => void;
};

export function useKeyboardShortcuts(opts: ShortcutOptions = {}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      // Help
      if (!e.ctrlKey && !e.metaKey && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        opts.onHelp?.();
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      const store = useEditor.getState();

      // Undo / Redo
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        store.redo();
        return;
      }

      // Duplicate
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        store.selectedObjectIds.forEach((id) => store.duplicateObject(id));
        return;
      }

      // Copy / paste
      if (mod && e.key.toLowerCase() === 'c') {
        if (store.selectedObjectIds.length === 0) return;
        e.preventDefault();
        store.copySelection();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        if (store.clipboard.length === 0) return;
        e.preventDefault();
        store.pasteClipboard();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedObjectIds.length === 0) return;
        e.preventDefault();
        store.selectedObjectIds.forEach((id) => store.deleteObject(id));
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        if (store.selectedObjectIds.length > 0) {
          e.preventDefault();
          store.clearSelection();
        }
        return;
      }

      // Arrow nudges
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        if (store.selectedObjectIds.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 50 : 10;
        const dx =
          e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy =
          e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        store.nudgeSelection(dx, dy);
        return;
      }

      // Mode toggles
      if (!mod && (e.key === '1' || e.key === '2')) {
        e.preventDefault();
        store.setViewMode(e.key === '1' ? '2d' : '3d');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opts]);
}
