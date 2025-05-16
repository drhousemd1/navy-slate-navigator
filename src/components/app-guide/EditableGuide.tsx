
import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "../ui/textarea";
import TextFormatToolbar from '../encyclopedia/formatting/TextFormatToolbar';

interface EditableGuideProps {
  initialContent: string;
}

const EditableGuide: React.FC<EditableGuideProps> = ({ initialContent }) => {
  const [content, setContent] = useState(initialContent);
  const editorRef = useRef<HTMLDivElement>(null); // Ref for the contentEditable div inside Textarea

  // This state helps re-sync the textarea when execCommand is used,
  // as execCommand modifies the DOM directly and React might not pick it up.
  const [forceUpdateKey, setForceUpdateKey] = useState(0); 

  useEffect(() => {
    // Ensure editorRef is correctly passed to the Textarea or its inner div
    // For now, we assume Textarea will forward a ref or we operate on document selection
  }, []);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand('styleWithCSS', false, "true"); // Ensure styles are applied with CSS
    if (value) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
    // After execCommand, the DOM is changed. We need to read this new HTML
    // and update React's state to ensure consistency.
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
    setForceUpdateKey(prev => prev + 1); // Force re-render of Textarea
  };
  
  const applyFontSize = (size: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!range.commonAncestorContainer.parentElement?.closest('[contenteditable="true"]')) {
      // Ensure the selection is within our editor
      return;
    }
    
    document.execCommand('styleWithCSS', false, "true");
    // For elements that execCommand might create like <font>, it's better to wrap with span.
    // A more robust way is to get the selection and wrap it with a span.
    const span = document.createElement('span');
    span.style.fontSize = size;

    // If the selection is collapsed (just a cursor), wrap future typing.
    // This is complex. For now, only apply to actual selections.
    if (range.collapsed) {
        // We could insert a span and place the cursor inside, but that's more involved.
        // For now, execCommand('fontSize', false, '1-7') is an option but mapping is needed.
        // Let's try wrapping the selection:
        // This is disabled for now as it's more complex for collapsed selections.
        return; 
    }
    
    try {
      // Surround contents of the range with the new span
      // This can be tricky and might break existing structure if not careful.
      // A simpler `execCommand('fontSize', false, mappedValue)` might be safer if we map sizes.
      // For now, let's use a more direct approach for selected text:
      document.execCommand("fontSize", false, "1"); // placeholder, then apply style
      const fontElements = editorRef.current?.querySelectorAll("font[size='1']");
      fontElements?.forEach(el => {
        const parent = el.parentNode;
        const spanStyled = document.createElement('span');
        spanStyled.style.fontSize = size;
        spanStyled.innerHTML = el.innerHTML;
        parent?.replaceChild(spanStyled, el);
      });

    } catch (e) {
      console.error("Error applying font size:", e);
      // Fallback or simpler execCommand if complex DOM manipulation fails
      // e.g. map '1rem' to '3', '1.25rem' to '4' etc. for execCommand('fontSize', false, mappedValue)
      // For now, this will use the above try block.
    }


    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
    setForceUpdateKey(prev => prev + 1);
  };

  const handleToggleBold = () => applyFormat('bold');
  const handleToggleUnderline = () => applyFormat('underline');
  const handleFontSizeChange = (value: string) => applyFontSize(value);

  const handleContentChange = (htmlContent: string) => {
    setContent(htmlContent);
  };

  return (
    <div className="mt-6">
      <TextFormatToolbar
        // selectedTextRange is no longer used by EditableGuide directly
        // currentFormatting is also handled by execCommand implicitly
        onToggleBold={handleToggleBold}
        onToggleUnderline={handleToggleUnderline}
        onFontSizeChange={handleFontSizeChange}
        // Pass dummy/empty objects for props that TextFormatToolbar expects but we don't actively manage here
        selectedTextRange={null} 
        currentFormatting={{}}
      />
      <Textarea
        // Pass the ref to the underlying contentEditable div if Textarea supports it
        // For now, we use editorRef.current obtained from Textarea's own ref.
        // This key forces Textarea to re-render with new innerHTML after execCommand
        key={forceUpdateKey} 
        value={content}
        onChange={(e) => handleContentChange((e.target as any).value)} // Textarea will provide HTML string
        formattedPreview={true}
        className="min-h-[500px] bg-dark-navy text-white"
        // The editorRef for the contentEditable div needs to be captured from Textarea
        // We'll modify Textarea to accept a ref for its inner contentEditable div
        // And also to call onChange with innerHTML.
        // For now, let Textarea populate its own ref and we use it.
        // We'll make Textarea provide the ref to its inner div.
        // This component will pass a ref to Textarea which then assigns it to its contentEditable div
        editorRef={editorRef} 
      />
    </div>
  );
};

export default EditableGuide;
