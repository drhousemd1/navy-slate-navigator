import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CardBackground from './card/CardBackground';
import CardHeader from './card/CardHeader';
import CardContent from './card/CardContent';
import CardFooter from './card/CardFooter';
import { useImageCarousel } from './hooks/useImageCarousel';
import { renderCardIcon } from './utils/renderCardIcon';
import { cardActivity, seriesLabels, type ThroneCard } from '@/data/throne/schema';
import type { ActivityMetrics } from '@/data/metrics/projection';

export default function ThroneRoomCard({ card, metrics, metricsLoading, metricsError, isMonthlyView, onEdit }: {
  card: ThroneCard; metrics?: ActivityMetrics; metricsLoading: boolean; metricsError: unknown; isMonthlyView: boolean; onEdit: () => void;
}) {
  const value = card.definition;
  const carousel = useImageCarousel({ images: value.images.map(image => image?.dataUrl ?? null) });
  const activity = metrics && !metricsError ? cardActivity(metrics, value.series) : null;
  const hasImage = !!carousel.visibleImage && value.opacity !== 0;
  return <Card className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy">
    <CardBackground visibleImage={carousel.visibleImage} transitionImage={null} isTransitioning={false}
      focalPointX={value.focalX ?? 50} focalPointY={value.focalY ?? 50} backgroundOpacity={value.opacity ?? 100} />
    <div className="relative z-20 flex flex-col p-4 md:p-6 h-full">
      <CardHeader priority={value.priority} total={activity?.total ?? null} />
      <CardContent title={value.title} description={value.description} titleColor={value.titleColor} subtextColor={value.descriptionColor}
        highlightEffect={value.highlight} hasImage={hasImage} iconComponent={renderCardIcon({ iconUrl: value.icon?.dataUrl,
          iconName: value.iconName ?? undefined, iconColor: value.iconColor ?? 'hsl(var(--foreground))', fallbackIcon: <Activity className="w-6 h-6 text-black" /> })} />
      <div className={`mt-3 text-sm text-foreground ${hasImage ? 'bg-navy/90 p-2 rounded' : ''}`}>
        <p>{seriesLabels[value.series]} · {isMonthlyView ? 'This month' : 'This week'}</p>
        {metricsError ? <p role="alert">Activity is unavailable. The count is not shown.</p> : metricsLoading ? <p role="status">Loading activity…</p> :
          activity ? <p>{activity.range.start} to {activity.days.at(-1)?.date} · {activity.range.timeZone}</p> : <p>No {value.series.startsWith('dom') ? 'Dom' : 'Sub'} activity calendar is available.</p>}
      </div>
      <CardFooter title={value.title} calendarColor={value.calendarColor} activity={activity} onEditClick={onEdit} />
      {carousel.count > 1 && <div className="flex flex-wrap items-center gap-2 mt-2 text-foreground bg-navy rounded p-1">
        <span className="text-xs">Image {carousel.index + 1} of {carousel.count}</span>
        {!carousel.reducedMotion && <Button type="button" size="sm" variant="ghost" onClick={() => carousel.setPaused(!carousel.paused)} aria-label={`${carousel.paused ? 'Play' : 'Pause'} ${value.title} slideshow`}>{carousel.paused ? 'Play' : 'Pause'}</Button>}
        <Button type="button" size="sm" variant="ghost" onClick={carousel.next} aria-label={`Next image for ${value.title}`}>Next image</Button>
      </div>}
    </div>
  </Card>;
}
