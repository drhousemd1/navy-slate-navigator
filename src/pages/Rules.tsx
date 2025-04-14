import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Check, Plus, Loader2 } from 'lucide-react';
import FrequencyTracker from '../components/rule/FrequencyTracker';
import PriorityBadge from '../components/task/PriorityBadge';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import HighlightedText from '../components/task/HighlightedText';
import RulesHeader from '../components/rule/RulesHeader';
import { RewardsProvider, useRewards } from '@/contexts/RewardsContext';
import { RuleCarouselProvider, useRuleCarousel } from '@/contexts/RuleCarouselContext';
import { getMondayBasedDay } from '@/lib/utils';
import RuleBackground from '@/components/Rules/RuleBackground';
import RuleCardHeader from '@/components/Rules/RuleCardHeader';
import RuleCardContent from '@/components/Rules/RuleCardContent';
import RuleCardFooter from '@/components/Rules/RuleCardFooter';
import { Rule, fetchRules, updateRuleViolation, deleteRule } from '@/lib/ruleUtils';

interface RulesContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const RulesContent: React.FC<RulesContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const navigate = useNavigate();
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();
  
  // Use the global carousel index from the context
  const { carouselTimer, globalCarouselIndex } = useRuleCarousel();
  
  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['rules'],
    queryFn: fetchRules,
    staleTime: 10000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load rules. Please try again.',
        variant: 'destructive',
      });
    }
  }, [error]);

  const handleNewRule = () => {
    console.log("Creating new rule");
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    console.log("Editing rule:", rule);
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      console.log(`Breaking rule ${rule.id}`);
      const success = await updateRuleViolation(rule.id, true);
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['rules'] });
        queryClient.invalidateQueries({ queryKey: ['rule-violations'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
        
        toast({
          title: 'Rule Broken',
          description: 'This violation has been recorded.',
        });
        
        navigate('/punishments');
      }
    } catch (err) {
      console.error('Error handling rule violation:', err);
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveRule = async (ruleData: Partial<Rule>) => {
    try {
      console.log("Saving rule:", ruleData);
      let savedRule;
      
      if (ruleData.id) {
        // Update existing rule logic
        const { error } = await supabase
          .from('rules')
          .update({
            title: ruleData.title,
            description: ruleData.description,
            priority: ruleData.priority,
            background_image_url: ruleData.background_image_url,
            background_opacity: ruleData.background_opacity,
            icon_url: ruleData.icon_url,
            icon_name: ruleData.icon_name,
            title_color: ruleData.title_color,
            subtext_color: ruleData.subtext_color,
            calendar_color: ruleData.calendar_color,
            icon_color: ruleData.icon_color,
            highlight_effect: ruleData.highlight_effect,
            focal_point_x: ruleData.focal_point_x,
            focal_point_y: ruleData.focal_point_y,
            frequency: ruleData.frequency,
            frequency_count: ruleData.frequency_count,
            updated_at: new Date().toISOString(),
            background_images: ruleData.background_images,
            carousel_timer: ruleData.carousel_timer
          })
          .eq('id', ruleData.id);
          
        if (error) throw error;
      } else {
        // Create new rule logic
        const newRule = {
          title: ruleData.title || 'New Rule',
          description: ruleData.description || '',
          priority: ruleData.priority || 'medium',
          background_opacity: ruleData.background_opacity || 100,
          icon_color: ruleData.icon_color || '#FFFFFF',
          title_color: ruleData.title_color || '#FFFFFF',
          subtext_color: ruleData.subtext_color || '#FFFFFF',
          calendar_color: ruleData.calendar_color || '#9c7abb',
          highlight_effect: ruleData.highlight_effect || false,
          focal_point_x: ruleData.focal_point_x || 50,
          focal_point_y: ruleData.focal_point_y || 50,
          frequency: ruleData.frequency || 'daily',
          frequency_count: ruleData.frequency_count || 3,
          usage_data: [0, 0, 0, 0, 0, 0, 0],
          background_images: ruleData.background_images || [],
          carousel_timer: ruleData.carousel_timer || 5,
          ...(ruleData.background_image_url && { background_image_url: ruleData.background_image_url }),
          ...(ruleData.icon_url && { icon_url: ruleData.icon_url }),
          ...(ruleData.icon_name && { icon_name: ruleData.icon_name }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: (await supabase.auth.getUser()).data.user?.id,
        };
        
        const { error } = await supabase
          .from('rules')
          .insert(newRule);
          
        if (error) throw error;
      }
      
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast({
        title: 'Success',
        description: `Rule ${currentRule ? 'updated' : 'created'} successfully!`,
      });
      setIsEditorOpen(false);
      
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
      console.log("Deleting rule:", ruleId);
      const success = await deleteRule(ruleId);
      
      if (success) {
        setCurrentRule(null);
        setIsEditorOpen(false);
        queryClient.invalidateQueries({ queryKey: ['rules'] });
        toast({
          title: 'Success',
          description: 'Rule deleted successfully!',
        });
      }
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
    <div className="p-4 pt-6">
      <RulesHeader />
      
      {isLoading ? (
        <div className="text-white">Loading rules...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-light-navy mb-4">No rules found. Create your first rule to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => (
            <Card 
              key={rule.id}
              className={`bg-dark-navy relative overflow-hidden border-2 ${rule.highlight_effect ? 'border-[#00f0ff] shadow-[0_0_8px_2px_rgba(0,240,255,0.6)]' : 'border-[#00f0ff]'}`}
            >
              <RuleBackground 
                backgroundImages={rule.background_images || []}
                backgroundImage={rule.background_image_url || undefined}
                backgroundOpacity={rule.background_opacity}
                focalPointX={rule.focal_point_x}
                focalPointY={rule.focal_point_y}
                globalCarouselIndex={globalCarouselIndex}
              />
              
              <RuleCardContent
                rule={rule}
                onEdit={() => handleEditRule(rule)}
                onBreak={() => handleRuleBroken(rule)}
                isViolated={false}
              />
            </Card>
          ))}
        </div>
      )}

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
    </div>
  );
};

const Rules: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const handleNewRule = () => {
    console.log("Parent component triggering new rule");
    setIsEditorOpen(true);
  };
  
  return (
    <AppLayout onAddNewItem={handleNewRule}>
      <RuleCarouselProvider>
        <RewardsProvider>
          <RulesContent 
            isEditorOpen={isEditorOpen}
            setIsEditorOpen={setIsEditorOpen}
          />
        </RewardsProvider>
      </RuleCarouselProvider>
    </AppLayout>
  );
};

export default Rules;
