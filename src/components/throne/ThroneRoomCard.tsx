import { Activity, Pause, Play, ChevronRight } from 'lucide-react';
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
  return <Card className="relative overflow-hidden border-2 border-[#00f0ff] bg-navy">
    <CardBackground visibleImage={carousel.visibleImage} reducedMotion={carousel.reducedMotion}
      focalPointX={value.focalX ?? 50} focalPointY={value.focalY ?? 50} backgroundOpacity={value.opacity ?? 100} />
    <div className="relative z-20 flex flex-col p-4 md:p-6 h-full">
      <CardHeader priority={value.priority} total={activity?.total ?? null} />
      <CardContent title={value.title} description={value.description} titleColor={value.titleColor} subtextColor={value.descriptionColor}
        highlightEffect={value.highlight} iconComponent={renderCardIcon({ iconUrl: value.icon?.dataUrl,
          iconName: value.iconName ?? undefined, iconColor: value.iconColor ?? '#FFFFFF', fallbackIcon: <Activity className="w-6 h-6 text-black" /> })} />
      {(metricsError || metricsLoading || !activity) && <div className="mt-3 text-sm text-gray-400">
        {metricsError ? <p role="alert">Activity unavailable.</p> : metricsLoading ? <p role="status">Loading activity…</p> :
          <p>No activity available.</p>}
      </div>}
      <CardFooter title={value.title} calendarColor={value.calendarColor} activity={activity} onEditClick={onEdit} controls={carousel.count > 1 ? <>
        {!carousel.reducedMotion && <Button type="button" size="icon" variant="ghost" className="h-6 w-6 bg-gray-700 text-white hover:bg-gray-600 rounded-full" onClick={() => carousel.setPaused(!carousel.paused)} aria-label={`${carousel.paused ? 'Play' : 'Pause'} ${value.title} slideshow`}>{carousel.paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}</Button>}
        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 bg-gray-700 text-white hover:bg-gray-600 rounded-full" onClick={carousel.next} aria-label={`Next image for ${value.title}`}><ChevronRight className="h-3 w-3" /></Button>
      </> : null} />
      <span className="sr-only">{seriesLabels[value.series]} · {isMonthlyView ? 'This month' : 'This week'}</span>
    </div>
  </Card>;
}
