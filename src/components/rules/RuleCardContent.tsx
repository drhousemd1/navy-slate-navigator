
import React from 'react';
import { Rule } from '@/lib/ruleUtils';
import { Button } from '../ui/button';
import { Pencil, Skull } from 'lucide-react';
import RuleIcon from '../rule/RuleIcon';
import FrequencyTracker from '../rule/FrequencyTracker';
import HighlightedText from '../task/HighlightedText';
import PriorityBadge from '../task/PriorityBadge';

const RuleCardContent = ({
  rule,
  onEdit,
  onBreak,
  isViolated
}: {
  rule: Rule;
  onEdit: () => void;
  onBreak: () => void;
  isViolated: boolean;
}) => {
  return (
    <div className="relative z-10 flex flex-col p-4 md:p-6 h-full transition-opacity duration-[2000ms]">
      <div className="flex justify-between items-start mb-3">
        <PriorityBadge priority={rule.priority} />
      </div>
      
      <div className="flex items-start mb-auto">
        <div className="mr-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
            <RuleIcon 
              icon_url={rule.icon_url} 
              icon_name={rule.icon_name} 
              icon_color={rule.icon_color} 
            />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col">
          <h3 className="text-xl font-semibold inline-block">
            <HighlightedText 
              text={rule.title} 
              highlight={rule.highlight_effect || false} 
              color={rule.title_color} 
            />
          </h3>
          
          <div className="text-sm mt-1 inline-block">
            <HighlightedText 
              text={rule.description || ''} 
              highlight={rule.highlight_effect || false} 
              color={rule.subtext_color} 
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        {rule.frequency && (
          <FrequencyTracker 
            frequency={rule.frequency} 
            frequency_count={rule.frequency_count} 
            calendar_color={rule.calendar_color}
            usage_data={rule.usage_data}
          />
        )}
        
        <div className="flex space-x-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={onBreak}
            className={`${isViolated ? 'bg-red-600' : 'bg-light-navy'} text-white`}
          >
            <Skull className="w-4 h-4 mr-1" />
            {isViolated ? 'Violated' : 'Break'}
          </Button>
        </div>
      </div>
      
      {isViolated && (
        <div className="absolute inset-0 z-20 bg-white/30 rounded pointer-events-none" />
      )}
    </div>
  );
};

export default RuleCardContent;
