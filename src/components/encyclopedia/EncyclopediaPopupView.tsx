
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HighlightedText from '../task/HighlightedText';

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
  formattedSections = []
}) => {
  const backgroundStyle = imageUrl ? {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: `${focalPointX}% ${focalPointY}%`,
    opacity: opacity / 100
  } : undefined;

  // Base text style
  const baseTextStyle: React.CSSProperties = {
    fontWeight: textFormatting?.isBold ? 'bold' : 'normal',
    textDecoration: textFormatting?.isUnderlined ? 'underline' : 'none',
    fontSize: textFormatting?.fontSize || 'inherit'
  };

  // Render content with formatting
  const renderFormattedContent = () => {
    if (!content) return null;
    
    // Split text by paragraphs
    const paragraphs = content.split('\n');
    
    return paragraphs.map((paragraph, pIndex) => {
      if (!paragraph.trim()) {
        return <div key={`p-${pIndex}`} className="h-4"></div>;
      }
      
      // If no formatted sections, render with base style
      if (!formattedSections || formattedSections.length === 0) {
        return (
          <p key={`p-${pIndex}`} className="text-lg mb-4 text-white" style={baseTextStyle}>
            {paragraph}
          </p>
        );
      }
      
      // Calculate character offset for this paragraph
      let charOffset = 0;
      for (let i = 0; i < pIndex; i++) {
        charOffset += paragraphs[i].length + 1; // +1 for newline
      }
      
      // Find formatted sections for this paragraph
      const relevantSections = formattedSections.filter(section => {
        const sectionEnd = section.end;
        const sectionStart = section.start;
        const paragraphStart = charOffset;
        const paragraphEnd = charOffset + paragraph.length;
        
        return sectionStart < paragraphEnd && sectionEnd > paragraphStart;
      });
      
      if (relevantSections.length === 0) {
        return (
          <p key={`p-${pIndex}`} className="text-lg mb-4 text-white" style={baseTextStyle}>
            {paragraph}
          </p>
        );
      }
      
      // Create segments with correct formatting
      const segments: React.ReactNode[] = [];
      let currentPos = 0;
      
      // Sort sections by start position
      const sortedSections = [...relevantSections].sort((a, b) => a.start - b.start);
      
      // Build segments
      sortedSections.forEach((section, i) => {
        const relativeStart = Math.max(0, section.start - charOffset);
        const relativeEnd = Math.min(paragraph.length, section.end - charOffset);
        
        // Add unformatted text before this section
        if (relativeStart > currentPos) {
          segments.push(
            <span key={`text-${i}`}>{paragraph.substring(currentPos, relativeStart)}</span>
          );
        }
        
        // Add formatted section
        if (relativeEnd > relativeStart) {
          segments.push(
            <span 
              key={`fmt-${i}`}
              style={{
                fontWeight: section.formatting.isBold ? 'bold' : 'inherit',
                textDecoration: section.formatting.isUnderlined ? 'underline' : 'inherit',
                fontSize: section.formatting.fontSize || 'inherit'
              }}
            >
              {paragraph.substring(relativeStart, relativeEnd)}
            </span>
          );
        }
        
        currentPos = Math.max(currentPos, relativeEnd);
      });
      
      // Add remaining unformatted text
      if (currentPos < paragraph.length) {
        segments.push(
          <span key="remaining">{paragraph.substring(currentPos)}</span>
        );
      }
      
      return (
        <p key={`p-${pIndex}`} className="text-lg mb-4 text-white" style={baseTextStyle}>
          {segments}
        </p>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-navy border border-light-navy text-white p-0 max-w-full w-full h-full max-h-full flex flex-col m-0 rounded-none fixed inset-0"
        style={{ transform: 'none' }}
        hideCloseButton={true}
      >
        {/* Background image */}
        {imageUrl && (
          <div 
            className="absolute inset-0 z-0" 
            style={backgroundStyle}
            aria-hidden="true"
          />
        )}
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full w-full overflow-hidden p-6">
          {/* Close button */}
          <Button 
            onClick={onClose}
            className="absolute right-4 top-4 z-20 bg-red-600 hover:bg-red-700 text-white"
            aria-label="Close encyclopedia entry"
          >
            Close
          </Button>
          
          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-6 pt-10">
            <HighlightedText 
              text={title}
              highlight={highlightEffect}
              color={titleColor}
            />
          </h1>
          
          {/* Content area */}
          <div className="flex-1 overflow-y-auto pb-6">
            <div className="prose prose-invert max-w-none">
              {renderFormattedContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EncyclopediaPopupView;
