
import React from 'react';
import AppLayout from '../components/AppLayout';
import EncyclopediaTile from '../components/encyclopedia/EncyclopediaTile';
import { useEncyclopedia } from '@/hooks/useEncyclopedia';

const Encyclopedia: React.FC = () => {
  const {
    entries,
    isLoading,
    error
  } = useEncyclopedia();

  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="max-w-screen-lg mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-white">Encyclopedia</h1>
          </div>
          
          <div className="bg-navy border border-light-navy rounded-lg p-6 mb-6">
            <p className="text-gray-300">Welcome to the encyclopedia. This is where you'll find information about the system and how it works.</p>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-white">Loading encyclopedia entries...</p>
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 mb-6">
              <p className="text-white">Error loading encyclopedia entries. Please try again later.</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white mb-4">No encyclopedia entries found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map(entry => (
                <EncyclopediaTile 
                  key={entry.id}
                  title={entry.title} 
                  subtext={entry.subtext}
                  popupText={entry.popup_text}
                  imageUrl={entry.image_url}
                  focalPointX={entry.focal_point_x}
                  focalPointY={entry.focal_point_y}
                  opacity={entry.opacity}
                  popupOpacity={entry.popup_opacity}
                  titleColor={entry.title_color}
                  subtextColor={entry.subtext_color}
                  highlightEffect={entry.highlight_effect}
                  popupTextFormatting={entry.popup_text_formatting}
                  formattedSections={entry.formatted_sections}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Encyclopedia;
