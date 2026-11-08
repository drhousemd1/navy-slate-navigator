
import React from 'react';
import PointsBubbles from '../common/PointsBubbles';
import { HistoryButton } from '../activity/HistoryButton';

const PunishmentsHeader: React.FC<{ onOpenHistory?: () => void }> = ({ onOpenHistory }) => {
  return (
    <div className="relative flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Punishments</h1>
      {onOpenHistory && <div className="max-[400px]:absolute max-[400px]:left-0 max-[400px]:top-full"><HistoryButton title="Punishment History" onClick={onOpenHistory} /></div>}
      <PointsBubbles />
    </div>
  );
};

export default PunishmentsHeader;
