import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';
import PunishmentEditor from './PunishmentCardEditModal';
import { usePunishments, useUpdatePunishment } from '@/data/PunishmentDataHandler';

interface PunishmentCardProps {
  id: string;
}

const PunishmentCard: React.FC<PunishmentCardProps> = ({ id }) => {
  const { data: punishments, isLoading, isError } = usePunishments();
  const { mutate: updatePunishment } = useUpdatePunishment();
  const punishment = punishments?.find((punishment) => punishment.id === id);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError || !punishment) {
    return <p>Error or Punishment not found</p>;
  }

  const handleSave = async (punishmentData: any) => {
    await updatePunishment({ id: punishment.id, ...punishmentData });
    setIsEditDialogOpen(false);
  };

  return (
    <Card className="relative overflow-hidden border-2 border-[#00f0ff]">
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <h2>{punishment.title}</h2>
        <p>{punishment.description}</p>
        <Button onClick={() => setIsEditDialogOpen(true)}>Edit</Button>
      </div>
      <PunishmentEditor
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        punishmentData={punishment}
        onSave={handleSave}
        onDelete={(punishmentId: string) => {
          // Implement delete logic here
          console.log('Punishment deleted:', punishmentId);
          setIsEditDialogOpen(false);
        }}
      />
    </Card>
  );
};

export default PunishmentCard;