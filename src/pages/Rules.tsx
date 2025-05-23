import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { Rule } from '@/data/interfaces/Rule';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRulesData, RulesQueryResult } from '@/data/RulesDataHandler';

const RulesPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const { 
    rules, 
    isLoading, 
    error, 
    saveRule, 
    deleteRule, 
    markRuleBroken,
  }: RulesQueryResult = useRulesData();

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  useEffect(() => {
    const element = document.querySelector('.RulesContent'); 
    if (element) {
      const handleAddEvent = (event: Event) => {
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
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule(ruleId); 
      setCurrentRule(null);
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      await markRuleBroken(rule);
    } catch (err) {
      console.error('Error marking rule as broken:', err);
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
