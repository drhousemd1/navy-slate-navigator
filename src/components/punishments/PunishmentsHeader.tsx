
import React from 'react';
import CommonPageHeader from '../shared/CommonPageHeader';
import { Button } from '../ui/button';
import { Shuffle } from 'lucide-react';
import { usePunishments } from '@/contexts/PunishmentsContext';
import RandomPunishmentSelections from './RandomPunishmentSelections';

const PunishmentsHeader: React.FC = () => {
  const { punishments } = usePunishments();
  const [isRandomSelectorOpen, setIsRandomSelectorOpen] = React.useState(false);

  const randomButton = (
    <Button 
      variant="outline" 
      className="relative mr-auto flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white border-none h-8 px-3 text-sm font-medium rounded-md"
      onClick={() => setIsRandomSelectorOpen(true)}
      disabled={punishments.length === 0}
    >
      <Shuffle className="w-4 h-4" />
      Random
    </Button>
  );

  return (
    <>
      <CommonPageHeader title="Punishments" rightElement={randomButton} />
      <RandomPunishmentSelections
        isOpen={isRandomSelectorOpen} 
        onClose={() => setIsRandomSelectorOpen(false)} 
      />
    </>
  );
};

export default PunishmentsHeader;
