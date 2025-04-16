
import { usePunishmentHistory } from './usePunishmentHistory';
import { usePunishmentApply } from './usePunishmentApply';
import { usePunishmentEditor } from './usePunishmentEditor';
import { usePunishmentsQuery } from '@/hooks/usePunishmentsQuery';

interface UsePunishmentCardProps {
  id?: string;
  points: number;
}

export const usePunishmentCard = ({ id, points }: UsePunishmentCardProps) => {
  const { getPunishmentHistory, applyPunishment } = usePunishmentsQuery();
  const history = usePunishmentHistory({ id, getPunishmentHistory });
  const apply = usePunishmentApply({ id, points, applyPunishment });
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
