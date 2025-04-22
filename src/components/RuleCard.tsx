import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';
import RuleEditor from './RuleCardEditModal';
import { useRules, useUpdateRule } from '@/data/RuleDataHandler';

interface RuleCardProps {
  id: string;
}

const RuleCard: React.FC<RuleCardProps> = ({ id }) => {
  const { data: rules, isLoading, isError } = useRules();
  const { mutate: updateRule } = useUpdateRule();
  const rule = rules?.find((rule) => rule.id === id);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError || !rule) {
    return <p>Error or Rule not found</p>;
  }

  const handleSave = async (ruleData: any) => {
    await updateRule({ id: rule.id, ...ruleData });
    setIsEditDialogOpen(false);
  };

  return (
    <Card className="relative overflow-hidden border-2 border-[#00f0ff]">
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <h2>{rule.title}</h2>
        <p>{rule.description}</p>
        <Button onClick={() => setIsEditDialogOpen(true)}>Edit</Button>
      </div>
      <RuleEditor
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        ruleData={rule}
        onSave={handleSave}
        onDelete={(ruleId: string) => {
          // Implement delete logic here
          console.log('Rule deleted:', ruleId);
          setIsEditDialogOpen(false);
        }}
      />
    </Card>
  );
};

export default RuleCard;