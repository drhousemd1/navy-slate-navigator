import PointsBadge from '@/components/task/PointsBadge';
import PunishmentBackground from './PunishmentBackground';
import PunishmentCardContent from './PunishmentCardContent';
import type { ReviewedPunishment } from './hooks/randomPunishmentReview';

export default function RandomPunishmentCard({ selection }: { selection: ReviewedPunishment | null }) {
  if (!selection) return null;
  const { punishment, expectedContext } = selection;
  return <div className="bg-navy border-2 border-red-500 rounded-lg p-4 mb-4 relative overflow-hidden">
    {punishment.background_image_url && <PunishmentBackground
      background_image_url={punishment.background_image_url}
      background_opacity={punishment.background_opacity ?? 100}
      focal_point_x={punishment.focal_point_x ?? 50} focal_point_y={punishment.focal_point_y ?? 50} />}
    <div className="relative z-10">
      <div className="flex justify-between items-start gap-2">
        <PunishmentCardContent icon_name={punishment.icon_name} icon_color={punishment.icon_color ?? '#FFFFFF'}
          title={punishment.title} description={punishment.description ?? ''}
          title_color={punishment.title_color ?? '#FFFFFF'} subtext_color={punishment.subtext_color ?? '#8E9196'}
          highlight_effect={punishment.highlight_effect ?? false} showIcon={false} />
        <PointsBadge points={-expectedContext.subDeduction} />
      </div>
      <div className="mt-3 rounded bg-navy/95 p-2 text-sm text-foreground">
        <p>Sub balance: {expectedContext.subDeduction === 0 ? '0' : `−${expectedContext.subDeduction}`} points</p>
        <p>Dom balance: {expectedContext.domAward === 0 ? '0' : `+${expectedContext.domAward}`} points</p>
        <p className="mt-1 text-xs">Sub actions: {expectedContext.sub.localDate} · {expectedContext.sub.timeZone}</p>
        {expectedContext.dom && <p className="text-xs">Dom award: {expectedContext.dom.localDate} · {expectedContext.dom.timeZone}</p>}
        <p className="mt-1 text-xs">You will record this punishment for the Sub participant.</p>
      </div>
    </div>
  </div>;
}
