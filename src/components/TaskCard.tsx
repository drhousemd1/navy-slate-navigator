
import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Edit, Check, Calendar, Plus, Minus } from 'lucide-react';
import { Badge } from './ui/badge';
import { CheckSquare, BookOpen, Coffee, Dumbbell, Star, Heart, Trophy, Target } from 'lucide-react';

interface TaskCardProps {
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  backgroundImage?: string;
  backgroundOpacity?: number;
  focalPointX?: number;
  focalPointY?: number;
  onEdit: () => void;
  onToggleCompletion?: (completed: boolean) => void;
  onDelete?: () => void;
  frequency?: 'daily' | 'weekly';
  frequency_count?: number;
  icon_url?: string;
  icon_name?: string;
  priority?: 'low' | 'medium' | 'high';
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  points,
  completed = false,
  backgroundImage,
  backgroundOpacity = 100,
  focalPointX = 50,
  focalPointY = 50,
  onEdit,
  onToggleCompletion,
  onDelete,
  frequency,
  frequency_count = 0,
  icon_url,
  icon_name,
  priority = 'medium',
  highlight_effect = false,
  title_color = '#FFFFFF',
  subtext_color = '#8E9196',
  calendar_color = '#7E69AB'
}) => {
  const generateTrackerCircles = () => {
    const circles = [];
    const total = frequency === 'daily' ? 7 : 4;
    
    for (let i = 0; i < total; i++) {
      circles.push(
        <div 
          key={i}
          className={`w-4 h-4 rounded-full border ${i < frequency_count ? 'border-transparent' : 'bg-transparent border-light-navy'}`}
          style={{
            backgroundColor: i < frequency_count ? calendar_color : 'transparent',
            borderColor: i < frequency_count ? 'transparent' : 'rgba(142, 145, 150, 0.5)'
          }}
        />
      );
    }
    
    return circles;
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'low':
        return 'bg-green-500';
      case 'medium':
      default:
        return 'bg-yellow-500';
    }
  };

  const renderIcon = () => {
    if (icon_url) {
      return <img src={icon_url} alt="Task icon" className="w-6 h-6" />;
    }
    
    if (icon_name) {
      switch (icon_name) {
        case 'CheckSquare':
          return <CheckSquare className="w-6 h-6 text-nav-active" />;
        case 'BookOpen':
          return <BookOpen className="w-6 h-6 text-nav-active" />;
        case 'Coffee':
          return <Coffee className="w-6 h-6 text-nav-active" />;
        case 'Dumbbell':
          return <Dumbbell className="w-6 h-6 text-nav-active" />;
        case 'Star':
          return <Star className="w-6 h-6 text-nav-active" />;
        case 'Heart':
          return <Heart className="w-6 h-6 text-nav-active" />;
        case 'Trophy':
          return <Trophy className="w-6 h-6 text-nav-active" />;
        case 'Target':
          return <Target className="w-6 h-6 text-nav-active" />;
        default:
          return <Calendar className="w-6 h-6 text-nav-active" />;
      }
    }
    
    return <Calendar className="w-6 h-6 text-nav-active" />;
  };

  return (
    <Card className={`relative overflow-hidden border-light-navy ${!backgroundImage ? 'bg-navy' : ''}`}>
      {backgroundImage && (
        <div 
          className="absolute inset-0 w-full h-full z-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${focalPointX}% ${focalPointY}%`,
            opacity: backgroundOpacity / 100,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <Badge 
            className={`${getPriorityColor()} text-white font-bold capitalize px-3 py-1`}
            variant="default"
          >
            {priority}
          </Badge>
          
          {onToggleCompletion && (
            <div className="flex items-center gap-2">
              <Badge 
                className="bg-nav-active text-white font-bold flex items-center gap-1"
                variant="default"
              >
                {points > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(points)}
              </Badge>
              
              <Button
                variant="default"
                size="sm"
                className={`${completed ? 'bg-green-600 text-white' : 'bg-green-500 text-white'} px-2 py-0 h-7`}
                onClick={() => onToggleCompletion(!completed)}
              >
                {completed ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span className="text-xs">Completed</span>
                  </span>
                ) : (
                  <span className="text-xs">Complete</span>
                )}
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-start mb-auto">
          <div className="mr-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-light-navy/30 flex items-center justify-center">
              {renderIcon()}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="text-xl font-semibold">
              {highlight_effect ? (
                <span className="relative inline">
                  <span 
                    className="absolute"
                    style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.4)',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: '100%',
                      zIndex: -1,
                      borderRadius: '3px',
                    }}
                  />
                  <span style={{ color: title_color, position: 'relative', padding: '0 3px' }}>{title}</span>
                </span>
              ) : (
                <span style={{ color: title_color }}>{title}</span>
              )}
            </h3>
            
            <div className="text-sm mt-1">
              {highlight_effect ? (
                <span className="relative inline">
                  <span 
                    className="absolute" 
                    style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.4)',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: '100%',
                      zIndex: -1,
                      borderRadius: '3px',
                    }}
                  />
                  <span style={{ color: subtext_color, position: 'relative', padding: '0 3px' }}>{description}</span>
                </span>
              ) : (
                <span style={{ color: subtext_color }}>{description}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          {frequency && (
            <div className="flex space-x-1 items-center">
              <Calendar 
                className="h-4 w-4 mr-1" 
                style={{ color: calendar_color }}
              />
              <div className="flex space-x-1">
                {generateTrackerCircles()}
              </div>
            </div>
          )}
          
          <div className="flex space-x-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {completed && (
        <div className="absolute inset-0 z-20 bg-white/30 rounded pointer-events-none" />
      )}
    </Card>
  );
};

export default TaskCard;
