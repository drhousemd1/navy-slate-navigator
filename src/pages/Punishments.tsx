
import React from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Clock, Skull, Bomb, Zap } from 'lucide-react';
import { RewardsProvider } from '../contexts/RewardsContext';
import PunishmentsHeader from '../components/punishments/PunishmentsHeader';

const PunishmentsContent: React.FC = () => {
  const samplePunishments = [
    {
      id: '1',
      title: 'Missed Deadline',
      description: 'Failing to complete a task by the deadline',
      points: 15,
      icon_name: 'Skull',
      icon_color: '#ea384c'
    },
    {
      id: '2',
      title: 'Late to Meeting',
      description: 'Being late to a scheduled meeting or appointment',
      points: 10,
      icon_name: 'Clock',
      icon_color: '#ea384c'
    },
    {
      id: '3',
      title: 'Broke House Rule',
      description: 'Violating an established house rule',
      points: 20,
      icon_name: 'Bomb',
      icon_color: '#ea384c'
    },
    {
      id: '4',
      title: 'Procrastination',
      description: 'Postponing work without a valid reason',
      points: 5,
      icon_name: 'Zap',
      icon_color: '#ea384c'
    }
  ];

  const getIconComponent = (iconName: string) => {
    switch(iconName) {
      case 'Skull':
        return <Skull className="h-5 w-5 text-white" />;
      case 'Clock':
        return <Clock className="h-5 w-5 text-white" />;
      case 'Bomb':
        return <Bomb className="h-5 w-5 text-white" />;
      case 'Zap':
        return <Zap className="h-5 w-5 text-white" />;
      default:
        return <Skull className="h-5 w-5 text-white" />;
    }
  };

  return (
    <div className="p-4 pt-6">
      <PunishmentsHeader />
      
      <div className="space-y-4">
        {samplePunishments.map(punishment => (
          <PunishmentCard
            key={punishment.id}
            id={punishment.id}
            title={punishment.title}
            description={punishment.description}
            points={punishment.points}
            icon={getIconComponent(punishment.icon_name)}
            icon_name={punishment.icon_name}
            icon_color={punishment.icon_color}
          />
        ))}
      </div>
    </div>
  );
};

const Punishments: React.FC = () => {
  return (
    <AppLayout>
      <RewardsProvider>
        <PunishmentsContent />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Punishments;
