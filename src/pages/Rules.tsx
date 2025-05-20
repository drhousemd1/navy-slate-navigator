
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { Rule } from '@/data/interfaces/Rule';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRulesData, RulesQueryResult } from '@/data/RulesDataHandler'; // RulesQueryResult has refetch as refetchRules

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
    isUsingCachedData,
    refetchRules // This is the refetch function from RulesQueryResult
  }: RulesQueryResult = useRulesData();

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  useEffect(() => {
    const element = document.querySelector('.RulesContent'); 
    if (element) {
      const handleAddEvent = (event: Event) => {
        // console.log('Received add-new-rule event on RulesContent'); // Kept for debugging if needed
        handleAddRule();
      };
      element.addEventListener('add-new-rule', handleAddEvent);
      return () => {
        element.removeEventListener('add-new-rule', handleAddEvent);
      };
    }
  }, []); // handleAddRule is stable if defined outside or wrapped in useCallback

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = async (ruleData: Partial<Rule>) => {
    try {
      await saveRule(ruleData);
      setIsEditorOpen(false);
      setCurrentRule(null);
      // refetchRules(); // saveRule should invalidate queries
    } catch (err) {
      console.error('Error saving rule:', err);
      // Toast for error is usually handled within saveRule or its mutation
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule(ruleId); 
      setCurrentRule(null);
      setIsEditorOpen(false);
      // refetchRules(); // deleteRule should invalidate queries
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      await markRuleBroken(rule);
      // refetchRules(); // markRuleBroken should invalidate queries
    } catch (err) {
      console.error('Error marking rule as broken:', err);
    }
  };
  
  // The specific error block previously here is now handled by RulesList
  // if (error && (!rules || rules.length === 0) && !isLoading) { ... }
  
  return (
    <div className="container mx-auto px-4 py-6 RulesContent">
      <RulesHeader /> {/* Assuming RulesHeader doesn't need onAddNewRule directly for this pattern */}

      <RulesList
        rules={rules}
        isLoading={isLoading} // Pass isLoading directly
        onEditRule={handleEditRule}
        onRuleBroken={handleRuleBroken}
        error={error}
        isUsingCachedData={isUsingCachedData}
        refetch={refetchRules}
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
