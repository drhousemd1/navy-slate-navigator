
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

  // Function to render text with formatting applied to specific sections
  const renderFormattedContent = () => {
    if (!formattedSections || formattedSections.length === 0) {
      // If no formatted sections, render paragraphs with default formatting
      return content.split('\n').map((paragraph, index) => (
        paragraph.trim() ? (
          <p 
            key={index} 
            className="text-lg mb-4 text-white"
            style={textStyle}
          >
            {paragraph}
          </p>
        ) : <br key={index} />
      ));
    }

    // Split content by paragraphs to maintain paragraph structure
    const paragraphs = content.split('\n');
    
    return paragraphs.map((paragraph, paragraphIndex) => {
      if (!paragraph.trim()) return <br key={paragraphIndex} />;
      
      // Calculate the character offset for this paragraph
      const paragraphOffset = content.indexOf(paragraph);
      const paragraphEndOffset = paragraphOffset + paragraph.length;
      
      // Find sections that overlap with this paragraph
      const relevantSections = formattedSections.filter(section => 
        !(section.end <= paragraphOffset || section.start >= paragraphEndOffset)
      );
      
      if (relevantSections.length === 0) {
        // No formatting in this paragraph
        return (
          <p 
            key={paragraphIndex} 
            className="text-lg mb-4 text-white"
            style={textStyle}
          >
            {paragraph}
          </p>
        );
      }
      
      // Sort sections by start position
      const sortedSections = [...relevantSections].sort((a, b) => 
        (a.start - paragraphOffset) - (b.start - paragraphOffset)
      );
      
      // Create an array of text segments with their formatting
      const segments: JSX.Element[] = [];
      let lastIndex = 0;
      
      for (const section of sortedSections) {
        // Calculate relative positions within this paragraph
        const relativeStart = Math.max(0, section.start - paragraphOffset);
        const relativeEnd = Math.min(paragraph.length, section.end - paragraphOffset);
        
        if (relativeStart > lastIndex) {
          // Add unformatted text before this section
          segments.push(
            <span key={`${paragraphIndex}-${lastIndex}`}>
              {paragraph.substring(lastIndex, relativeStart)}
            </span>
          );
        }
        
        // Add the formatted section
        const sectionText = paragraph.substring(relativeStart, relativeEnd);
        const { isBold, isUnderlined, fontSize } = section.formatting;
        
        segments.push(
          <span 
            key={`${paragraphIndex}-${relativeStart}`}
            style={{
              fontWeight: isBold ? 'bold' : 'normal',
              textDecoration: isUnderlined ? 'underline' : 'none',
              fontSize: fontSize || 'inherit'
            }}
          >
            {sectionText}
          </span>
        );
        
        lastIndex = relativeEnd;
      }
      
      // Add any remaining text after the last formatted section
      if (lastIndex < paragraph.length) {
        segments.push(
          <span key={`${paragraphIndex}-${lastIndex}`}>
            {paragraph.substring(lastIndex)}
          </span>
        );
      }
      
      return (
        <p 
          key={paragraphIndex} 
          className="text-lg mb-4 text-white"
          style={textStyle}
        >
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
        <div className="relative z-10 flex flex-col h-full p-6 overflow-y-auto">
          <Button 
            onClick={onClose}
            className="absolute right-4 top-4 z-20 bg-red-600 hover:bg-red-700 text-white"
            aria-label="Close encyclopedia entry"
          >
            Close
          </Button>
          
          <div className="max-w-3xl mx-auto w-full pt-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              <HighlightedText 
                text={title}
                highlight={highlightEffect}
                color={titleColor}
              />
            </h1>
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
