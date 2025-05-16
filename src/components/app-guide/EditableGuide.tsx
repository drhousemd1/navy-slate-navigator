
import React, { useState } from 'react';
import { Textarea } from "../ui/textarea";
import TextFormatToolbar from '../encyclopedia/formatting/TextFormatToolbar';

interface EditableGuideProps {
  initialContent: string;
}

const EditableGuide: React.FC<EditableGuideProps> = ({ initialContent }) => {
  const [content, setContent] = useState(initialContent);
  const [selectedTextRange, setSelectedTextRange] = useState<{start: number; end: number} | null>(null);
  const [formattedSections, setFormattedSections] = useState<
    Array<{
      start: number;
      end: number;
      formatting: {
        isBold?: boolean;
        isUnderlined?: boolean;
        fontSize?: string;
      }
    }>
  >([]);

  const [currentFormatting, setCurrentFormatting] = useState({
    isBold: false,
    isUnderlined: false,
    fontSize: '1rem'
  });

  const handleToggleBold = () => {
    if (selectedTextRange) {
      const newSection = {
        start: selectedTextRange.start,
        end: selectedTextRange.end,
        formatting: { isBold: true }
      };
      
      setFormattedSections([...formattedSections, newSection]);
    } else {
      setCurrentFormatting({...currentFormatting, isBold: !currentFormatting.isBold});
    }
  };

  const handleToggleUnderline = () => {
    if (selectedTextRange) {
      const newSection = {
        start: selectedTextRange.start,
        end: selectedTextRange.end,
        formatting: { isUnderlined: true }
      };
      
      setFormattedSections([...formattedSections, newSection]);
    } else {
      setCurrentFormatting({...currentFormatting, isUnderlined: !currentFormatting.isUnderlined});
    }
  };

  const handleFontSizeChange = (value: string) => {
    if (selectedTextRange) {
      const newSection = {
        start: selectedTextRange.start,
        end: selectedTextRange.end,
        formatting: { fontSize: value }
      };
      
      setFormattedSections([...formattedSections, newSection]);
    } else {
      setCurrentFormatting({...currentFormatting, fontSize: value});
    }
  };

  const handleFormatSelection = (selection: {start: number; end: number}) => {
    setSelectedTextRange(selection);
  };

  return (
    <div className="mt-6">
      <TextFormatToolbar 
        selectedTextRange={selectedTextRange}
        currentFormatting={currentFormatting}
        onToggleBold={handleToggleBold}
        onToggleUnderline={handleToggleUnderline}
        onFontSizeChange={handleFontSizeChange}
      />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        formattedPreview={true}
        className="min-h-[500px] bg-dark-navy"
        textFormatting={currentFormatting}
        onFormatSelection={handleFormatSelection}
        formattedSections={formattedSections}
      />
    </div>
  );
};

export default EditableGuide;
