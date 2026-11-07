import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import EncyclopediaText from './EncyclopediaText';
import ArticleContent from './ArticleContent';
import { entryDocument, safeLegacyImage } from '@/data/encyclopedia/content';
import type { EncyclopediaEntry } from '@/types/encyclopedia';

export default function EncyclopediaPopupView({ entry, isOpen, onClose }: { entry: EncyclopediaEntry; isOpen: boolean; onClose: () => void }) {
  const image = safeLegacyImage(entry.image_url);
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent aria-describedby={undefined} className="bg-navy border border-light-navy text-foreground p-0 max-w-full w-full h-full max-h-full flex flex-col m-0 rounded-none fixed inset-0" style={{ transform: 'none' }} hideCloseButton>
      {image && <div className="absolute inset-0 z-0" aria-hidden="true" style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover',
        backgroundPosition: `${entry.focal_point_x ?? 50}% ${entry.focal_point_y ?? 50}%`, opacity: (entry.popup_opacity ?? entry.opacity ?? 100) / 100 }} />}
      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden p-6">
        <Button onClick={onClose} className="absolute right-4 top-4 z-20 bg-red-600 hover:bg-red-700 text-white" aria-label="Close encyclopedia entry">Close</Button>
        <DialogTitle asChild><h1 className="text-3xl md:text-4xl font-bold mb-6 pt-10">
          <EncyclopediaText text={entry.title} highlight={entry.highlight_effect ?? false} color={entry.title_color} hasImage={Boolean(image)} surface="popup" />
        </h1></DialogTitle>
        <div className="flex-1 overflow-y-auto pb-6"><div className="prose prose-invert max-w-none"><ArticleContent document={entryDocument(entry)} /></div></div>
      </div>
    </DialogContent>
  </Dialog>;
}
