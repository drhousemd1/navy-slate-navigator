import React from 'react';
import { useRules, useCreateRule, useUpdateRule, useDeleteRule } from '@/data/RuleDataHandler';
import RuleCard from '@/components/RuleCard';

const RulesPage: React.FC = () => {
  const { data: rules, isLoading, isError } = useRules();
  const { mutate: createRule } = useCreateRule();
  const { mutate: updateRule } = useUpdateRule();
  const { mutate: deleteRule } = useDeleteRule();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError) {
    return <p>Error loading rules.</p>;
  }

  const handleCreateRule = () => {
    createRule({ title: 'New Rule', description: 'Description' });
  };

  return (
    <div>
      <h1>Rules Page</h1>
      <button onClick={handleCreateRule}>Create Rule</button>
      {rules?.map((rule) => (
        <RuleCard key={rule.id} id={rule.id || ''} />
      ))}
    </div>
  );
};

export default RulesPage;