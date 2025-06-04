import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import RuleEditor from '../components/RuleEditor';
import { useRulesData } from '@/data/hooks/useRulesData';
import { useAuth } from '@/contexts/auth';
import { useUserIds } from '@/contexts/UserIdsContext';
import ErrorBoundary from '../components/ErrorBoundary';

const Rules: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const { user } = useAuth();
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  const {
    rules,
    isLoading,
    error,
    isUsingCachedData,
    checkAndReloadRules
  } = useRulesData();

  // Check for rules resets on page load when user is available
  useEffect(() => {
    if (user) {
      checkAndReloadRules();
    }
  }, [user, checkAndReloadRules]);

  const handleCreateRule = () => {
    setEditingRule(null);
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = (ruleData: any) => {
    // Save logic here
    console.log('Saving rule:', ruleData);
    setIsEditorOpen(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    // Delete logic here
    console.log('Deleting rule with ID:', ruleId);
    setIsEditorOpen(false);
  };

  return (
    <AppLayout onAddNewItem={handleCreateRule}>
      <ErrorBoundary fallbackMessage="Could not load rules. Please try reloading.">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <RulesHeader onCreateRule={handleCreateRule} />
          
          <RulesList
            rules={rules}
            isLoading={isLoading}
            error={error}
            isUsingCachedData={isUsingCachedData}
            onEditRule={handleEditRule}
          />

          <RuleEditor
            isOpen={isEditorOpen}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingRule(null);
            }}
            ruleData={editingRule}
            onSave={handleSaveRule}
            onDelete={editingRule ? () => handleDeleteRule(editingRule.id) : undefined}
          />
        </div>
      </ErrorBoundary>
    </AppLayout>
  );
};

export default Rules;
