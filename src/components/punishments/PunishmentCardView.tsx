import React from 'react';
import { Card } from '../ui/card';
import PunishmentCardHeader from './PunishmentCardHeader';
import PunishmentCardContent from './PunishmentCardContent';
import PunishmentCardFooter from './PunishmentCardFooter';
import PunishmentBackground from './PunishmentBackground';
import type { PunishmentData } from '@/contexts/punishments/types';

interface PunishmentCardViewProps extends PunishmentData {
  onPunish: () => void;
  onEdit: () => void;
  disabled?: boolean;
  editDisabled?: boolean;
  currentDayIndex?: number;
}

/** Original card presentation shared by legacy and current action containers. */
export function PunishmentCardView(props: PunishmentCardViewProps) {
  const {
    title, description, points, dom_points, dom_supply, icon_name,
    icon_color, title_color, subtext_color, calendar_color, highlight_effect,
    background_image_url, background_opacity, focal_point_x, focal_point_y,
    frequency_count, usage_data, onPunish, onEdit, disabled, editDisabled, currentDayIndex,
  } = {
    ...props,
    // Match the original catalog reader without replacing valid false/zero values.
    dom_supply: props.dom_supply ?? 0,
    background_opacity: props.background_opacity ?? 50,
    highlight_effect: props.highlight_effect ?? false,
    focal_point_x: props.focal_point_x ?? 50,
    focal_point_y: props.focal_point_y ?? 50,
    icon_color: props.icon_color ?? '#ea384c',
    title_color: props.title_color ?? '#FFFFFF',
    subtext_color: props.subtext_color ?? '#8E9196',
    calendar_color: props.calendar_color ?? '#ea384c',
  };
  return (
      <Card className="relative overflow-hidden border-2 border-red-500 bg-navy">
        <PunishmentBackground 
          background_image_url={background_image_url}
          background_opacity={background_opacity}
          focal_point_x={focal_point_x}
          focal_point_y={focal_point_y}
        />
        
        <div className="relative z-10 flex flex-col p-4 md:p-6 h-full">
          <PunishmentCardHeader 
            points={points}
            dom_points={dom_points} 
            dom_supply={dom_supply} // Pass dom_supply
            onPunish={onPunish}
            disabled={disabled}
          />
          
          <PunishmentCardContent 
            icon_name={icon_name}
            icon_color={icon_color}
            title={title}
            description={description}
            title_color={title_color}
            subtext_color={subtext_color}
            highlight_effect={highlight_effect}
          />
          
          <PunishmentCardFooter 
            frequency_count={frequency_count}
            calendar_color={calendar_color}
            usage_data={usage_data}
            onEdit={onEdit}
            editDisabled={editDisabled}
            currentDayIndex={currentDayIndex}
          />
        </div>
      </Card>
  );
}

