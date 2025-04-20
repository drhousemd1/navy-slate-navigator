
import React, { useState } from 'react';
import { useTasksQuery } from '@/hooks/useTasksQuery'; // useTasks does not exist, replaced by useTasksQuery
import TaskCard from '@/components/TaskCard'; // Fixed invalid path: was '@/components/task/TaskCard'
import TaskEditorModal from '@/components/task/TaskEditorModal';
import AppLayout from '@/components/AppLayout';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';

const Tasks: React.FC = () => {
  const { tasks, saveTask, deleteTask, isLoading, error, refetchTasks } = useTasksQuery(); // changed to match useTasksQuery export
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleOpenEditor = () => {
    setSelectedTask(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (selectedTask) {
        await saveTask({ ...taskData, id: selectedTask.id });
        toast({
          title: 'Task Updated',
          description: `Task "${taskData.title}" updated successfully.`,
        });
      } else {
        await saveTask(taskData);
        toast({
          title: 'Task Created',
          description: `Task "${taskData.title}" created successfully.`,
        });
      }
      setIsEditorOpen(false);
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: `Failed to save task: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({
        title: 'Task Deleted',
        description: 'Task deleted successfully.',
      });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: `Failed to delete task: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedTask(null);
  };

  const handleAddNewTask = () => {
    handleOpenEditor();
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) {
      return;
    }

    const { source, destination, draggableId } = result;

    if (source.index === destination.index) {
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ order: destination.index })
        .eq('id', draggableId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error updating task order:", error);
      toast({
        title: "Error",
        description: "Failed to update task order",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-navy">
      <p className="text-white">Loading tasks...</p>
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen bg-navy">
      <p className="text-white">Error: {error.message}</p>
    </div>;
  }

  return (
    <AppLayout onAddNewItem={handleAddNewTask}>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Tasks</h1>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tasks">
            {(provided) => (
              <ul
                className="space-y-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {tasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <TaskCard
                          {...task}
                          onEdit={() => handleEditTask(task)}
                          onDelete={() => handleDeleteTask(task.id as string)}
                        />
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
        <TaskEditorModal
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
          onSave={handleSaveTask}
          task={selectedTask}
        />
      </div>
    </AppLayout>
  );
};

export default Tasks;

