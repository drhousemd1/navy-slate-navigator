import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';

import PriorityBadge from './TaskCardElements/PriorityBadge';
import PointsBadge from './TaskCardElements/PointsBadge';
import CompletionButton from './TaskCardElements/CompletionButton';
import TaskIcon from './TaskCardElements/TaskIcon';
import FrequencyTracker from './TaskCardElements/FrequencyTracker';
import HighlightedText from './TaskCardElements/HighlightedText';

import { getCurrentDayOfWeek } from '@/lib/taskUtils';
import CardHeader from './TaskCard/CardHeader';
import CardFooter from './TaskCard/CardFooter';
import CardBackground from './TaskCard/CardBackground';
import CardBody from './TaskCard/CardBody';
import TaskEditor from './TaskCardEditModal';
import { useTasks, useUpdateTask } from '@/data/TaskDataHandler';

interface TaskCardProps {
  id: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ id }) => {
  const { data: tasks, isLoading, isError } = useTasks();
  const { mutate: updateTask } = useUpdateTask();
  const task = tasks?.find((task) => task.id === id);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError || !task) {
    return <p>Error or Task not found</p>;
  }

  const {    
    title,
    description,
    points,
    completed = false,
    backgroundImage,
    backgroundImages = [],
    backgroundOpacity = 100,
    focalPointX = 50,
    focalPointY = 50,
    frequency,
    frequency_count = 1,
    usage_data = Array(7).fill(0),
    icon_url,
    icon_name,
    priority = 'medium',
    highlight_effect = false,
    title_color = '#FFFFFF',
    subtext_color = '#8E9196',
    calendar_color = '#7E69AB',
    icon_color = '#9b87f5',
    sharedImageIndex = 0,
    carouselTimer = 5
  } = task;

  const currentDayOfWeek = getCurrentDayOfWeek();
  const currentCompletions = usage_data[currentDayOfWeek] || 0;
  const maxCompletions = frequency_count || 1;
  const isFullyCompleted = currentCompletions >= maxCompletions;

  // Handle both legacy and new background image format (exactly like in PunishmentCard)
  const allBackgroundImages = backgroundImages && backgroundImages.length > 0 
    ? backgroundImages 
    : backgroundImage 
      ? [backgroundImage] 
      : [];

   const handleToggleCompletion = (completed: boolean) => {
    updateTask({ id: task.id, completed });
  };

  const handleSave = async (taskData: any) => {
    await updateTask({ id: task.id, ...taskData });
    setIsEditDialogOpen(false);
  };

  return (
    <Card className="relative overflow-hidden border-2 border-[#00f0ff]">
      {/* Background layer */}
      <CardBackground
        backgroundImages={allBackgroundImages}
        backgroundOpacity={backgroundOpacity}
        focalPointX={focalPointX}
        focalPointY={focalPointY}
        globalCarouselIndex={sharedImageIndex}
      />

      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <CardHeader
          priority={priority}
          points={points}
          completed={completed}
          onToggleCompletion={handleToggleCompletion}
          currentCompletions={currentCompletions}
          maxCompletions={maxCompletions}
        >
          <PriorityBadge priority={priority} />
          <PointsBadge points={points} />
          {handleToggleCompletion && (
             <CompletionButton 
              completed={completed} 
              onToggleCompletion={handleToggleCompletion}
              currentCompletions={currentCompletions}
              maxCompletions={maxCompletions}
            />
          )}
        </CardHeader>
        
        <CardBody
          icon_url={icon_url}
          icon_name={icon_name}
          title={title}
          description={description}
          highlight_effect={highlight_effect}
          title_color={title_color}
          subtext_color={subtext_color}
          icon_color={icon_color}
        >
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
              <TaskIcon 
                icon_url={icon_url} 
                icon_name={icon_name} 
                icon_color={icon_color} 
              />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-semibold inline-block">
              <HighlightedText 
                text={title} 
                highlight={highlight_effect || false} 
                color={title_color} 
              />
            </h3>
            
            <div className="text-sm mt-1 inline-block">
              <HighlightedText 
                text={description} 
                highlight={highlight_effect || false} 
                color={subtext_color} 
              />
            </div>
          </div>
        </CardBody>
        
        <CardFooter
          frequency={frequency}
          frequency_count={frequency_count}
          calendar_color={calendar_color}
          usage_data={usage_data}
          onEdit={() => setIsEditDialogOpen(true)}
        >
          {frequency && (
            <FrequencyTracker 
              frequency={frequency} 
              frequency_count={frequency_count} 
              calendar_color={calendar_color}
              usage_data={usage_data}
            />
          )}
          
          <div className="flex space-x-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditDialogOpen(true)}
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </div>
      
      {isFullyCompleted && (
        <div className="absolute inset-0 z-20 bg-white/30 rounded pointer-events-none" />
      )}
       <TaskEditor
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        taskData={{
          ...task,
        }}
        onSave={handleSave}
        onDelete={(taskId: string) => {
          // Implement delete logic here
          console.log('Task deleted:', taskId);
          setIsEditDialogOpen(false);
        }}
      />
    </Card>
  );
};

export default TaskCard;