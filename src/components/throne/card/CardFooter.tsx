import type { ReactNode } from 'react';
import { Pencil, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { cardActivity } from '@/data/throne/schema';

export default function CardFooter({ title, calendarColor, activity, onEditClick, controls }: {
  title: string; calendarColor: string | null; activity: ReturnType<typeof cardActivity>; onEditClick: () => void; controls?: ReactNode;
}) {
  return <div className="flex items-center justify-between mt-4 gap-3">
    {activity && <div className="flex items-center space-x-1 min-w-0" aria-label={`${title} recorded activity by date`}><Calendar aria-hidden="true" className="h-4 w-4 mr-1 shrink-0" style={{ color: calendarColor ?? '#7E69AB' }} /><div className="flex flex-wrap gap-1">
      {activity.days.map(day => <span key={day.date} title={`${day.date}: ${day.count} recorded`} aria-label={`${day.date}: ${day.count} recorded`}
        className="inline-block w-4 h-4 rounded-full border"
        style={{ backgroundColor: day.count ? calendarColor ?? '#7E69AB' : 'transparent', borderColor: day.count ? 'transparent' : calendarColor ?? '#7E69AB' }}>
        <span className="sr-only">{day.date}: {day.count}</span>
      </span>)}
    </div></div>}
    <div className="ml-auto flex items-center gap-1">{controls}<Button type="button" variant="ghost" size="icon" className="shrink-0 bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center" aria-label={`Edit ${title} card`} onClick={onEditClick}><Pencil aria-hidden="true" className="h-4 w-4" /></Button></div>
  </div>;
}
