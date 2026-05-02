import { Inspector } from '@/components/Inspector';

export function InspectorRail({ open }: { open: boolean }) {
  if (!open) return null;
  return <Inspector />;
}
