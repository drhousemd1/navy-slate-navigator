import React, { useState, useRef } from 'react';

interface BackgroundImage {
  url: string;
  focalPoint: { x: number; y: number };
}

interface PunishmentBackgroundSectionProps {
  initialImages?: Array<string | BackgroundImage>;
  initialCarouselTimer?: number;
  initialOpacity?: number;
}

const PunishmentBackgroundSection: React.FC<PunishmentBackgroundSectionProps> = ({
  initialImages,
  initialCarouselTimer,
  initialOpacity,
}) => {
  const defaultFocal = { x: 50, y: 50 };
  // Prepare initial image slots with default focal points
  let initialImageSlots: BackgroundImage[] = [];
  if (initialImages && initialImages.length > 0) {
    initialImageSlots = initialImages.map((img) => {
      if (typeof img === 'string') {
        return { url: img, focalPoint: defaultFocal };
      } else {
        return { url: img.url, focalPoint: img.focalPoint || defaultFocal };
      }
    });
  }

  const [imageSlots, setImageSlots] = useState<BackgroundImage[]>(initialImageSlots);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(0);
  const [carouselTimer, setCarouselTimer] = useState<number>(
    initialCarouselTimer !== undefined ? initialCarouselTimer : 5
  );
  const [opacity, setOpacity] = useState<number>(
    initialOpacity !== undefined ? initialOpacity : 100
  );

  // Safely get the currently selected image (if it exists)
  const currentImage = imageSlots[selectedBoxIndex] ? imageSlots[selectedBoxIndex] : undefined;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const newImageUrl = URL.createObjectURL(file);
    const newImage: BackgroundImage = {
      url: newImageUrl,
      focalPoint: { ...defaultFocal },
    };
    setImageSlots((prev) => [...prev, newImage]);
    setSelectedBoxIndex(imageSlots.length); // select the newly added image
    // Note: In a real app, you might upload the file here and use the returned URL.
  };

  const handleThumbnailClick = (index: number) => {
    setSelectedBoxIndex(index);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!currentImage) return;
    // Calculate focal point percentages based on click position
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;
    // Update the focal point of the current image
    setImageSlots((prev) =>
      prev.map((img, idx) =>
        idx === selectedBoxIndex ? { ...img, focalPoint: { x: xPercent, y: yPercent } } : img
      )
    );
  };

  return (
    <div className="punishment-background-section">
      {/* Thumbnail Selection */}
      <div className="thumbnail-list">
        {imageSlots.map((img, index) => (
          <div
            key={index}
            className={`thumbnail-item ${index === selectedBoxIndex ? 'selected' : ''}`}
            onClick={() => handleThumbnailClick(index)}
          >
            {img.url ? (
              <img src={img.url} alt={`Background ${index + 1}`} />
            ) : (
              <div className="thumbnail-placeholder">+</div>
            )}
          </div>
        ))}
        {/* Add New Image Thumbnail */}
        <div className="thumbnail-item add" onClick={handleAddImage}>
          <div className="thumbnail-placeholder">+</div>
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Current Image Preview & Focal Point Selection */}
      <div className="image-preview">
        {currentImage ? (
          <div className="image-container" style={{ position: 'relative' }}>
            <img
              src={currentImage.url}
              alt="Selected background"
              style={{ width: '100%', display: 'block', opacity: opacity / 100 }}
              onClick={handleImageClick}
            />
            {/* Focal Point Indicator */}
            <div
              className="focal-point-indicator"
              style={{
                position: 'absolute',
                top: `${currentImage.focalPoint.y}%`,
                left: `${currentImage.focalPoint.x}%`,
                transform: 'translate(-50%, -50%)`,
              }}
            />
          </div>
        ) : (
          <div className="no-image">No image selected</div>
        )}
      </div>

      {/* Carousel Timer & Opacity Controls */}
      <div className="controls">
        <div className="carousel-timer-control">
          <label>Carousel Timer (seconds): </label>
          <input
            type="number"
            min={1}
            value={carouselTimer}
            onChange={(e) => setCarouselTimer(Number(e.target.value))}
          />
        </div>
        <div className="opacity-control">
          <label>Opacity: </label>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export default PunishmentBackgroundSection;