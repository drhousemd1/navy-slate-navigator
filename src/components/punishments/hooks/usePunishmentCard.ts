
import { usePunishmentHistory } from './usePunishmentHistory';
import { usePunishmentApply } from './usePunishmentApply';
import { usePunishmentEditor } from './usePunishmentEditor';

interface UsePunishmentCardProps {
  id?: string;
  points: number;
}

export const usePunishmentCard = ({ id, points }: UsePunishmentCardProps) => {
  const history = usePunishmentHistory({ id });
  const apply = usePunishmentApply({ id, points });
  const editor = usePunishmentEditor({ id });

  const weekData = history.getWeekData();
  const frequencyCount = history.getFrequencyCount();
  
  return {
    weekData,
    frequencyCount,
    handlePunish: apply.handlePunish,
    isEditorOpen: editor.isEditorOpen,
    setIsEditorOpen: editor.setIsEditorOpen,
    handleEdit: editor.handleEdit,
    handleSavePunishment: editor.handleSavePunishment,
    handleDeletePunishment: editor.handleDeletePunishment
  };
};
