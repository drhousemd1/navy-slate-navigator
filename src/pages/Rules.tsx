
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check, Plus, Loader2 } from 'lucide-react';
import FrequencyTracker from '../components/task/FrequencyTracker';
import PriorityBadge from '../components/task/PriorityBadge';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import { toast } from '@/hooks/use-toast';
import HighlightedText from '../components/task/HighlightedText';
import RulesHeader from '../components/rule/RulesHeader';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { useRulesQuery, Rule } from '@/hooks/useRulesQuery';

const Rules: React.FC = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const { rules, isLoading, createRule, updateRule, deleteRule, recordViolation } = useRulesQuery();

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      await recordViolation(rule.id);
      navigate('/punishments');
    } catch (err) {
      console.error('Error recording rule violation:', err);
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveRule = async (ruleData: Partial<Rule>) => {
    try {
      if (ruleData.id) {
        await updateRule(ruleData);
      } else {
        await createRule(ruleData);
      }
      setIsEditorOpen(false);
      setCurrentRule(null);
    } catch (err) {
      console.error('Error saving rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to save rule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule(ruleId);
      setIsEditorOpen(false);
      setCurrentRule(null);
    } catch (err) {
      console.error('Error deleting rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddRule}>
      <RewardsProvider>
        <div className="container mx-auto px-4 py-6">
          <RulesHeader />
          
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white mb-4">No rules found. Create your first rule!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="slow-fade-in">
                  <Card 
                    className={`bg-dark-navy border-2 ${rule.highlight_effect ? 'border-[#00f0ff] shadow-[0_0_8px_2px_rgba(0,240,255,0.6)]' : 'border-[#00f0ff]'} overflow-hidden`}
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
                        <PriorityBadge priority={rule.priority as 'low' | 'medium' | 'high'} />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-500 text-white hover:bg-red-600/90 h-7 px-3 z-10"
                          onClick={() => handleRuleBroken(rule)}
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
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <RuleEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setCurrentRule(null);
          }}
          ruleData={currentRule || undefined}
          onSave={handleSaveRule}
          onDelete={handleDeleteRule}
        />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
