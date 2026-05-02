import { Rect, Image as KImage, Text, Ellipse, Group, Line } from 'react-konva';
import type Konva from 'konva';
import type {
  HotspotObjectProps,
  ImageObjectProps,
  SceneObject,
  ShapeObjectProps,
  SvgObjectProps,
  TextObjectProps,
  VideoObjectProps,
} from '@/types/project';
import { useAssetImage } from '@/components/canvas/useObjectImage';

type Props = {
  obj: SceneObject;
  onSelect: (id: string, additive: boolean) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  draggable: boolean;
  registerNode: (id: string, node: Konva.Node | null) => void;
};

const evtAdditive = (
  e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): boolean => {
  const native = e.evt as MouseEvent | undefined;
  return Boolean(native?.shiftKey);
};

export function KonvaObject(props: Props) {
  switch (props.obj.type) {
    case 'image':
    case 'svg':
      return <ImageRenderer {...props} />;
    case 'video':
      return <VideoRenderer {...props} />;
    case 'text':
      return <TextRenderer {...props} />;
    case 'hotspot':
      return <HotspotRenderer {...props} />;
    case 'shape':
      return <ShapeRenderer {...props} />;
    default:
      return null;
  }
}

function commonProps(p: Props) {
  const { obj, onSelect, onDragStart, onDragMove, onDragEnd, draggable, registerNode } = p;
  return {
    id: obj.id,
    name: 'scene-object',
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    rotation: obj.rotation,
    opacity: obj.opacity,
    visible: obj.visible,
    draggable: draggable && !obj.locked,
    listening: !obj.locked,
    onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(obj.id, evtAdditive(e));
    },
    onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.cancelBubble = true;
      onSelect(obj.id, evtAdditive(e));
    },
    onDragStart: () => onDragStart(obj.id),
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragMove(obj.id, e.target.x(), e.target.y());
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEnd(obj.id, e.target.x(), e.target.y());
    },
    ref: (node: Konva.Node | null) => registerNode(obj.id, node),
  };
}

function ImageRenderer(p: Props) {
  const props = p.obj.props as ImageObjectProps | SvgObjectProps;
  const { image, status } = useAssetImage(props.assetId);
  const c = commonProps(p);
  if (status !== 'loaded' || !image) {
    return (
      <Rect
        {...c}
        width={p.obj.width}
        height={p.obj.height}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(236,72,153,0.6)"
        strokeWidth={2}
        dash={[10, 6]}
      />
    );
  }
  return (
    <KImage
      {...c}
      image={image}
      width={p.obj.width}
      height={p.obj.height}
    />
  );
}

function VideoRenderer(p: Props) {
  const props = p.obj.props as VideoObjectProps;
  const { image } = useAssetImage(props.posterSrc ? undefined : props.assetId);
  const c = commonProps(p);
  return (
    <Group {...c}>
      <Rect
        width={p.obj.width}
        height={p.obj.height}
        fill="#0f1014"
        stroke="rgba(236,72,153,0.85)"
        strokeWidth={3}
      />
      {image && (
        <KImage image={image} width={p.obj.width} height={p.obj.height} />
      )}
      <Group
        x={p.obj.width / 2}
        y={p.obj.height / 2}
        listening={false}
      >
        <Ellipse radiusX={48} radiusY={48} fill="rgba(236,72,153,0.85)" />
        <Line
          points={[-14, -22, -14, 22, 22, 0]}
          closed
          fill="#ffffff"
          x={0}
          y={0}
        />
      </Group>
      <Text
        x={12}
        y={p.obj.height - 36}
        text="VIDEO"
        fontFamily="ui-monospace, monospace"
        fontSize={24}
        fill="rgba(236,72,153,0.9)"
        listening={false}
      />
    </Group>
  );
}

function TextRenderer(p: Props) {
  const props = p.obj.props as TextObjectProps;
  const c = commonProps(p);
  return (
    <Text
      {...c}
      text={props.content}
      width={p.obj.width}
      height={p.obj.height}
      fontFamily={props.fontFamily}
      fontSize={props.fontSize}
      fontStyle={props.fontWeight >= 600 ? 'bold' : 'normal'}
      fill={props.color}
      letterSpacing={props.letterSpacing ?? 0}
      lineHeight={props.lineHeight ?? 1.2}
      align={props.align}
      verticalAlign="top"
    />
  );
}

function HotspotRenderer(p: Props) {
  const props = p.obj.props as HotspotObjectProps;
  const c = commonProps(p);
  const invisible = props.invisible ?? false;
  return (
    <Group {...c}>
      <Rect
        width={p.obj.width}
        height={p.obj.height}
        fill={invisible ? 'rgba(236,72,153,0.08)' : (props.fill ?? 'rgba(236,72,153,0.18)')}
        stroke={props.stroke ?? 'rgba(236,72,153,0.95)'}
        strokeWidth={3}
        dash={invisible ? [12, 8] : undefined}
        cornerRadius={8}
      />
      {props.label && !invisible && (
        <Text
          text={props.label}
          width={p.obj.width}
          height={p.obj.height}
          align="center"
          verticalAlign="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={36}
          fill="#0f1014"
          listening={false}
        />
      )}
      {invisible && (
        <Text
          text="hotspot"
          x={8}
          y={8}
          fontFamily="ui-monospace, monospace"
          fontSize={20}
          fill="rgba(236,72,153,0.9)"
          listening={false}
        />
      )}
    </Group>
  );
}

function ShapeRenderer(p: Props) {
  const props = p.obj.props as ShapeObjectProps;
  const c = commonProps(p);
  if (props.shape === 'ellipse') {
    return (
      <Group {...c}>
        <Ellipse
          x={p.obj.width / 2}
          y={p.obj.height / 2}
          radiusX={p.obj.width / 2}
          radiusY={p.obj.height / 2}
          fill={props.fill ?? '#ec4899'}
          stroke={props.stroke}
          strokeWidth={props.strokeWidth ?? 0}
        />
      </Group>
    );
  }
  return (
    <Rect
      {...c}
      width={p.obj.width}
      height={p.obj.height}
      fill={props.fill ?? '#ec4899'}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth ?? 0}
      cornerRadius={props.cornerRadius ?? 0}
    />
  );
}
