
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePunishmentsData } from '@/data/PunishmentsDataHandler';
import { Loader2 } from 'lucide-react';

const PunishmentsPage = () => {
  const { punishments, isLoading } = usePunishmentsData();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">Punishments</h1>
      
      {punishments.length === 0 ? (
        <div className="text-center p-8 bg-slate-800 rounded-lg">
          <p className="text-gray-400">You don't have any punishments yet.</p>
          <p className="text-gray-400">Create your first punishment to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {punishments.map((punishment) => (
            <div 
              key={punishment.id} 
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <h3 className="font-semibold mb-2">{punishment.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{punishment.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded">
                  Points Deduction: {punishment.points}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default PunishmentsPage;
