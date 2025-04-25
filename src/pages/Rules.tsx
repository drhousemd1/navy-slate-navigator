
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { RulesProvider, useRules } from '@/contexts/RulesContext';
import { Rule } from '@/data/interfaces/Rule';

interface RulesContentProps {
  isEditorOpen: boolean;
  currentRule: Rule | null;
  onCloseEditor: () => void;
  onEditRule: (rule: Rule) => void;
  onSaveRule: (ruleData: Partial<Rule>) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onRuleBroken: (rule: Rule) => Promise<void>;
}

const RulesContent: React.FC<RulesContentProps> = ({
  isEditorOpen,
  currentRule,
  onCloseEditor,
  onEditRule,
  onSaveRule,
  onDeleteRule,
  onRuleBroken
}) => {
  const navigate = useNavigate();
  const { rules, isLoading } = useRules();

  const handleRuleBroken = async (rule: Rule) => {
    try {
      await onRuleBroken(rule);
      navigate('/punishments');
    } catch (err) {
      console.error('Error marking rule as broken:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <RulesHeader />

      <RulesList
        rules={rules}
        isLoading={isLoading}
        onEditRule={onEditRule}
        onRuleBroken={handleRuleBroken}
      />

      <RuleEditor
        isOpen={isEditorOpen}
        onClose={onCloseEditor}
        ruleData={currentRule || undefined}
        onSave={onSaveRule}
        onDelete={onDeleteRule}
      />
    </div>
  );
};

const Rules: React.FC = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const { saveRule, deleteRule, markRuleBroken } = useRules();

  const handleAddRule = () => {
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

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

  return (
    <AppLayout onAddNewItem={handleAddRule}>
      <RewardsProvider>
        <RulesProvider>
          <RulesContent
            isEditorOpen={isEditorOpen}
            currentRule={currentRule}
            onCloseEditor={() => {
              setIsEditorOpen(false);
              setCurrentRule(null);
            }}
            onEditRule={handleEditRule}
            onSaveRule={handleSaveRule}
            onDeleteRule={handleDeleteRule}
            onRuleBroken={markRuleBroken}
          />
        </RulesProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
