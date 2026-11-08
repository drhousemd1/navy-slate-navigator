import React, { useState } from 'react';
import EncyclopediaText from './EncyclopediaText';
import EncyclopediaPopupView from './EncyclopediaPopupView';
import type { EncyclopediaEntry } from '@/types/encyclopedia';
import { safeLegacyImage } from '@/data/encyclopedia/content';

export default function EncyclopediaTile({ entry }: { entry: EncyclopediaEntry }) {
  const [isOpen, setOpen] = useState(false);
  const image = safeLegacyImage(entry.image_url);
  return <>
    <button type="button" className="relative block w-full text-left overflow-hidden rounded-lg border border-light-navy h-48 bg-navy focus-visible:ring-2 focus-visible:ring-nav-active" onClick={() => setOpen(true)}>
      {image && <div className="absolute inset-0 z-0" aria-hidden="true" style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover',
        backgroundPosition: `${entry.focal_point_x ?? 50}% ${entry.focal_point_y ?? 50}%`, opacity: (entry.opacity ?? 100) / 100 }} />}
      <div className="absolute inset-0 z-10 flex flex-col p-4 bg-gradient-to-t from-dark-navy/90 to-transparent">
        <div className="flex justify-between items-start"><h3 className="text-lg font-semibold mb-1">
          <EncyclopediaText text={entry.title} highlight={entry.highlight_effect ?? false} color={entry.title_color} hasImage={Boolean(image)} surface="tile" />
        </h3></div>
        <p className="text-sm"><EncyclopediaText text={entry.subtext} highlight={entry.highlight_effect ?? false} color={entry.subtext_color ?? '#D1D5DB'} hasImage={Boolean(image)} surface="tile" /></p>
      </div>
    </button>
    {isOpen && <EncyclopediaPopupView entry={entry} isOpen={isOpen} onClose={() => setOpen(false)} />}
  </>;
}
