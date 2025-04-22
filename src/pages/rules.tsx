
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRulesData } from '@/data/RulesDataHandler';
import { Loader2 } from 'lucide-react';

const RulesPage = () => {
  const { rules, isLoading } = useRulesData();

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
      <h1 className="text-2xl font-bold mb-6">Rules</h1>
      
      {rules.length === 0 ? (
        <div className="text-center p-8 bg-slate-800 rounded-lg">
          <p className="text-gray-400">You don't have any rules yet.</p>
          <p className="text-gray-400">Create your first rule to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div 
              key={rule.id} 
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <h3 className="font-semibold mb-2">{rule.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{rule.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded">
                  {rule.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default RulesPage;
