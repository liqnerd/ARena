export const PROJECT_SCHEMA_VERSION = '1.0.0';

export const DEFAULT_TEMPLATE = {
  width: 7741,
  height: 2450,
  segments: 6,
  mode: 'cylinder-360' as const,
  projectionHeightCm: 250,
  viewerHeightCm: 170,
  safeRadiusCm: 60,
};

export type TemplateMode = 'cylinder-360';

export type Template = {
  width: number;
  height: number;
  segments: number;
  mode: TemplateMode;
  projectionHeightCm?: number;
  viewerHeightCm?: number;
  safeRadiusCm?: number;
};

export type SafeZone = {
  topPx: number; // band from y=0 to topPx (no-text-top)
  bottomPx: number; // band from height-bottomPx to height (no-text-bottom)
  eyeLevelPx: number; // y of viewer eye level
};

export function computeSafeZone(t: Template): SafeZone {
  const projection = t.projectionHeightCm ?? 250;
  const viewer = t.viewerHeightCm ?? 170;
  const radius = t.safeRadiusCm ?? 60;
  const pxPerCm = t.height / projection;
  // Canvas y=0 is top; y=height is bottom (floor). Eye level from floor = viewerHeight.
  const eyeFromTopCm = projection - viewer;
  const eyeLevelPx = eyeFromTopCm * pxPerCm;
  const topPx = Math.max(0, eyeLevelPx - radius * pxPerCm);
  const bottomPx = Math.max(
    0,
    t.height - (eyeLevelPx + radius * pxPerCm),
  );
  return { topPx, bottomPx, eyeLevelPx };
}

export type AssetType = 'image' | 'svg' | 'video';

export type Asset = {
  id: string;
  name: string;
  type: AssetType;
  mimeType: string;
  src: string;
  thumbnailSrc?: string;
  width?: number;
  height?: number;
  duration?: number;
};

export type SceneObjectType =
  | 'image'
  | 'svg'
  | 'video'
  | 'text'
  | 'hotspot'
  | 'shape';

export type ImageObjectProps = {
  assetId: string;
  preserveAspectRatio?: boolean;
};

export type SvgObjectProps = {
  assetId: string;
  preserveAspectRatio?: boolean;
};

export type VideoObjectProps = {
  assetId: string;
  posterSrc?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
};

export type TextObjectProps = {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing?: number;
  lineHeight?: number;
  align: 'left' | 'center' | 'right';
};

export type HotspotObjectProps = {
  label?: string;
  invisible?: boolean;
  fill?: string;
  stroke?: string;
};

export type ShapeObjectProps = {
  shape: 'rect' | 'ellipse';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
};

export type SceneObjectProps =
  | ImageObjectProps
  | SvgObjectProps
  | VideoObjectProps
  | TextObjectProps
  | HotspotObjectProps
  | ShapeObjectProps
  | Record<string, unknown>;

export type SceneObject = {
  id: string;
  type: SceneObjectType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  tags?: string[];
  props: SceneObjectProps;
  interactions?: Interaction[];
};

export type TriggerType = 'onClick' | 'onSceneEnter' | 'onTimer' | 'onHover';
export type ActionType =
  | 'goToScene'
  | 'showObject'
  | 'hideObject'
  | 'toggleObject'
  | 'setText'
  | 'playVideo'
  | 'pauseVideo';

export type Interaction = {
  id: string;
  trigger: TriggerType;
  action: ActionType;
  targetId?: string;
  value?: string;
  delayMs?: number;
};

export type Scene = {
  id: string;
  name: string;
  notes?: string;
  background?: string;
  thumbnail?: string;
  objects: SceneObject[];
};

export type Project = {
  id: string;
  name: string;
  version: string;
  template: Template;
  startSceneId: string;
  assets: Asset[];
  scenes: Scene[];
  createdAt: string;
  updatedAt: string;
};
