import React from 'react';
import { FormLabel, FormControl, FormDescription, FormItem } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface ImageSelectionSectionProps {
  imagePreview: string | null;
  imageSlots: (string | null)[];
  selectedBoxIndex: number | null;
  carouselTimer: number;
  onCarouselTimerChange: (timer: number) => void;
  onSelectImageSlot: (index: number | null) => void;
  onRemoveImage: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setValue: any;
  position: { x: number; y: number };
  control: any;
}

const ImageSelectionSection: React.FC<ImageSelectionSectionProps> = ({
  imagePreview,
  imageSlots,
  selectedBoxIndex,
  carouselTimer,
  onCarouselTimerChange,
  onSelectImageSlot,
  onRemoveImage,
  onImageUpload,
  setValue,
  position,
  control
}) => {
  return (
    <div className="space-y-4">
      <FormLabel className="text-white text-lg">Background Image</FormLabel>
      <div className="flex flex-row items-end space-x-6 mb-4">
        <div className="flex space-x-2">
          {imageSlots.map((imageUrl, index) => (
            <div
              key={index}
              onClick={() => {
                onSelectImageSlot(index);
              }}
              className={`w-12 h-12 rounded-md cursor-pointer transition-all
                ${selectedBoxIndex === index
                  ? 'border-[2px] border-[#FEF7CD] shadow-[0_0_8px_2px_rgba(254,247,205,0.6)]'
                  : 'bg-dark-navy border border-light-navy hover:border-white'}
              `}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover rounded-md"
                  style={{
                    transition: 'opacity 2s ease-in-out'
                  }}
                  onError={(e) => {
                    console.error(`Error loading image in slot ${index}`);
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDMTcuNTIyOCAyMiAyMiAxNy41MjI4IDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyOCAyIDIgNi40NzcxNSAyIDEyQzIgMTcuNTIyOCA2LjQ3NzE1IDIyIDEyIDIyWiIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE1IDlMOSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTkgOUwxNSAxNSIgc3Ryb2tlPSIjRjg3MTcxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+';
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start space-y-1">
          <span className="text-sm text-white font-medium leading-tight">
            Carousel Timer
          </span>
          <span className="text-xs text-slate-400">
            (Settings will be applied to all cards)
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onCarouselTimerChange(Math.max(1, carouselTimer - 1))}
              className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy"
            >
              –
            </button>

            <div className="w-10 text-center text-white">{carouselTimer}</div>

            <button
              type="button"
              onClick={() => onCarouselTimerChange(carouselTimer + 1)}
              className="px-3 py-1 bg-light-navy text-white hover:bg-navy border border-light-navy"
            >
              +
            </button>

            <span className="text-sm text-slate-400">(s)</span>
          </div>
        </div>
      </div>

      <div className="border-2 border-dashed border-light-navy rounded-lg p-4 text-center">
        {imagePreview ? (
          <div className="relative">
            <div
              style={{
                backgroundImage: `url(${imagePreview})`,
                backgroundSize: 'cover',
                backgroundPosition: `${position.x}% ${position.y}%`,
                transition: 'opacity 2s ease-in-out',
                width: '100%',
                height: '150px',
              }}
            />
            <div className="absolute inset-0 bg-black/20 rounded-md flex items-center justify-center">
              <button
                type="button"
                onClick={onRemoveImage}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove Image
              </button>
            </div>
          </div>
        ) : (
          <>
            <label
              htmlFor="image-upload"
              className="cursor-pointer text-blue-500 hover:text-blue-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 mx-auto"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.141-8.429m16.632 0a4.5 4.5 0 01-1.141 8.429"
                />
              </svg>
              Upload Image
            </label>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              className="hidden"
              onChange={onImageUpload}
            />
          </>
        )}
      </div>

      <div className="space-y-2">
        <FormLabel className="text-white">Focal Point</FormLabel>
        <FormDescription className="text-gray-400">
          Adjust the focal point to control the image positioning.
        </FormDescription>
        <FormItem>
          <FormLabel className="text-white">Horizontal Position (X)</FormLabel>
          <FormControl>
            <input
              type="range"
              min="0"
              max="100"
              value={position.x}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                setValue('focal_point_x', newValue);
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </FormControl>
          <Input
            type="number"
            value={position.x}
            onChange={(e) => {
              const newValue = parseInt(e.target.value);
              setValue('focal_point_x', newValue);
            }}
            className="bg-dark-navy border-light-navy text-white w-24 mt-2"
          />
        </FormItem>
        <FormItem>
          <FormLabel className="text-white">Vertical Position (Y)</FormLabel>
          <FormControl>
            <input
              type="range"
              min="0"
              max="100"
              value={position.y}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                setValue('focal_point_y', newValue);
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </FormControl>
          <Input
            type="number"
            value={position.y}
            onChange={(e) => {
              const newValue = parseInt(e.target.value);
              setValue('focal_point_y', newValue);
            }}
            className="bg-dark-navy border-light-navy text-white w-24 mt-2"
          />
        </FormItem>
      </div>
    </div>
  );
};

export default ImageSelectionSection;
