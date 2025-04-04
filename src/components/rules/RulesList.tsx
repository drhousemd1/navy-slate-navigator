
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Rule {
  id: string;
  title: string;
  description: string;
  points_value: number;
  created_at: string;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: string | boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
}

interface RulesListProps {
  rules: Rule[];
  loading: boolean;
  onEditRule: (rule: Rule) => void;
  onRecordViolation: (ruleId: string) => void;
}

const RulesList: React.FC<RulesListProps> = ({ 
  rules, 
  loading, 
  onEditRule,
  onRecordViolation
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full bg-light-navy" />
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-nav-inactive">No rules found. Click the + button to create your first rule.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-20">
      {rules.map((rule) => (
        <div 
          key={rule.id} 
          className="bg-light-navy rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-3"
        >
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => onEditRule(rule)}
          >
            <div className="flex items-center gap-2 mb-1">
              {rule.icon_name && (
                <Box 
                  color={rule.icon_color || '#FFFFFF'} 
                  size={18} 
                />
              )}
              <h3 className="font-medium text-white">{rule.title}</h3>
            </div>
            {rule.description && (
              <p className="text-sm text-gray-300 line-clamp-2">{rule.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="destructive"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => onRecordViolation(rule.id)}
            >
              <AlertTriangle size={14} />
              <span>Rule Broken</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RulesList;
