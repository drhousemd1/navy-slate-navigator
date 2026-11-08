import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function HistoryButton({ title, onClick, className }: { title: string; onClick: () => void; className?: string }) {
  return <Button type="button" variant="ghost" size="icon" className={cn("h-6 w-6 shrink-0 text-gray-300 hover:text-nav-active", className)}
    aria-label={title} title={title} onClick={onClick}>
    <History className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{title}</span>
  </Button>;
}
