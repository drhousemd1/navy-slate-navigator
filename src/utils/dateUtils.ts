
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addDays } from 'date-fns';

export function getWeekDates(): string[] {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 0 });
  const end = endOfWeek(today, { weekStartsOn: 0 });
  
  return eachDayOfInterval({ start, end }).map(date => 
    format(date, 'yyyy-MM-dd')
  );
}

export function getCurrentMonthDates(): string[] {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  
  return eachDayOfInterval({ start, end }).map(date => 
    format(date, 'yyyy-MM-dd')
  );
}
