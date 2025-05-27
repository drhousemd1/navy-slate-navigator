import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { RulesProvider, useRules } from '@/data/RulesDataHandler'; // useRules provides context
import { Rule, RuleFormValues } from '@/data/rules/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRulesData } from '@/data/hooks/useRulesData'; // useRulesData provides crud operations
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { Scale, LoaderCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/contexts/AuthContext';

const RulesPageContent: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const { 
    rules, 
    isLoading, 
    error, 
    saveRule, // From useRulesData
    deleteRule, // From useRulesData
    recordRuleViolation // From useRulesData
  } = useRulesData();
  const { user } = useAuth(); // To get current user for violations

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  React.useEffect(() => {
    const element = document.querySelector('.RulesContent');
    if (element) {
      const handleAddEvent = () => handleAddRule();
      element.addEventListener('add-new-rule', handleAddEvent);
      return () => element.removeEventListener('add-new-rule', handleAddEvent);
    }
  }, []);

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = async (formData: RuleFormValues) => {
    try {
      if (currentRule && currentRule.id) {
        await saveRule({ ...formData, id: currentRule.id });
      } else {
        await saveRule(formData);
      }
      setIsEditorOpen(false);
      setCurrentRule(null);
    } catch (e: unknown) {
      const descriptiveMessage = getErrorMessage(e);
      logger.error('Error saving rule in UI:', descriptiveMessage, e);
      toast({ title: "Save Error", description: descriptiveMessage, variant: "destructive" });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule(ruleId);
      setIsEditorOpen(false);
      setCurrentRule(null);
    } catch (e: unknown) {
      const descriptiveMessage = getErrorMessage(e);
      logger.error('Error deleting rule in UI:', descriptiveMessage, e);
      toast({ title: "Delete Error", description: descriptiveMessage, variant: "destructive" });
    }
  };

  const handleRecordViolation = async (ruleId: string) => {
    if (!user) {
        toast({title: "Error", description: "You must be logged in to record a violation.", variant: "destructive"});
        return;
    }
    // The recordRuleViolation from useRulesData is more appropriate here.
    // The one from useRules (context) might be for a different purpose or less direct.
    if (recordRuleViolation) {
        try {
            await recordRuleViolation(ruleId, user.id, "Violation recorded from Rules page.");
            // Toast handled within recordRuleViolation
        } catch(e:unknown) {
            // Error also handled within
        }
    } else {
        toast({title: "Not Available", description: "Recording violations is currently not available.", variant: "default"})
    }
  };

  let content;
  if (isLoading && rules.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-10 mt-4">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading rules...</p>
      </div>
    );
  } else if (error && rules.length === 0) {
    content = (
      <ErrorDisplay
        title="Error Loading Rules"
        message={getErrorMessage(error) || "Could not fetch rules."}
      />
    );
  } else if (!isLoading && rules.length === 0 && !error) {
    content = (
      <EmptyState
        icon={Scale}
        title="No Rules Yet"
        description="Establish some rules for the game."
        action={<Button onClick={handleAddRule}>Create New Rule</Button>}
      />
    );
  } else {
    content = (
      <RulesList
        rules={rules}
        isLoading={false}
        onEditRule={handleEditRule}
        onRecordViolation={handleRecordViolation}
        error={error}
      />
    );
  }
  
  return (
    <div className="p-4 pt-6 RulesContent">
      <RulesHeader onAddNewRule={handleAddRule} />
      {content}
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

const RulesPage: React.FC = () => {
    const handleAddNewItem = () => {
    logger.debug('AppLayout onAddNewItem called for Rules');
    const contentElement = document.querySelector('.RulesContent');
    if (contentElement) {
      logger.debug('Dispatching add-new-rule event to .RulesContent');
      const event = new CustomEvent('add-new-rule');
      contentElement.dispatchEvent(event);
    }
  };
  return (
    <AppLayout onAddNewItem={handleAddNewItem}>
      {/* RulesProvider from RulesDataHandler provides a context, 
          but useRulesData hook provides direct CRUD.
          Decide if RulesProvider is still needed or if useRulesData is sufficient.
          For now, keeping it if other components rely on the context. 
      */}
      <RulesProvider> 
        <ErrorBoundary fallbackMessage="Could not load rules.">
          <RulesPageContent />
        </ErrorBoundary>
      </RulesProvider>
    </AppLayout>
  );
};

export default RulesPage;
