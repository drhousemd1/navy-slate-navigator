
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertOctagon, Edit2 } from 'lucide-react';

interface Rule {
  id: string;
  title: string;
  description: string | null;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  created_at: string;
  updated_at: string;
  icon_name?: string | null;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string | null;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  priority: 'low' | 'medium' | 'high';
  points: number;
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
    return <div className="text-white text-center py-10">Loading rules...</div>;
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-nav-inactive mb-4">No rules have been created yet.</p>
        <p className="text-sm text-nav-inactive">Click the "Add Rule" button to create your first rule.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {rules.map((rule) => (
        <Card key={rule.id} className="bg-navy border-light-navy overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-semibold">{rule.title}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => onEditRule(rule)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {rule.description && (
                <p className="text-nav-inactive text-sm mb-3">{rule.description}</p>
              )}
              
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-nav-inactive">Priority:</span>
                  <span className="text-xs text-white">{rule.priority}</span>
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs flex items-center gap-1"
                  onClick={() => onRecordViolation(rule.id)}
                >
                  <AlertOctagon className="h-3 w-3" />
                  Record Violation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RulesList;
