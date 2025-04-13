
import React, { useEffect, useState } from 'react';
import { CardBackground } from './card/CardBackground';
import { useRuleCarousel } from '../carousel/RuleCarouselContext';
import { cn } from '@/lib/utils';

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_images: (string | null)[];
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
}

interface RuleCardProps {
  rule: Rule;
  onEdit: () => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({ rule, onEdit }) => {
  const images = rule.background_images?.filter(Boolean) as string[] || [];
  const { timer, resyncFlag } = useRuleCarousel();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, timer * 1000);
    return () => clearInterval(interval);
  }, [images, timer, resyncFlag]);

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-lg p-4 cursor-pointer group ${
      rule.highlight_effect ? 'shadow-[0_0_8px_2px_rgba(0,240,255,0.6)]' : ''
    }`} onClick={onEdit}>
      <CardBackground images={images} opacity={rule.background_opacity / 100} />
      <div className="relative z-10">
        {rule.icon_url && <img src={rule.icon_url} alt={rule.icon_name ?? ''} className="w-8 h-8 mb-2 rounded" />}
        <h3 className="text-lg font-semibold mb-1" style={{ color: rule.title_color }}>{rule.title}</h3>
        {rule.description && <p className="text-sm" style={{ color: rule.subtext_color }}>{rule.description}</p>}
      </div>
    </div>
  );
};

export default RuleCard;
