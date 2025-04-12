
import React from 'react';
import { Task } from '../lib/taskUtils';
import { Button } from './ui/button';
import { CheckCircle2, Pencil } from 'lucide-react';
import TaskBackgroundCarousel from './shared/TaskBackgroundCarousel';
import { wasCompletedToday, getLocalDateString } from '@/lib/taskUtils';

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onComplete: () => void;
  sharedImageIndex: number;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onComplete,
  sharedImageIndex,
}) => {
  const {
    title,
    description,
    points,
    background_image_url,
    background_images,
    background_opacity,
    focal_point_x,
    focal_point_y,
    completed_dates = [],
  } = task;

  const allImages =
    background_images && background_images.length > 0
      ? background_images
      : background_image_url
      ? [background_image_url]
      : [];

  const today = getLocalDateString(new Date());
  const isCompleted = wasCompletedToday(task, today);

  return (
    <div className={`relative overflow-hidden border-2 border-[#00f0ff] rounded-md ${allImages.length === 0 ? 'bg-navy' : ''}`}>
      <TaskBackgroundCarousel
        backgroundImages={allImages}
        backgroundOpacity={background_opacity}
        focalPointX={focal_point_x}
        focalPointY={focal_point_y}
        globalCarouselIndex={sharedImageIndex}
      />
      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full transition-opacity duration-[2000ms]">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-light-navy text-sm mb-4">{description}</p>
        <div className="flex justify-between items-center mt-auto">
          <span className="text-yellow-300 text-lg font-semibold">{points} pts</span>
          <div className="flex space-x-2">
            <Button variant="outline" className="text-white border-white" onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              onClick={onComplete}
              className={`${
                isCompleted ? 'bg-green-600' : 'bg-light-navy'
              } text-white`}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {isCompleted ? 'Completed' : 'Complete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
