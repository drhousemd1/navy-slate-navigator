import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { cardActivity } from '@/data/throne/schema';

export default function CardFooter({ title, calendarColor, activity, onEditClick }: {
  title: string; calendarColor: string | null; activity: ReturnType<typeof cardActivity>; onEditClick: () => void;
}) {
  return <div className="mt-4 space-y-3">
    {activity && <div className="flex flex-wrap gap-1.5" aria-label={`${title} recorded activity by date`}>
      {activity.days.map(day => <span key={day.date} title={`${day.date}: ${day.count} recorded`} aria-label={`${day.date}: ${day.count} recorded`}
        className="inline-flex w-8 h-8 items-center justify-center rounded-full text-xs border bg-black"
        style={{ color: calendarColor ?? '#7E69AB', borderColor: calendarColor ?? '#7E69AB', borderWidth: day.count ? 2 : 1 }}>
        {day.date.slice(-2)}<span className="sr-only">: {day.count}</span>
      </span>)}
    </div>}
    <div className="flex justify-end"><Button type="button" variant="ghost" className="text-foreground bg-navy hover:bg-light-navy" aria-label={`Edit ${title} card`} onClick={onEditClick}><Edit aria-hidden="true" className="h-4 w-4" /></Button></div>
  </div>;
}
