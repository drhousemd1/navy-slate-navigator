
import React from 'react';
import TaskIcon from '@/components/task/TaskIcon';

interface CardContentProps {
  title: string;
  description: string;
  iconComponent: React.ReactNode;
  titleColor?: string;
  subtextColor?: string;
  highlightEffect?: boolean;
}

const CardContent: React.FC<CardContentProps> = ({
  title,
  description,
  iconComponent,
  titleColor = '#FFFFFF',
  subtextColor = '#8E9196',
  highlightEffect = false
}) => {
  return (
    <div className="flex items-start mb-auto">
      <div className="mr-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00f0ff' }}>
          {iconComponent}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <h3 className="text-xl font-semibold" 
            style={{ 
              color: titleColor,
              backgroundColor: highlightEffect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
              padding: highlightEffect ? '0 4px' : '0',
              borderRadius: highlightEffect ? '4px' : '0'
            }}>
          {title}
        </h3>
        
        <p className="text-sm mt-1" 
           style={{ 
             color: subtextColor,
             backgroundColor: highlightEffect ? 'rgba(245, 245, 209, 0.7)' : 'transparent',
             padding: highlightEffect ? '0 4px' : '0',
             borderRadius: highlightEffect ? '4px' : '0'
           }}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default CardContent;
