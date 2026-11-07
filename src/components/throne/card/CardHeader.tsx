import PriorityBadge from '@/components/task/PriorityBadge';

export default function CardHeader({ priority, total }: { priority: 'low' | 'medium' | 'high'; total: number | null }) {
  return <div className="flex justify-between items-start mb-3 gap-3">
    <PriorityBadge priority={priority} />
    {total !== null && <span className="rounded-full bg-black text-[#00f0ff] border border-[#00f0ff] px-3 py-1 text-sm font-bold">{total} recorded</span>}
  </div>;
}
