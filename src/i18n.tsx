import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'cs' | 'en';

export type Translations = Record<string, string>;

const cs: Translations = {
  // WelcomeScreen
  welcome_headline1: 'Tvořte prostory,',
  welcome_headline2: 'které ohromí.',
  welcome_sub1: 'Profesionální editor pro návrh a prezentaci',
  welcome_sub2: 'imerzivních 360° scén.',
  welcome_enter: 'Vstoupit',
  welcome_copyright: '© 2026 ARena Studio',

  // TopBar
  topbar_untitled: 'Nepojmenovaný projekt',
  topbar_openPicker: 'Otevřít výběr projektů',
  topbar_grid: 'Mřížka',
  topbar_segments: 'Segmenty',
  topbar_safeZone: 'Bezpečná zóna',
  topbar_shortcuts: 'Klávesové zkratky (?)',
  topbar_preview: 'Náhled',
  topbar_exitPreview: 'Zavřít náhled',
  topbar_saved: 'Uloženo',
  topbar_saving: 'Ukládám…',
  topbar_unsaved: 'Neuloženo',

  // ProjectPicker
  picker_subtitle: '— otevřít nebo vytvořit projekt',
  picker_viewerHeight: 'Výška pozorovatele',
  picker_newProject: 'Nový projekt',
  picker_newProjectHint: 'Prázdný 360° cylindr · 7741 × 2450 px',
  picker_demo: 'Demo projekt',
  picker_demoHint: '3 scény · hotspoty',
  picker_import: 'Import .json',
  picker_importHint: 'Obnovit projekt',
  picker_recent: 'Nedávné projekty',
  picker_loading: 'Načítám…',
  picker_noProjects: 'Žádné uložené projekty.',
  picker_delete: 'Smazat projekt',

  // Export
  export_label: 'Export',
  export_currentScene: 'Aktuální scéna',
  export_asSvg: 'Exportovat jako SVG',
  export_asPng: 'Exportovat jako PNG',
  export_allScenes: 'Všechny scény',
  export_batchSvg: 'Dávkový SVG (ZIP)',
  export_project: 'Projekt',
  export_projectJson: 'Exportovat JSON projektu',
  export_bundle: 'Exportovat balíček (ZIP)',
  export_importJson: 'Importovat JSON projektu…',
  export_complete: 'dokončeno',
  export_failed: 'Export selhal',

  // Layers
  layers_title: 'Vrstvy',
  layers_empty: 'Prázdné',
  layers_lock: 'Zamknout',
  layers_unlock: 'Odemknout',
  layers_hide: 'Skrýt',
  layers_show: 'Zobrazit',
  layers_delete: 'Smazat',

  // Assets
  assets_title: 'Assety',
  assets_upload: 'Nahrát assety',
  assets_search: 'Hledat assety…',
  assets_all: 'Vše',
  assets_image: 'Obrázek',
  assets_hint: 'Klikněte + nebo přetáhněte soubory. Přetáhněte dlaždici na plátno.',
  assets_importing: 'Nahrávám…',
  assets_noAssets: 'žádné assety',
  assets_dropHint: 'Klikněte + nebo přetáhněte PNG / JPG / SVG / MP4.',
  assets_remove: 'Odebrat z knihovny',

  // Inspector
  inspector_object: 'Objekt',
  inspector_section_editor: 'Editor',
  inspector_section_layout: 'Rozložení',
  inspector_section_appearance: 'Vzhled',
  inspector_section_text: 'Text',
  inspector_section_fill: 'Výplň',
  inspector_section_hotspot: 'Hotspot',
  inspector_section_video: 'Video',
  inspector_section_action: 'Akce',
  inspector_section_scene: 'Scéna',
  inspector_section_notes: 'Poznámky',
  inspector_position: 'Pozice',
  inspector_rotation: 'Rotace',
  inspector_dimensions: 'Rozměry',
  inspector_layer: 'Vrstva',
  inspector_opacity: 'Průhlednost',
  inspector_font: 'Písmo',
  inspector_size: 'Velikost',
  inspector_color: 'Barva',
  inspector_align: 'Zarovnání',
  inspector_fill: 'Výplň',
  inspector_cornerRadius: 'Zaoblení',
  inspector_label: 'Popis',
  inspector_style: 'Styl',
  inspector_playback: 'Přehrávání',
  inspector_name: 'Název',
  inspector_background: 'Pozadí',
  inspector_start: 'Start',
  inspector_unlock: 'Odemknout',
  inspector_lock: 'Zamknout',
  inspector_hide: 'Skrýt',
  inspector_show: 'Zobrazit',
  inspector_invisible: 'Neviditelný',
  inspector_visible: 'Viditelný',
  inspector_loopOn: 'Smyčka zap.',
  inspector_loopOff: 'Smyčka vyp.',
  inspector_muted: 'Ztlumeno',
  inspector_sound: 'Zvuk',
  inspector_typeText: 'Zadejte text…',
  inspector_setAsStart: 'Nastavit jako start',
  inspector_isStart: '★ Startovní scéna',
  inspector_sceneNotes: 'Poznámky ke scéně…',
  inspector_selectHint: 'Vyberte objekt pro editaci. Přetáhněte z assetů nebo použijte lištu nástrojů nad plátnem.',
  inspector_duplicate: 'Duplikovat',
  inspector_delete: 'Smazat',
  inspector_deleteSelection: 'Smazat výběr',
  inspector_objectsSelected: 'objektů vybráno',
  inspector_bringToFront: 'Přenést dopředu',
  inspector_bringForward: 'O vrstvu výš',
  inspector_sendBackward: 'O vrstvu níž',
  inspector_sendToBack: 'Přenést dozadu',
  inspector_rotateCCW: 'Otočit -90°',
  inspector_rotateCW: 'Otočit 90°',

  // Interactions
  interactions_none: 'Zatím žádné interakce.',
  interactions_add: '+ Přidat interakci',
  interactions_delete: 'Smazat interakci',
  interactions_when: 'Kdy',
  interactions_delay: 'Zpoždění',
  interactions_then: 'Pak',
  interactions_scene: 'Scéna',
  interactions_object: 'Objekt',
  interactions_value: 'Hodnota',
  interactions_pickScene: '— vybrat scénu —',
  interactions_pickObject: '— vybrat objekt —',
  trigger_onClick: 'Po kliknutí',
  trigger_onHover: 'Po najetí myší',
  trigger_onSceneEnter: 'Při vstupu do scény',
  trigger_onTimer: 'Po časovači',
  action_goToScene: 'Přejít na scénu',
  action_showObject: 'Zobrazit objekt',
  action_hideObject: 'Skrýt objekt',
  action_toggleObject: 'Přepnout objekt',
  action_setText: 'Nastavit text',
  action_playVideo: 'Přehrát video',
  action_pauseVideo: 'Pozastavit video',

  // App / ShortcutHelp
  app_loading: 'Načítám projekt…',
  app_showScenes: '⌃ Zobrazit scény',
  shortcuts_title: 'Klávesové zkratky',
  shortcuts_selection: 'Výběr',
  shortcuts_edit: 'Editace',
  shortcuts_history: 'Historie',
  shortcuts_view: 'Zobrazení',
  shortcut_select: 'Vybrat objekt',
  shortcut_addToSelection: 'Přidat do výběru',
  shortcut_marquee: 'Výběr rámečkem',
  shortcut_clearSelection: 'Zrušit výběr',
  shortcut_deleteSelection: 'Smazat výběr',
  shortcut_duplicate: 'Duplikovat',
  shortcut_copyPaste: 'Kopírovat / vložit',
  shortcut_nudge10: 'Posunout 10px',
  shortcut_nudge50: 'Posunout 50px',
  shortcut_undo: 'Zpět',
  shortcut_redo: 'Znovu',
  shortcut_zoom: 'Přiblížení',
  shortcut_pan: 'Posouvání (kolečko)',
  shortcut_pan2: 'Posouvání (myš + mezerník)',
  shortcut_mode: '2D / 3D mód',
  shortcut_help: 'Přepnout tuto nápovědu',

  // SceneStrip
  strip_duplicate: 'Duplikovat',
  strip_delete: 'Smazat',
  strip_collapse: 'Sbalit',
  strip_new: '+ Nová',

  // SidebarRail
  rail_togglePanels: 'Přepnout panely',
  rail_layers: 'Vrstvy',
  rail_assets: 'Assety',
};

const en: Translations = {
  // WelcomeScreen
  welcome_headline1: 'Create spaces',
  welcome_headline2: 'that amaze.',
  welcome_sub1: 'Professional editor for designing and presenting',
  welcome_sub2: 'immersive 360° scenes.',
  welcome_enter: 'Enter',
  welcome_copyright: '© 2026 ARena Studio',

  // TopBar
  topbar_untitled: 'Untitled project',
  topbar_openPicker: 'Open project picker',
  topbar_grid: 'Grid',
  topbar_segments: 'Segments',
  topbar_safeZone: 'Safe zone',
  topbar_shortcuts: 'Keyboard shortcuts (?)',
  topbar_preview: 'Preview',
  topbar_exitPreview: 'Exit preview',
  topbar_saved: 'Saved',
  topbar_saving: 'Saving…',
  topbar_unsaved: 'Unsaved',

  // ProjectPicker
  picker_subtitle: '— open or create project',
  picker_viewerHeight: 'Viewer height',
  picker_newProject: 'New project',
  picker_newProjectHint: 'Empty 360° cylinder · 7741 × 2450 px',
  picker_demo: 'Demo project',
  picker_demoHint: '3 scenes · hotspots',
  picker_import: 'Import .json',
  picker_importHint: 'Restore project',
  picker_recent: 'Recent projects',
  picker_loading: 'Loading…',
  picker_noProjects: 'No saved projects.',
  picker_delete: 'Delete project',

  // Export
  export_label: 'Export',
  export_currentScene: 'Current scene',
  export_asSvg: 'Export as SVG',
  export_asPng: 'Export as PNG',
  export_allScenes: 'All scenes',
  export_batchSvg: 'Batch SVG (ZIP)',
  export_project: 'Project',
  export_projectJson: 'Export project JSON',
  export_bundle: 'Export bundle (ZIP)',
  export_importJson: 'Import project JSON…',
  export_complete: 'complete',
  export_failed: 'Export failed',

  // Layers
  layers_title: 'Layers',
  layers_empty: 'Empty',
  layers_lock: 'Lock',
  layers_unlock: 'Unlock',
  layers_hide: 'Hide',
  layers_show: 'Show',
  layers_delete: 'Delete',

  // Assets
  assets_title: 'Assets',
  assets_upload: 'Upload assets',
  assets_search: 'Search assets…',
  assets_all: 'All',
  assets_image: 'Image',
  assets_hint: 'Click + or drop files. Drag tile to canvas.',
  assets_importing: 'Importing…',
  assets_noAssets: 'no assets',
  assets_dropHint: 'Click + or drop PNG / JPG / SVG / MP4.',
  assets_remove: 'Remove from library',

  // Inspector
  inspector_object: 'Object',
  inspector_section_editor: 'Editor',
  inspector_section_layout: 'Layout',
  inspector_section_appearance: 'Appearance',
  inspector_section_text: 'Text',
  inspector_section_fill: 'Fill',
  inspector_section_hotspot: 'Hotspot',
  inspector_section_video: 'Video',
  inspector_section_action: 'Action',
  inspector_section_scene: 'Scene',
  inspector_section_notes: 'Notes',
  inspector_position: 'Position',
  inspector_rotation: 'Rotation',
  inspector_dimensions: 'Dimensions',
  inspector_layer: 'Layer',
  inspector_opacity: 'Opacity',
  inspector_font: 'Font',
  inspector_size: 'Size',
  inspector_color: 'Color',
  inspector_align: 'Align',
  inspector_fill: 'Fill',
  inspector_cornerRadius: 'Corner radius',
  inspector_label: 'Label',
  inspector_style: 'Style',
  inspector_playback: 'Playback',
  inspector_name: 'Name',
  inspector_background: 'Background',
  inspector_start: 'Start',
  inspector_unlock: 'Unlock',
  inspector_lock: 'Lock',
  inspector_hide: 'Hide',
  inspector_show: 'Show',
  inspector_invisible: 'Invisible',
  inspector_visible: 'Visible',
  inspector_loopOn: 'Loop on',
  inspector_loopOff: 'Loop off',
  inspector_muted: 'Muted',
  inspector_sound: 'Sound',
  inspector_typeText: 'Type text…',
  inspector_setAsStart: 'Set as start',
  inspector_isStart: '★ Start scene',
  inspector_sceneNotes: 'Scene notes…',
  inspector_selectHint: 'Select an object to edit it. Drag from assets or use the toolbar above the canvas.',
  inspector_duplicate: 'Duplicate',
  inspector_delete: 'Delete',
  inspector_deleteSelection: 'Delete selection',
  inspector_objectsSelected: 'objects selected',
  inspector_bringToFront: 'Bring to front',
  inspector_bringForward: 'Bring forward',
  inspector_sendBackward: 'Send backward',
  inspector_sendToBack: 'Send to back',
  inspector_rotateCCW: 'Rotate -90°',
  inspector_rotateCW: 'Rotate 90°',

  // Interactions
  interactions_none: 'No interactions yet.',
  interactions_add: '+ Add interaction',
  interactions_delete: 'Delete interaction',
  interactions_when: 'When',
  interactions_delay: 'Delay',
  interactions_then: 'Then',
  interactions_scene: 'Scene',
  interactions_object: 'Object',
  interactions_value: 'Value',
  interactions_pickScene: '— pick scene —',
  interactions_pickObject: '— pick object —',
  trigger_onClick: 'On click',
  trigger_onHover: 'On hover',
  trigger_onSceneEnter: 'On scene enter',
  trigger_onTimer: 'On timer',
  action_goToScene: 'Go to scene',
  action_showObject: 'Show object',
  action_hideObject: 'Hide object',
  action_toggleObject: 'Toggle object',
  action_setText: 'Set text',
  action_playVideo: 'Play video',
  action_pauseVideo: 'Pause video',

  // App / ShortcutHelp
  app_loading: 'Loading project…',
  app_showScenes: '⌃ Show scenes',
  shortcuts_title: 'Keyboard shortcuts',
  shortcuts_selection: 'Selection',
  shortcuts_edit: 'Edit',
  shortcuts_history: 'History',
  shortcuts_view: 'View',
  shortcut_select: 'Select object',
  shortcut_addToSelection: 'Add to selection',
  shortcut_marquee: 'Marquee select',
  shortcut_clearSelection: 'Clear selection',
  shortcut_deleteSelection: 'Delete selection',
  shortcut_duplicate: 'Duplicate',
  shortcut_copyPaste: 'Copy / paste',
  shortcut_nudge10: 'Nudge 10px',
  shortcut_nudge50: 'Nudge 50px',
  shortcut_undo: 'Undo',
  shortcut_redo: 'Redo',
  shortcut_zoom: 'Zoom',
  shortcut_pan: 'Pan',
  shortcut_pan2: 'Hold Space + Drag',
  shortcut_mode: '2D / 3D mode',
  shortcut_help: 'Toggle this help',

  // SceneStrip
  strip_duplicate: 'Duplicate',
  strip_delete: 'Delete',
  strip_collapse: 'Collapse',
  strip_new: '+ New',

  // SidebarRail
  rail_togglePanels: 'Toggle panels',
  rail_layers: 'Layers',
  rail_assets: 'Assets',
};

const TRANSLATIONS = { cs, en };

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LangContext = createContext<LangContextType>({
  lang: 'cs',
  setLang: () => {},
  t: cs,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem('arena-lang');
      return stored === 'en' ? 'en' : 'cs';
    } catch {
      return 'cs';
    }
  });

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem('arena-lang', l); } catch {}
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: TRANSLATIONS[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}
