
import React from 'react';
import { Rule } from '@/lib/ruleUtils';
import { Button } from '../ui/button';
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
        
        <Button
          onClick={onBreak}
          variant="destructive"
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Rule Broken
        </Button>
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
    </div>
  );
};

export default RuleCardContent;
