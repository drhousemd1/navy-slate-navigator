
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import RulesList from '@/components/rules/RulesList';
import RulesHeader from '@/components/rules/RulesHeader';
import RuleEditor from '@/components/rules/RuleEditor';

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
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
}

interface RulesContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const RulesContent: React.FC<RulesContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const { refetchRewards } = useRewards();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Transform data to match Rule interface if needed
      const transformedRules: Rule[] = (data || []).map(rule => ({
        id: rule.id,
        title: rule.title,
        description: rule.description || '',
        points_value: rule.points_value || 10, // Fallback to 10 if not set
        created_at: rule.created_at,
        icon_name: rule.icon_name,
        icon_color: rule.icon_color,
        title_color: rule.title_color,
        subtext_color: rule.subtext_color,
        calendar_color: rule.calendar_color,
        highlight_effect: Boolean(rule.highlight_effect),
        background_image_url: rule.background_image_url,
        background_opacity: rule.background_opacity,
        focal_point_x: rule.focal_point_x,
        focal_point_y: rule.focal_point_y
      }));

      setRules(transformedRules);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast({
        title: "Error",
        description: "Failed to load rules. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = async (ruleData: Partial<Rule>) => {
    try {
      // Ensure highlight_effect is a boolean before sending to database
      const formattedRuleData = {
        ...ruleData,
        highlight_effect: Boolean(ruleData.highlight_effect)
      };

      if (currentRule?.id) {
        // Update existing rule
        const { error } = await supabase
          .from('rules')
          .update(formattedRuleData)
          .eq('id', currentRule.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Rule updated successfully",
        });
      } else {
        // Create new rule
        const { error } = await supabase
          .from('rules')
          .insert([formattedRuleData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Rule created successfully",
        });
      }

      setIsEditorOpen(false);
      fetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: "Error",
        description: "Failed to save rule. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });

      fetchRules();
      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete rule. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const recordRuleViolation = async (ruleId: string) => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = format(today, 'yyyy-ww');
      
      const violationData = {
        rule_id: ruleId,
        day_of_week: dayOfWeek,
        week_number: weekNumber
      };
      
      const { error } = await supabase
        .from('rule_violations')
        .insert([violationData]);
      
      if (error) throw error;
      
      toast({
        title: "Rule violation recorded",
        description: "The rule violation has been recorded.",
        variant: "destructive",
      });
      
      // Refresh the points display
      refetchRewards();
    } catch (error) {
      console.error('Error recording rule violation:', error);
      toast({
        title: "Error",
        description: "Failed to record rule violation. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 pt-6">
      <RulesHeader onAddRule={handleAddRule} />
      
      <RulesList 
        rules={rules} 
        loading={loading} 
        onEditRule={handleEditRule}
        onRecordViolation={recordRuleViolation}
      />
      
      <RuleEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        ruleData={currentRule}
        onSave={handleSaveRule}
        onDelete={currentRule ? () => handleDeleteRule(currentRule.id) : undefined}
      />
    </div>
  );
};

const Rules: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  return (
    <AppLayout onAddNewItem={() => setIsEditorOpen(true)}>
      <RewardsProvider>
        <RulesContent 
          isEditorOpen={isEditorOpen}
          setIsEditorOpen={setIsEditorOpen}
        />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
