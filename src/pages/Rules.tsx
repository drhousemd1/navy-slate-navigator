
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { Rule } from '@/data/interfaces/Rule';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRulesData } from '@/data/hooks/useRulesData';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';

const RulesPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { 
    rules,
    isLoading, 
    error, 
    isUsingCachedData,
    saveRule,
    deleteRule,
    markRuleBroken,
    refetch: refetchRules,
    checkAndReloadRules
  } = useRulesData();

  // Weekly reset check - mirrors Tasks page approach exactly
  useEffect(() => {
    if (user) {
      checkAndReloadRules();
    }
  }, [user, checkAndReloadRules]);

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
      await saveRule(ruleData);
      
      setIsEditorOpen(false);
      setCurrentRule(null);
      
      toast({
        title: "Success",
        description: ruleData.id ? "Rule updated successfully!" : "Rule created successfully!",
      });
    } catch (err: unknown) {
      // Error handling is already done in useRulesData
      logger.error('Error in handleSaveRule:', getErrorMessage(err));
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const success = await deleteRule(ruleId);
      if (success) {
        setCurrentRule(null);
        setIsEditorOpen(false);
        
        toast({
          title: "Success",
          description: "Rule deleted successfully!",
        });
      }
    } catch (err: unknown) {
      // Error handling is already done in useRulesData
      logger.error('Error in handleDeleteRule:', getErrorMessage(err));
    }
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      await markRuleBroken(rule);
      navigate('/punishments');
    } catch (err: unknown) {
      // Error handling is already done in useRulesData
      logger.error('Error in handleRuleBroken:', getErrorMessage(err));
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
