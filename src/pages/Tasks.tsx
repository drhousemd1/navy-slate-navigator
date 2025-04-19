
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "../components/AppLayout";
import TaskCard from "../components/TaskCard";
import TaskEditor from "../components/TaskEditor";
import TasksHeader from "../components/task/TasksHeader";
import { RewardsProvider } from "../contexts/RewardsContext";
import { Task, fetchTasks } from "../lib/taskUtils";
import { Skeleton } from "@/components/ui/skeleton";

const TASK_CACHE_KEY = "cachedTasks";

const useCachedTasks = () => {
  return useQuery<Task[]>(["tasks"], fetchTasks, {
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    initialData: () => {
      const stored = localStorage.getItem(TASK_CACHE_KEY);
      return stored ? (JSON.parse(stored) as Task[]) : undefined;
    },
    onSuccess: (data) => {
      localStorage.setItem(TASK_CACHE_KEY, JSON.stringify(data));
    },
  });
};

const TasksContent = ({
  isEditorOpen,
  setIsEditorOpen,
}: {
  isEditorOpen: boolean;
  setIsEditorOpen: (open: boolean) => void;
}) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const { data: tasks, isLoading } = useCachedTasks();

  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, idx) => (
        <Skeleton key={idx} className="h-32 rounded-xl" />
      ))}
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <TasksHeader onCreate={() => setIsEditorOpen(true)} />
      {isLoading ? (
        renderSkeletons()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => handleEditTask(task)}
              lazyLoadLogic
            />
          ))}
        </div>
      )}
      {isEditorOpen && (
        <TaskEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          task={currentTask}
        />
      )}
    </div>
  );
};

const TasksPage = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  return (
    <AppLayout>
      <RewardsProvider>
        <TasksContent
          isEditorOpen={isEditorOpen}
          setIsEditorOpen={setIsEditorOpen}
        />
      </RewardsProvider>
    </AppLayout>
  );
};

export default TasksPage;
