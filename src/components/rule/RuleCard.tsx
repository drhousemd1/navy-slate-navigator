
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check } from 'lucide-react';
import FrequencyTracker from '../task/FrequencyTracker';
import PriorityBadge from '../task/PriorityBadge';
import HighlightedText from '../task/HighlightedText';
import { Rule } from '@/data/interfaces/Rule';

interface RuleCardProps {
  rule: Rule;
  onEditRule: (rule: Rule) => void;
  onRuleBroken: (rule: Rule) => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, onEditRule, onRuleBroken }) => {
  return (
    <Card 
      className={`bg-dark-navy border-2 ${
        rule.highlight_effect ? 'border-[#00f0ff]' : 'border-[#00f0ff]'
      } overflow-hidden`}
    >
      <div className="relative p-4">
        {rule.background_image_url && (
          <div 
            className="absolute inset-0 z-0" 
            style={{
              backgroundImage: `url(${rule.background_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: `${rule.focal_point_x || 50}% ${rule.focal_point_y || 50}%`,
              opacity: (rule.background_opacity || 100) / 100
            }}
          />
        )}

        <div className="flex justify-between items-center mb-3 relative z-10">
          <PriorityBadge priority={rule.priority} />
          <Button
            variant="destructive"
            size="sm"
            className="bg-red-500 text-white hover:bg-red-600/90 h-7 px-3 z-10"
            onClick={() => onRuleBroken(rule)}
          >
            Rule Broken
          </Button>
        </div>

        <div className="mb-4 relative z-10">
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

        <div className="flex items-center justify-between mt-2 relative z-10">
          <FrequencyTracker 
            frequency={rule.frequency}
            frequency_count={rule.frequency_count}
            calendar_color={rule.calendar_color}
            usage_data={rule.usage_data}
          />

          <Button 
            size="sm" 
            className="bg-gray-700 hover:bg-gray-600 rounded-full w-10 h-10 p-0"
            onClick={() => onEditRule(rule)}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default RuleCard;
