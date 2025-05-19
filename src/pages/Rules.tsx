import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { Rule } from '@/data/interfaces/Rule';
import ErrorBoundary from '@/components/ErrorBoundary';
import Hydrate from '@/components/Hydrate';
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
    isUsingCachedData 
  }: RulesQueryResult = useRulesData();

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  useEffect(() => {
    const element = document.querySelector('.RulesContent'); 
    if (element) {
      const handleAddEvent = (event: Event) => {
        console.log('Received add-new-rule event on RulesContent');
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

  if (error && (!rules || rules.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-6 RulesContent">
        <RulesHeader /> 
        <div className="flex flex-col items-center justify-center mt-8">
          <div className="text-red-500 p-4 border border-red-400 rounded-md bg-red-900/20">
            <h3 className="font-bold mb-2">Error Loading Rules</h3>
            <p>{error.message || "Couldn't connect to the server. Please try again."}</p>
          </div>
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
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 RulesContent">
      <RulesHeader />

      <RulesList
        rules={rules}
        isLoading={isLoading}
        onEditRule={handleEditRule}
        onRuleBroken={handleRuleBroken}
        error={error}
        isUsingCachedData={isUsingCachedData}
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
        <Hydrate fallbackMessage="Loading your rules...">
          <RulesPageContent />
        </Hydrate>
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Rules;
