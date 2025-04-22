import React from 'react';
import { usePunishments, useCreatePunishment, useUpdatePunishment, useDeletePunishment } from '@/data/PunishmentDataHandler';
import PunishmentCard from '@/components/PunishmentCard';

const PunishmentsPage: React.FC = () => {
  const { data: punishments, isLoading, isError } = usePunishments();
  const { mutate: createPunishment } = useCreatePunishment();
  const { mutate: updatePunishment } = useUpdatePunishment();
  const { mutate: deletePunishment } = useDeletePunishment();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError) {
    return <p>Error loading punishments.</p>;
  }

  const handleCreatePunishment = () => {
    createPunishment({ title: 'New Punishment', points: 10 });
  };

  return (
    <div>
      <h1>Punishments Page</h1>
      <button onClick={handleCreatePunishment}>Create Punishment</button>
      {punishments?.map((punishment) => (
        <PunishmentCard key={punishment.id} id={punishment.id || ''} />
      ))}
    </div>
  );
};

export default PunishmentsPage;