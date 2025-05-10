import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useNavigate } from 'react-router-dom';
import RuleEditor from '../components/RuleEditor';
import RulesHeader from '../components/rule/RulesHeader';
import RulesList from '../components/rule/RulesList';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { RulesProvider, useRules } from '@/contexts/RulesContext';
import { Rule } from '@/data/interfaces/Rule';
import { useSyncManager } from '@/hooks/useSyncManager';
import { toast } from "@/hooks/use-toast";

// Separate component to use the useRules hook inside RulesProvider
const RulesWithContext: React.FC = () => {
  const navigate = useNavigate();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  const { rules, isLoading, error, saveRule, deleteRule, markRuleBroken } = useRules();

  // Use the sync manager to keep data in sync
  const { syncNow, lastSyncTime, forceFullRefresh } = useSyncManager({ 
    intervalMs: 30000, // 30 seconds, consistent with other pages
    enabled: true,
    maxRetries: 1 // Reduce retries to avoid timeout loops
  });
  
  // Initial sync when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setIsRefreshing(true);
      try {
        await syncNow();
        setHasAttemptedRefresh(true);
      } catch (err) {
        console.error('Error syncing data:', err);
        toast({
          title: "Connection issue",
          description: "Having trouble connecting to the server. Using cached data if available.",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
      }
    };
    
    fetchData();
  }, []);

  const handleAddRule = () => {
    console.log('handleAddRule called in RulesWithContext');
    setCurrentRule(null);
    setIsEditorOpen(true);
  };

  // Expose the handleAddRule function to be called from outside
  React.useEffect(() => {
    console.log('Setting up event listener for add-new-rule');
    const element = document.querySelector('.RulesContent');
    if (element) {
      const handleAddEvent = () => {
        console.log('Received add-new-rule event');
        handleAddRule();
      };
      element.addEventListener('add-new-rule', handleAddEvent);
      return () => {
        element.removeEventListener('add-new-rule', handleAddEvent);
      };
    }
  }, []);

  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsEditorOpen(true);
  };

  const handleSaveRule = async (ruleData: Partial<Rule>) => {
    try {
      await saveRule(ruleData);
      setIsEditorOpen(false);
      setCurrentRule(null);
      
      // Synchronize data after rule save
      setTimeout(() => syncNow(), 500);
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule(ruleId);
      setCurrentRule(null);
      setIsEditorOpen(false);
      
      // Synchronize data after rule delete
      setTimeout(() => syncNow(), 500);
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleRuleBroken = async (rule: Rule) => {
    try {
      await markRuleBroken(rule);
      navigate('/punishments');
    } catch (err) {
      console.error('Error marking rule as broken:', err);
    }
  };

  // Handle manual refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    forceFullRefresh()
      .then(() => {
        setHasAttemptedRefresh(true);
        toast({
          title: "Refresh complete",
          description: "Data has been refreshed from the server",
        });
      })
      .catch((err) => {
        console.error('Error during manual refresh:', err);
        toast({
          title: "Refresh failed",
          description: "Could not connect to server. Using cached data if available.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  };

  // First render: show loading indicator with refresh button
  if (isLoading && !hasAttemptedRefresh && !rules.length) {
    return (
      <div className="container mx-auto px-4 py-6 RulesContent">
        <RulesHeader />
        <div className="flex flex-col items-center justify-center mt-8 space-y-4">
          <div className="text-white text-center">Loading rules...</div>
          <button 
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    );
  }

  // Show cached data with warning if there's an error
  if (error && rules.length > 0) {
    return (
      <div className="container mx-auto px-4 py-6 RulesContent">
        <RulesHeader />
        <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-600 rounded-md text-yellow-200">
          <p className="font-medium">Having trouble connecting to server. Showing cached rules.</p>
          <div className="mt-2">
            <button 
              onClick={handleManualRefresh}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-white"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Try Again'}
            </button>
          </div>
        </div>
        <RulesList
          rules={rules}
          isLoading={false}
          onEditRule={handleEditRule}
          onRuleBroken={handleRuleBroken}
        />

        <RuleEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setCurrentRule(null);
          }}
          ruleData={currentRule || undefined}
          onSave={handleSaveRule}
          onDelete={handleDeleteRule}
        />
      </div>
    );
  }

  // Show error message if there's an error and no cached rules
  if (error && !rules.length && hasAttemptedRefresh) {
    return (
      <div className="container mx-auto px-4 py-6 RulesContent">
        <RulesHeader />
        <div className="flex flex-col items-center justify-center mt-8">
          <div className="text-red-500 p-4 border border-red-400 rounded-md bg-red-900/20">
            <h3 className="font-bold mb-2">Error Loading Rules</h3>
            <p>{error.message || "Couldn't connect to the server. Please try again."}</p>
            <div className="mt-4">
              <button 
                onClick={handleManualRefresh}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing...' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No rules but no error either - empty state
  if (!isLoading && !rules.length) {
    return (
      <div className="container mx-auto px-4 py-6 RulesContent">
        <RulesHeader />
        <div className="flex flex-col items-center justify-center mt-8 p-6 border border-dashed border-gray-600 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">No Rules Found</h3>
          <p className="text-gray-400 mb-4">Create your first rule to get started</p>
          <button
            onClick={handleAddRule}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
          >
            Add New Rule
          </button>
        </div>

        <RuleEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setCurrentRule(null);
          }}
          ruleData={currentRule || undefined}
          onSave={handleSaveRule}
          onDelete={handleDeleteRule}
        />
      </div>
    );
  }

  // Normal state - show rules
  return (
    <div className="container mx-auto px-4 py-6 RulesContent">
      <RulesHeader />

      {isRefreshing && (
        <div className="mb-4 p-2 bg-blue-500/20 border border-blue-600 rounded-md text-blue-200">
          <p className="text-sm">Refreshing data...</p>
        </div>
      )}

      <RulesList
        rules={rules}
        isLoading={false}
        onEditRule={handleEditRule}
        onRuleBroken={handleRuleBroken}
      />

      <RuleEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentRule(null);
        }}
        ruleData={currentRule || undefined}
        onSave={handleSaveRule}
        onDelete={handleDeleteRule}
      />
    </div>
  );
};

// Main Rules component that sets up the providers
const Rules: React.FC = () => {
  return (
    <AppLayout onAddNewItem={() => {
      console.log('AppLayout onAddNewItem called for Rules');
      const content = document.querySelector('.RulesContent');
      if (content) {
        console.log('Dispatching add-new-rule event');
        const event = new CustomEvent('add-new-rule');
        content.dispatchEvent(event);
      }
    }}>
      <RewardsProvider>
        <RulesProvider>
          <RulesWithContext />
        </RulesProvider>
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rules;
