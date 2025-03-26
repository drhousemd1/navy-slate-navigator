
import React from 'react';
import AppLayout from '../components/AppLayout';
import PunishmentCard from '../components/PunishmentCard';
import { Alarm, Skull, Bomb, Zap } from 'lucide-react';

const Punishments: React.FC = () => {
  const samplePunishments = [
    {
      id: '1',
      title: 'Missed Deadline',
      description: 'Failing to complete a task by the deadline',
      points: 15,
      icon: <Skull className="h-5 w-5 text-white" />
    },
    {
      id: '2',
      title: 'Late to Meeting',
      description: 'Being late to a scheduled meeting or appointment',
      points: 10,
      icon: <Alarm className="h-5 w-5 text-white" />
    },
    {
      id: '3',
      title: 'Broke House Rule',
      description: 'Violating an established house rule',
      points: 20,
      icon: <Bomb className="h-5 w-5 text-white" />
    },
    {
      id: '4',
      title: 'Procrastination',
      description: 'Postponing work without a valid reason',
      points: 5,
      icon: <Zap className="h-5 w-5 text-white" />
    }
  ];

  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-white">Punishments</h1>
        </div>
        
        <div className="space-y-4">
          {samplePunishments.map(punishment => (
            <PunishmentCard
              key={punishment.id}
              title={punishment.title}
              description={punishment.description}
              points={punishment.points}
              icon={punishment.icon}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Punishments;
