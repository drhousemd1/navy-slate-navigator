import PriorityBadge from '@/components/task/PriorityBadge';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

export default function CardHeader({ priority, total }: { priority: 'low' | 'medium' | 'high'; total: number | null }) {
  return <div className="flex justify-between items-start mb-3">
    <PriorityBadge priority={priority} />
    <div className="flex items-center gap-2">{total !== null && <Badge aria-label={`${total} recorded`} title={`${total} recorded`} className="bg-black border border-[#00f0ff] text-white font-bold flex items-center gap-1 px-2"><Activity aria-hidden="true" className="h-3 w-3" />{total}</Badge>}</div>
  </div>;
}
