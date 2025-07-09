import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TimePickerProps {
  value: string; // Format: "HH:MM"
  onChange: (time: string) => void;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, disabled }) => {
  const [hour, minute] = value.split(':').map(Number);
  const is24Hour = true; // Using 24-hour format for simplicity

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleHourChange = (newHour: string) => {
    const formattedHour = newHour.padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    onChange(`${formattedHour}:${formattedMinute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = newMinute.padStart(2, '0');
    onChange(`${formattedHour}:${formattedMinute}`);
  };

  const formatHour = (h: number) => h.toString().padStart(2, '0');
  const formatMinute = (m: number) => m.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Select
          value={hour.toString()}
          onValueChange={handleHourChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-16 bg-navy border-light-navy text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-navy border-light-navy">
            {hours.map((h) => (
              <SelectItem 
                key={h} 
                value={h.toString()}
                className="text-white hover:bg-light-navy focus:bg-light-navy"
              >
                {formatHour(h)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="text-gray-400">:</span>
        
        <Select
          value={minute.toString()}
          onValueChange={handleMinuteChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-16 bg-navy border-light-navy text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-navy border-light-navy max-h-48">
            {minutes.filter(m => m % 5 === 0).map((m) => (
              <SelectItem 
                key={m} 
                value={m.toString()}
                className="text-white hover:bg-light-navy focus:bg-light-navy"
              >
                {formatMinute(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="text-sm text-gray-400 ml-2">
        {is24Hour ? '24h' : '12h'}
      </div>
    </div>
  );
};