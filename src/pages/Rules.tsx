import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { Rule } from '@/data/interfaces/Rule';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRules } from '@/data/rules/queries';
import { useCreateRule, useUpdateRule, useDeleteRule } from '@/data/rules/mutations';
import { useCreateRuleViolation } from '@/data/rules/mutations/useCreateRuleViolation';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { useRulesData } from '@/data/hooks/useRulesData';

const RulesPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkAndReloadRules } = useRulesData();

  const { 
    data: rules = [], 
    isLoading, 
    error, 
    refetch: refetchRules
  } = useRules();

  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  const { mutateAsync: createRuleViolationMutation } = useCreateRuleViolation();

  // Check and reload rules when user is authenticated
  useEffect(() => {
    if (user?.id) {
      checkAndReloadRules();
    }
  }, [user?.id, checkAndReloadRules]);

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  useEffect(() => {
    const element = document.querySelector('.RulesContent'); 
    if (element) {
      const handleAddEvent = (_event: Event) => {
        handleAddRule();
      };
      element.addEventListener('add-new-rule', handleAddEvent);
      return () => {
        element.removeEventListener('add-new-rule', handleAddEvent);
      };
    }
  }, []);

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = async (ruleData: Partial<Rule>) => {
    try {
      if (!user?.id) {
        throw new Error('User must be authenticated to save rules');
      }

      if (ruleData.id) {
        const { id, ...updates } = ruleData;
        await updateRuleMutation({ id, ...updates });
      } else {
        const createVariables = {
          title: ruleData.title || 'Untitled Rule',
          user_id: user.id,
          description: ruleData.description,
          priority: ruleData.priority || 'medium',
          frequency: ruleData.frequency || 'daily',
          frequency_count: ruleData.frequency_count || 3,
          icon_name: ruleData.icon_name,
          icon_url: ruleData.icon_url,
          icon_color: ruleData.icon_color || '#FFFFFF',
          title_color: ruleData.title_color || '#FFFFFF', 
          subtext_color: ruleData.subtext_color || '#FFFFFF',
          calendar_color: ruleData.calendar_color || '#9c7abb',
          background_image_url: ruleData.background_image_url,
          background_opacity: ruleData.background_opacity === undefined ? 100 : ruleData.background_opacity,
          highlight_effect: ruleData.highlight_effect === undefined ? false : ruleData.highlight_effect,
          focal_point_x: ruleData.focal_point_x === undefined ? 50 : ruleData.focal_point_x,
          focal_point_y: ruleData.focal_point_y === undefined ? 50 : ruleData.focal_point_y,
        };
        await createRuleMutation(createVariables);
      }
      
      setIsEditorOpen(false);
      setCurrentRule(null);
      
      toast({
        title: "Success",
        description: ruleData.id ? "Rule updated successfully!" : "Rule created successfully!",
      });
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      logger.error('Error saving rule:', errorMessage);
      toast({
        title: 'Error Saving Rule',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRuleMutation(ruleId); 
      setCurrentRule(null);
      setIsEditorOpen(false);
      
      toast({
        title: "Success",
        description: "Rule deleted successfully!",
      });
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      logger.error('Error deleting rule:', errorMessage);
      toast({
        title: 'Error Deleting Rule',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      await createRuleViolationMutation({ rule_id: rule.id });
      
      toast({
        title: "Rule Marked Broken",
        description: `${rule.title} marked as broken. Violation recorded.`,
      });
      
      navigate('/punishments');
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      logger.error('Error marking rule as broken:', errorMessage);
      toast({
        title: 'Error',
        description: `Failed to mark rule "${rule.title}" as broken: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 RulesContent">
      <RulesHeader />

      <RulesList
        rules={rules}
        isLoading={isLoading}
        onEditRule={handleEditRule}
        onRuleBroken={handleRuleBroken}
        error={error}
      />

      <RuleEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentRule(null);
        }}
        ruleData={currentRule || undefined}
        onSave={handleSaveRule}
        onDelete={currentRule ? () => handleDeleteRule(currentRule.id) : undefined}
      />
    </div>
  );
};

const Rules: React.FC = () => {
  return (
    <AppLayout onAddNewItem={() => {
      const content = document.querySelector('.RulesContent');
      if (content) {
        const event = new CustomEvent('add-new-rule', { bubbles: true });
        content.dispatchEvent(event);
      }
    }}>
      <ErrorBoundary fallbackMessage="Could not load rules. Please try reloading.">
          <RulesPageContent />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Rules;
