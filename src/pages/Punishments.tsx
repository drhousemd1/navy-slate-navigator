
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Skull } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';
import { PunishmentsProvider, usePunishments } from '../contexts/PunishmentsContext';
import PunishmentEditor from '../components/PunishmentEditor';

const PunishmentsContent: React.FC = () => {
  const { punishments, loading, createPunishment, updatePunishment } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<any>(undefined);

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setCurrentPunishment(undefined);
  };

  const handleAddNewPunishment = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };

  return (
    <div className="p-4 pt-6 PunishmentsContent">
      <PunishmentsHeader />

      {punishments.length === 0 && !loading ? (
        <div className="text-center py-12 text-gray-400">
          <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Punishments Yet</h3>
          <p>Create your first punishment to deduct points for undesirable behaviors.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {punishments.map(punishment => (
            <PunishmentCard
              key={punishment.id}
              id={punishment.id}
              title={punishment.title}
              description={punishment.description || ''}
              points={punishment.points}
              icon_name={punishment.icon_name}
              icon_color={punishment.icon_color}
              title_color={punishment.title_color}
              subtext_color={punishment.subtext_color}
              calendar_color={punishment.calendar_color}
              highlight_effect={punishment.highlight_effect}
              background_image_url={punishment.background_image_url}
              background_opacity={punishment.background_opacity}
              focal_point_x={punishment.focal_point_x}
              focal_point_y={punishment.focal_point_y}
            />
          ))}
        </div>
      )}

      <PunishmentEditor 
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        punishmentData={currentPunishment}
        onSave={async (data) => {
          try {
            if (data.id) {
              await updatePunishment(data.id, data);
            } else {
              await createPunishment(data);
            }
            handleEditorClose();
          } catch (error) {
            console.error("Error saving punishment:", error);
          }
        }}
      />
    </div>
  );
};

const Punishments: React.FC = () => {
  // Direct approach to expose the add new punishment functionality
  const contentRef = React.useRef<{ handleAddNewPunishment?: () => void }>({});

  const handleAddNew = () => {
    if (contentRef.current && contentRef.current.handleAddNewPunishment) {
      contentRef.current.handleAddNewPunishment();
    }
  };

  return (
    <AppLayout onAddNewItem={handleAddNew}>
      <RewardsProvider>
        <PunishmentsProvider>
          <PunishmentsContentWrapper contentRef={contentRef} />
        </PunishmentsProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

// Wrapper component to pass the ref
const PunishmentsContentWrapper: React.FC<{ contentRef: React.MutableRefObject<{ handleAddNewPunishment?: () => void }> }> = ({ contentRef }) => {
  const { punishments, loading, createPunishment, updatePunishment } = usePunishments();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentPunishment, setCurrentPunishment] = useState<any>(undefined);

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setCurrentPunishment(undefined);
  };

  const handleAddNewPunishment = () => {
    setCurrentPunishment(undefined);
    setIsEditorOpen(true);
  };

  // Expose the function to the parent component
  React.useEffect(() => {
    contentRef.current.handleAddNewPunishment = handleAddNewPunishment;
    return () => {
      contentRef.current = {};
    };
  }, [contentRef]);

  return (
    <div className="p-4 pt-6 PunishmentsContent">
      <PunishmentsHeader />

      {punishments.length === 0 && !loading ? (
        <div className="text-center py-12 text-gray-400">
          <Skull className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Punishments Yet</h3>
          <p>Create your first punishment to deduct points for undesirable behaviors.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {punishments.map(punishment => (
            <PunishmentCard
              key={punishment.id}
              id={punishment.id}
              title={punishment.title}
              description={punishment.description || ''}
              points={punishment.points}
              icon_name={punishment.icon_name}
              icon_color={punishment.icon_color}
              title_color={punishment.title_color}
              subtext_color={punishment.subtext_color}
              calendar_color={punishment.calendar_color}
              highlight_effect={punishment.highlight_effect}
              background_image_url={punishment.background_image_url}
              background_opacity={punishment.background_opacity}
              focal_point_x={punishment.focal_point_x}
              focal_point_y={punishment.focal_point_y}
            />
          ))}
        </div>
      )}

      <PunishmentEditor 
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        punishmentData={currentPunishment}
        onSave={async (data) => {
          try {
            if (data.id) {
              await updatePunishment(data.id, data);
            } else {
              await createPunishment(data);
            }
            handleEditorClose();
          } catch (error) {
            console.error("Error saving punishment:", error);
          }
        }}
      />
    </div>
  );
};

export default Punishments;
