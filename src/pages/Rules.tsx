
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/auth/AuthContext';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import RulesList from '@/components/rules/RulesList';
import RulesHeader from '@/components/rules/RulesHeader';
import RuleEditor from '@/components/RuleEditor';

// Define a type for rules that matches the database schema
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
  priority: 'low' | 'medium' | 'high'; // Restrict to valid values
  points: number; // Required
}

// Define a rule violation data structure
interface RuleViolationData {
  rule_id: string;
  day_of_week: number;
  week_number: string;
}

interface RulesContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const RulesContent: React.FC<RulesContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRule, setCurrentRule] = useState<Partial<Rule> | null>(null);
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

      // Map the database data to ensure it matches our Rule interface
      // Add default values for potentially missing fields
      const formattedRules = data ? data.map(rule => ({
        ...rule,
        // Add points with a default value if not present
        points: rule.points || 0, // Default to 0 if not present
        priority: (rule.priority || 'medium') as 'low' | 'medium' | 'high',
        frequency: (rule.frequency || 'daily') as 'daily' | 'weekly',
      })) : [];

      setRules(formattedRules as Rule[]);
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
      const formattedRuleData = {
        ...ruleData,
        title: ruleData.title || 'Untitled Rule',
        highlight_effect: Boolean(ruleData.highlight_effect),
        priority: (ruleData.priority || 'medium') as 'low' | 'medium' | 'high',
        frequency: (ruleData.frequency || 'daily') as 'daily' | 'weekly',
        frequency_count: ruleData.frequency_count || 3,
        background_opacity: ruleData.background_opacity || 100,
        focal_point_x: ruleData.focal_point_x || 50,
        focal_point_y: ruleData.focal_point_y || 50,
        points: ruleData.points ?? 0 // Use nullish coalescing for default
      };

      if (currentRule?.id) {
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
      
      const violationData: RuleViolationData = {
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
        onDelete={currentRule?.id ? handleDeleteRule : undefined}
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
