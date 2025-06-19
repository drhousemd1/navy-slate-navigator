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
import { toastManager } from '@/lib/toastManager';
import { useAuth } from '@/contexts/auth';
import { forceResetAllRuleUsageData } from '@/lib/rulesUtils';

const RulesPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [hasForceReset, setHasForceReset] = useState(false);
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

  // Force reset all rule usage data on first load to clear old violation data
  useEffect(() => {
    if (user && !hasForceReset) {
      logger.debug('[Rules] Performing force reset of all rule usage data');
      forceResetAllRuleUsageData()
        .then(() => {
          setHasForceReset(true);
          // Reload rules after force reset
          refetchRules();
          logger.debug('[Rules] Force reset completed, rules reloaded');
        })
        .catch(error => {
          logger.error('[Rules] Error during force reset:', getErrorMessage(error));
        });
    }
  }, [user, hasForceReset, refetchRules]);

  // Check for resets on page load (after force reset is done)
  useEffect(() => {
    if (user && hasForceReset) {
      logger.debug('[Rules] Page loaded, checking for resets');
      checkAndReloadRules();
    }
  }, [user, hasForceReset, checkAndReloadRules]);

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
      
      toastManager.success("Success", ruleData.id ? "Rule updated successfully!" : "Rule created successfully!");
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
        // Toast is now handled by the optimistic mutation - no duplicate toast here
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
    <div className="p-4 pt-6 max-w-4xl mx-auto RulesContent">
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
