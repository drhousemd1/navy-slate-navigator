import React from 'react';

interface TaskCardBodyProps {
  icon_url?: string;
  icon_name?: string;
  title: string;
  description: string;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  icon_color?: string;
  children: React.ReactNode;
}

const TaskCardBody: React.FC<TaskCardBodyProps> = ({
  icon_url,
  icon_name,
  title,
  description,
  highlight_effect = false,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  icon_color = '#9b87f5',
  children
}) => {
  return (
    <div className="flex items-start mb-auto">
      {children}
    </div>
  );
};

export default TaskCardBody;