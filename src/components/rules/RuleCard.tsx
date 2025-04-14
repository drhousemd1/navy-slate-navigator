
import React from 'react';
import { Card } from '@/components/ui/card';
import { Check, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PriorityBadge from '../task/PriorityBadge';
import HighlightedText from '../task/HighlightedText';
import FrequencyTracker from '../task/FrequencyTracker';
import RuleBackground from './RuleBackground';
import { useImageCarousel } from '@/hooks/useImageCarousel';

interface Rule {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_images: string[];
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data: number[];
  carousel_timer: number;
}

interface RuleCardProps {
  rule: Rule;
  globalCarouselIndex: number;
  onRuleBroken: (rule: Rule) => void;
  onEdit: (rule: Rule) => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ 
  rule, 
  globalCarouselIndex,
  onRuleBroken,
  onEdit
}) => {
  const filteredImages = (rule.background_images || [])
    .filter(img => typeof img === 'string' && img.trim() !== '');
  
  const { visibleImage, transitionImage, isTransitioning } = useImageCarousel({
    images: filteredImages,
    globalCarouselIndex
  });

  return (
    <Card 
      className={`bg-dark-navy border-2 ${rule.highlight_effect ? 'border-[#00f0ff] shadow-[0_0_8px_2px_rgba(0,240,255,0.6)]' : 'border-[#00f0ff]'} overflow-hidden relative`}
    >
      <RuleBackground 
        visibleImage={visibleImage}
        transitionImage={transitionImage}
        isTransitioning={isTransitioning}
        focalPointX={rule.focal_point_x}
        focalPointY={rule.focal_point_y}
        backgroundOpacity={rule.background_opacity}
      />
      
      <div className="relative p-4 z-10">
        <div className="flex justify-between items-center mb-3">
          <PriorityBadge priority={rule.priority as 'low' | 'medium' | 'high'} />
          <Button
            variant="destructive"
            size="sm"
            className="bg-red-500 text-white hover:bg-red-600/90 h-7 px-3"
            onClick={() => onRuleBroken(rule)}
          >
            Rule Broken
          </Button>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 flex flex-col">
              <div className="text-xl font-semibold">
                <HighlightedText
                  text={rule.title}
                  highlight={rule.highlight_effect}
                  color={rule.title_color}
                />
              </div>
              
              {rule.description && (
                <div className="text-sm mt-1">
                  <HighlightedText
                    text={rule.description}
                    highlight={rule.highlight_effect}
                    color={rule.subtext_color}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <FrequencyTracker 
            frequency={rule.frequency}
            frequency_count={rule.frequency_count}
            calendar_color={rule.calendar_color}
            usage_data={rule.usage_data}
          />
          
          <Button 
            size="sm" 
            className="bg-gray-700 hover:bg-gray-600 rounded-full w-10 h-10 p-0"
            onClick={() => onEdit(rule)}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default RuleCard;
