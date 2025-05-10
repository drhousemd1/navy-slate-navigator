
import React, { useState, useEffect } from 'react';
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
  const { rules, isLoading, error, saveRule, deleteRule, markRuleBroken, refetchRules } = useRules();

  // Force a data refresh when the component mounts
  useEffect(() => {
    console.log('RulesWithContext: Forcing data refresh');
    refetchRules().catch(err => 
      console.error('Error refreshing rules:', err)
    );
  }, [refetchRules]);

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

  // Check if we have an error but rules are available from cache
  if (error && rules.length > 0) {
    return (
      <div className="container mx-auto px-4 py-6 RulesContent">
        <RulesHeader />
        <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-600 rounded-md text-yellow-200">
          <p className="font-medium">Having trouble connecting to server. Showing cached rules.</p>
        </div>
        <RulesList
          rules={rules}
          isLoading={false}
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
  }

  // Show error message if there's an error and no cached rules
  if (error && !rules.length) {
    return (
      <div className="container mx-auto px-4 py-6 RulesContent">
        <RulesHeader />
        <div className="flex flex-col items-center justify-center mt-8">
          <div className="text-red-500 p-4 border border-red-400 rounded-md bg-red-900/20">
            <h3 className="font-bold mb-2">Error Loading Rules</h3>
            <p>{error.message || "Couldn't connect to the server. Please try again."}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading indicator only if actually loading and no cached data
  if (isLoading && !rules.length) {
    return (
      <div className="container mx-auto px-4 py-6 RulesContent">
        <RulesHeader />
        <div className="flex justify-center mt-8">
          <div className="text-white text-center">Loading rules...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 RulesContent">
      <RulesHeader />

      <RulesList
        rules={rules}
        isLoading={false}
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
