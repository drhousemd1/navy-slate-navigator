import type { ReactNode } from 'react';
import CardText from '@/components/common/CardText';

export default function CardContent({ title, description, iconComponent, titleColor, subtextColor, highlightEffect, hasImage }: {
  title: string; description: string; iconComponent: ReactNode; titleColor: string | null; subtextColor: string | null; highlightEffect: boolean; hasImage: boolean;
}) {
  return <div className="flex items-start mb-auto gap-4">
    <div className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-[#00f0ff]" aria-hidden="true">{iconComponent}</div>
    <div className="min-w-0 flex-1">
      <h3 className="text-xl font-semibold break-words text-foreground"><CardText text={title} color={titleColor ?? 'hsl(var(--foreground))'} highlight={highlightEffect} hasImage={hasImage} surface="--navy" /></h3>
      <p className="text-sm mt-1 break-words text-foreground"><CardText text={description} color={subtextColor ?? 'hsl(var(--foreground))'} highlight={highlightEffect} hasImage={hasImage} surface="--navy" /></p>
    </div>
  </div>;
}
