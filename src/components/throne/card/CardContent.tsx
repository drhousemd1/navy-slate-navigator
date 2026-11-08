import type { ReactNode } from 'react';

export default function CardContent({ title, description, iconComponent, titleColor, subtextColor, highlightEffect }: {
  title: string; description: string; iconComponent: ReactNode; titleColor: string | null; subtextColor: string | null; highlightEffect: boolean;
}) {
  const highlight = { backgroundColor: highlightEffect ? 'rgba(245, 245, 209, 0.7)' : 'transparent', padding: highlightEffect ? '0 4px' : '0', borderRadius: highlightEffect ? '4px' : '0' };
  return <div className="flex items-start mb-auto">
    <div className="mr-4 flex-shrink-0" aria-hidden="true"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>{iconComponent}</div></div>
    <div className="min-w-0 flex-1 flex flex-col">
      <h3 className="text-xl font-semibold break-words" style={{ ...highlight, color: titleColor ?? '#FFFFFF' }}>{title}</h3>
      <p className="text-sm mt-1 break-words" style={{ ...highlight, color: subtextColor ?? '#8E9196' }}>{description}</p>
    </div>
  </div>;
}
