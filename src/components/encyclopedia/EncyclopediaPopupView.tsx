
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HighlightedText from '../task/HighlightedText';
import { ScrollArea } from "@/components/ui/scroll-area";

interface EncyclopediaPopupViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  imageUrl?: string | null;
  focalPointX?: number;
  focalPointY?: number;
  opacity?: number;
  titleColor?: string;
  highlightEffect?: boolean;
  textFormatting?: {
    isBold?: boolean;
    isUnderlined?: boolean;
    fontSize?: string;
  };
  onFormatSelection?: (selection: { start: number; end: number }) => void;
  formattedSections?: Array<{
    start: number;
    end: number;
    formatting: {
      isBold?: boolean;
      isUnderlined?: boolean;
      fontSize?: string;
    }
  }>;
}

const EncyclopediaPopupView: React.FC<EncyclopediaPopupViewProps> = ({
  isOpen,
  onClose,
  title,
  content,
  imageUrl,
  focalPointX = 50,
  focalPointY = 50,
  opacity = 100,
  titleColor = '#FFFFFF',
  highlightEffect = false,
  textFormatting = {},
  onFormatSelection,
  formattedSections = []
}) => {
  const backgroundStyle = imageUrl ? {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: `${focalPointX}% ${focalPointY}%`,
    opacity: opacity / 100
  } : undefined;

  // Create text style based on formatting options (used as default)
  const textStyle: React.CSSProperties = {
    fontWeight: textFormatting?.isBold ? 'bold' : 'normal',
    textDecoration: textFormatting?.isUnderlined ? 'underline' : 'none',
    fontSize: textFormatting?.fontSize || 'inherit'
  };

  // Render content with formatted sections
  const renderFormattedContent = () => {
    if (!content) return null;
    
    // Split content by paragraphs
    const paragraphs = content.split('\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      if (!paragraph.trim()) {
        return <br key={`p-${pIndex}`} />;
      }
      
      // If no formatted sections, render paragraph with default style
      if (!formattedSections || formattedSections.length === 0) {
        return (
          <p key={`p-${pIndex}`} className="text-lg mb-4 text-white" style={textStyle}>
            {paragraph}
          </p>
        );
      }
      
      // Find formatted sections that apply to this paragraph
      let charOffset = 0;
      paragraphs.forEach((p, i) => {
        if (i < pIndex) {
          charOffset += p.length + 1; // +1 for the newline
        }
      });
      
      const paragraphLength = paragraph.length;
      const paragraphEnd = charOffset + paragraphLength;
      
      const relevantSections = formattedSections.filter(section => 
        section.start < paragraphEnd && section.end > charOffset
      );
      
      // If no formatted sections in this paragraph
      if (relevantSections.length === 0) {
        return (
          <p key={`p-${pIndex}`} className="text-lg mb-4 text-white" style={textStyle}>
            {paragraph}
          </p>
        );
      }
      
      // Build segments with formatting
      const segments: JSX.Element[] = [];
      let lastIndex = 0;
      
      // Sort sections by start position
      const sortedSections = [...relevantSections].sort((a, b) => 
        (a.start - charOffset) - (b.start - charOffset)
      );
      
      sortedSections.forEach((section, i) => {
        const sectionStart = Math.max(0, section.start - charOffset);
        const sectionEnd = Math.min(paragraphLength, section.end - charOffset);
        
        if (sectionStart <= paragraphLength && sectionEnd >= 0) {
          // Add unformatted text before this section
          if (sectionStart > lastIndex) {
            segments.push(
              <span key={`regular-${i}`}>
                {paragraph.substring(lastIndex, sectionStart)}
              </span>
            );
          }
          
          // Add formatted section
          const sectionText = paragraph.substring(
            Math.max(0, sectionStart),
            Math.min(paragraphLength, sectionEnd)
          );
          
          if (sectionText) {
            segments.push(
              <span 
                key={`formatted-${i}`}
                style={{
                  fontWeight: section.formatting.isBold ? 'bold' : 'inherit',
                  textDecoration: section.formatting.isUnderlined ? 'underline' : 'inherit',
                  fontSize: section.formatting.fontSize || 'inherit'
                }}
              >
                {sectionText}
              </span>
            );
          }
          
          lastIndex = Math.max(lastIndex, sectionEnd);
        }
      });
      
      // Add remaining text
      if (lastIndex < paragraphLength) {
        segments.push(
          <span key="remaining">
            {paragraph.substring(lastIndex)}
          </span>
        );
      }
      
      // Return the paragraph with all segments
      return (
        <p key={`p-${pIndex}`} className="text-lg mb-4 text-white" style={textStyle}>
          {segments}
        </p>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border border-light-navy text-white p-0 max-w-full w-full h-full max-h-full flex flex-col inset-0 m-0 rounded-none absolute"
        style={{ transform: 'none', top: 0, left: 0, bottom: 0, right: 0 }}
        hideCloseButton={true}
      >
        {imageUrl && (
          <div 
            className="absolute inset-0 z-0" 
            style={backgroundStyle}
            aria-hidden="true"
          />
        )}
        <div className="relative z-10 flex flex-col h-full p-6">
          <Button 
            onClick={onClose}
            className="absolute right-4 top-4 z-20 bg-red-600 hover:bg-red-700 text-white"
            aria-label="Close encyclopedia entry"
          >
            Close
          </Button>
          
          <div className="flex flex-col h-full pt-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              <HighlightedText 
                text={title}
                highlight={highlightEffect}
                color={titleColor}
              />
            </h1>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="max-w-3xl mx-auto w-full">
                <div className="prose prose-invert max-w-none">
                  {renderFormattedContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EncyclopediaPopupView;
