import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { RewardsProvider } from '@/contexts/RewardsContext'; 
import { Rule } from '@/data/interfaces/Rule';
import { useSyncManager } from '@/hooks/useSyncManager';
import ErrorBoundary from '@/components/ErrorBoundary';
import Hydrate from '@/components/Hydrate';
import { useRulesData } from '@/data/hooks/useRulesData';

// Renamed component and using useRulesData directly
const RulesPageContent: React.FC = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  // Using useRulesData directly
  const { rules, isLoading, error, saveRule, deleteRule, markRuleBroken, refetchRules } = useRulesData();

  // const { syncNow } = useSyncManager({ // syncNow from useSyncManager not used directly here anymore
  //   intervalMs: 30000,
  //   enabled: true 
  // });
  
  // useEffect(() => { // syncNow call removed as preloading handles initial fetch
  //   // syncNow(); 
  // }, []);

  const handleAddRule = () => {
    console.log('handleAddRule called in RulesPageContent');
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

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
      // refetchRules(); // Consider if refetch is needed or if mutations handle cache updates
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule(ruleId); 
      setCurrentRule(null);
      setIsEditorOpen(false);
      // refetchRules(); // Consider if refetch is needed
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      await markRuleBroken(rule);
      // navigate('/punishments'); // Navigation can be handled by the toast or remain, depending on UX preference
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
        isLoading={isLoading && rules.length === 0} // Show loading if loading and no rules yet
        onEditRule={handleEditRule}
        onRuleBroken={handleRuleBroken}
        onCreateRuleClick={handleAddRule} 
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
      <RewardsProvider> {/* This might be app-wide, ensure it's needed here specifically */}
        {/* RulesProvider removed */}
        <ErrorBoundary fallbackMessage="Could not load rules. Please try reloading.">
          <Hydrate fallbackMessage="Loading your rules...">
            <RulesPageContent />
          </Hydrate>
        </ErrorBoundary>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
