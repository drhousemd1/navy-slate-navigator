import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { RulesProvider, useRules } from '@/contexts/RulesContext';
import { Rule } from '@/data/interfaces/Rule';

// Separate component to use the useRules hook inside RulesProvider
const RulesWithContext: React.FC = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const { rules, isLoading, saveRule, deleteRule, markRuleBroken } = useRules();

  const handleAddRule = () => {
    console.log('handleAddRule called in RulesWithContext');
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  // Expose the handleAddRule function to be called from outside
  React.useEffect(() => {
    console.log('Setting up event listener for add-new-rule');
    const element = document.querySelector('.RulesContent');
    if (element) {
      const handleAddEvent = () => {
        console.log('Received add-new-rule event');
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
      navigate('/punishments');
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
      />

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

// Main Rules component that sets up the providers
const Rules: React.FC = () => {
  return (
    <AppLayout onAddNewItem={() => {
      console.log('AppLayout onAddNewItem called for Rules');
      const content = document.querySelector('.RulesContent');
      if (content) {
        console.log('Dispatching add-new-rule event');
        const event = new CustomEvent('add-new-rule');
        content.dispatchEvent(event);
      }
    }}>
      <RewardsProvider>
        <RulesProvider>
          <RulesWithContext />
        </RulesProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
