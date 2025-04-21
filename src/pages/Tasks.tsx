
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import TasksContent from '../components/tasks/TasksContent';
import { RewardsProvider } from '../contexts/RewardsContext';
import { TaskCarouselProvider } from '../contexts/TaskCarouselContext';

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleNewTask = () => {
    console.log("Parent component triggering new task");
    setIsEditorOpen(true);
  };

  return (
    <AppLayout onAddNewItem={handleNewTask}>
      <TaskCarouselProvider>
        <RewardsProvider>
          <TasksContent
            isEditorOpen={isEditorOpen}
            setIsEditorOpen={setIsEditorOpen}
          />
        </RewardsProvider>
      </TaskCarouselProvider>
    </AppLayout>
  );
};

export default Tasks;
