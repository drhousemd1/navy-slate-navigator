
import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "../ui/textarea";
import TextFormatToolbar from '../encyclopedia/formatting/TextFormatToolbar';

interface EditableGuideProps {
  initialContent: string;
}

const EditableGuide: React.FC<EditableGuideProps> = ({ initialContent }) => {
  const [content, setContent] = useState(initialContent);
  const editorRef = useRef<HTMLDivElement>(null);
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const [currentFormatting, setCurrentFormatting] = useState({
    isBold: false,
    isUnderlined: false,
    isItalic: false,
    fontSize: '1rem',
    alignment: 'left' as 'left' | 'center' | 'right'
  });
  const [selectedTextRange, setSelectedTextRange] = useState<{ start: number; end: number } | null>(null);

  // Listen for selection changes in the editor
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      if (!editorRef.current?.contains(range.commonAncestorContainer)) {
        return;
      }
      
      if (!selection.isCollapsed) {
        setSelectedTextRange({
          start: range.startOffset,
          end: range.endOffset
        });
        
        // Update formatting state based on current selection
        setCurrentFormatting({
          isBold: document.queryCommandState('bold'),
          isUnderlined: document.queryCommandState('underline'),
          isItalic: document.queryCommandState('italic'),
          fontSize: getFontSize(),
          alignment: getTextAlignment()
        });
      } else {
        setSelectedTextRange(null);
      }
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const getFontSize = () => {
    // Get font size of current selection - this is a simplified version
    // In a real implementation, we would need more sophisticated detection
    return currentFormatting.fontSize;
  };

  const getTextAlignment = () => {
    // Get alignment of current selection - this is a simplified version
    // In a real implementation, we would need more sophisticated detection
    if (document.queryCommandState('justifyCenter')) return 'center';
    if (document.queryCommandState('justifyRight')) return 'right';
    return 'left';
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand('styleWithCSS', false, "true");
    if (value) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
    
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
    setForceUpdateKey(prev => prev + 1);
  };
  
  const applyFontSize = (size: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!range.commonAncestorContainer.parentElement?.closest('[contenteditable="true"]')) {
      return;
    }
    
    document.execCommand('styleWithCSS', false, "true");
    
    try {
      document.execCommand("fontSize", false, "1");
      const fontElements = editorRef.current?.querySelectorAll("font[size='1']");
      fontElements?.forEach(el => {
        const parent = el.parentNode;
        const spanStyled = document.createElement('span');
        spanStyled.style.fontSize = size;
        spanStyled.innerHTML = el.innerHTML;
        parent?.replaceChild(spanStyled, el);
      });

      setCurrentFormatting(prev => ({ ...prev, fontSize: size }));
    } catch (e) {
      console.error("Error applying font size:", e);
    }

    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
    setForceUpdateKey(prev => prev + 1);
  };

  const handleToggleBold = () => {
    applyFormat('bold');
    setCurrentFormatting(prev => ({ ...prev, isBold: !prev.isBold }));
  };
  
  const handleToggleUnderline = () => {
    applyFormat('underline');
    setCurrentFormatting(prev => ({ ...prev, isUnderlined: !prev.isUnderlined }));
  };
  
  const handleToggleItalic = () => {
    applyFormat('italic');
    setCurrentFormatting(prev => ({ ...prev, isItalic: !prev.isItalic }));
  };
  
  const handleFontSizeChange = (value: string) => {
    applyFontSize(value);
  };
  
  const handleAlignText = (alignment: 'left' | 'center' | 'right') => {
    switch(alignment) {
      case 'left':
        applyFormat('justifyLeft');
        break;
      case 'center':
        applyFormat('justifyCenter');
        break;
      case 'right':
        applyFormat('justifyRight');
        break;
    }
    setCurrentFormatting(prev => ({ ...prev, alignment }));
  };
  
  const handleListFormat = (listType: 'ordered' | 'unordered') => {
    if (listType === 'ordered') {
      applyFormat('insertOrderedList');
    } else {
      applyFormat('insertUnorderedList');
    }
  };
  
  const handleInsertTable = () => {
    // Simple 3x3 table insertion
    const tableHTML = `
      <table style="width:100%; border-collapse: collapse;">
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 1</td>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 2</td>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 3</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 4</td>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 5</td>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 6</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 7</td>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 8</td>
          <td style="border: 1px solid #ccc; padding: 8px;">Cell 9</td>
        </tr>
      </table><br>
    `;
    
    document.execCommand('insertHTML', false, tableHTML);
    
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
    setForceUpdateKey(prev => prev + 1);
  };

  const handleContentChange = (htmlContent: string) => {
    setContent(htmlContent);
  };

  return (
    <div className="mt-6">
      <TextFormatToolbar
        onToggleBold={handleToggleBold}
        onToggleUnderline={handleToggleUnderline}
        onToggleItalic={handleToggleItalic}
        onFontSizeChange={handleFontSizeChange}
        onAlignText={handleAlignText}
        onListFormat={handleListFormat}
        onInsertTable={handleInsertTable}
        selectedTextRange={selectedTextRange}
        currentFormatting={currentFormatting}
      />
      <Textarea
        key={forceUpdateKey}
        value={content}
        onChange={(e) => handleContentChange((e.target as any).value)}
        formattedPreview={true}
        className="min-h-[500px] bg-white border-gray-300 text-black"
        editorRef={editorRef}
      />
    </div>
  );
};

export default EditableGuide;
