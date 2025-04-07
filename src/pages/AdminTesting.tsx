
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Pencil } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

interface AdminCardData {
  id: string;
  title: string;
  description: string;
  background_images: string[];
  focal_point_x?: number;
  focal_point_y?: number;
  background_opacity?: number;
}

const AdminTesting = () => {
  const [cards, setCards] = useState<AdminCardData[]>([]);
  const [editingCard, setEditingCard] = useState<AdminCardData | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselTimer, setCarouselTimer] = useState(3); // seconds
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('adminTestingCards');
    if (saved) {
      try {
        const parsedCards = JSON.parse(saved);
        setCards(parsedCards);
      } catch (error) {
        console.error("Error loading cards from localStorage:", error);
        // Initialize with sample card if parsing fails
        createSampleCard();
      }
    } else {
      // Add a sample card if none exist
      createSampleCard();
    }
  }, []);

  const createSampleCard = () => {
    const sampleCard: AdminCardData = {
      id: `card-${Date.now()}`,
      title: 'Sample Card',
      description: 'This is a sample card. Click Edit to customize it.',
      background_images: ['', '', '', '', ''],
      focal_point_x: 50,
      focal_point_y: 50,
      background_opacity: 0.8
    };
    
    setCards([sampleCard]);
  };

  useEffect(() => {
    localStorage.setItem('adminTestingCards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((i) => i + 1);
    }, carouselTimer * 1000);
    return () => clearInterval(interval);
  }, [carouselTimer]);

  const updateCard = (updated: AdminCardData) => {
    setCards((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const deleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const addNewCard = () => {
    const newCard: AdminCardData = {
      id: `card-${Date.now()}`,
      title: 'New Card',
      description: 'Add your description here',
      background_images: ['', '', '', '', ''],
      focal_point_x: 50,
      focal_point_y: 50,
      background_opacity: 0.8
    };
    
    setCards((prev) => [...prev, newCard]);
    setEditingCard(newCard);
    setActiveSlot(0);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    card: AdminCardData
  ) => {
    const file = e.target.files?.[0];
    if (!file || activeSlot === null) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImages = [...card.background_images];
      newImages[activeSlot] = reader.result as string;
      updateCard({ ...card, background_images: newImages });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (card: AdminCardData, slot: number) => {
    const newImages = [...card.background_images];
    newImages[slot] = '';
    updateCard({ ...card, background_images: newImages });
  };

  const getVisibleImage = (card: AdminCardData) => {
    const filled = card.background_images.filter(Boolean);
    if (filled.length === 0) return null;
    const idx = carouselIndex % filled.length;
    return filled[idx];
  };

  const handleTitleChange = (value: string) => {
    if (editingCard) {
      updateCard({ ...editingCard, title: value });
    }
  };

  const handleDescriptionChange = (value: string) => {
    if (editingCard) {
      updateCard({ ...editingCard, description: value });
    }
  };

  const handleOpacityChange = (value: string) => {
    if (editingCard) {
      const opacity = parseFloat(value);
      if (!isNaN(opacity) && opacity >= 0 && opacity <= 1) {
        updateCard({ ...editingCard, background_opacity: opacity });
      }
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-2xl font-bold">Admin Testing Page</h1>
          <div className="flex items-center space-x-2">
            <span className="text-white">Carousel Timer</span>
            <Button
              onClick={() => setCarouselTimer((t) => Math.max(t - 1, 1))}
              className="bg-slate-700 px-2"
            >
              -
            </Button>
            <span className="text-white">{carouselTimer}s</span>
            <Button
              onClick={() => setCarouselTimer((t) => t + 1)}
              className="bg-slate-700 px-2"
            >
              +
            </Button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={addNewCard} className="bg-green-600 hover:bg-green-700">
            Add New Card
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => {
            const currentImage = getVisibleImage(card);
            return (
              <div
                key={card.id}
                className="relative bg-navy border border-light-navy rounded-lg overflow-hidden shadow"
              >
                <div
                  className="h-40 bg-cover bg-center transition-opacity duration-1000"
                  style={{
                    backgroundImage: currentImage ? `url(${currentImage})` : 'none',
                    opacity: currentImage ? card.background_opacity ?? 0.8 : 0.3,
                    backgroundPosition: `${card.focal_point_x ?? 50}% ${card.focal_point_y ?? 50}%`,
                  }}
                >
                  {!currentImage && (
                    <div className="flex h-full items-center justify-center text-white opacity-50">
                      No Image
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h2 className="text-white text-lg font-bold">{card.title}</h2>
                  <p className="text-white text-sm">{card.description}</p>
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCard(card);
                        setActiveSlot(0);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCard(card.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
          <DialogContent className="bg-navy border border-light-navy text-white max-w-2xl">
            {editingCard && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Edit Card</h2>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input 
                    value={editingCard.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="bg-dark-navy border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    value={editingCard.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    className="bg-dark-navy border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Background Opacity ({editingCard.background_opacity ?? 0.8})</label>
                  <Input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={editingCard.background_opacity ?? 0.8}
                    onChange={(e) => handleOpacityChange(e.target.value)}
                    className="bg-dark-navy border-slate-600"
                  />
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => {
                      const thumb = editingCard.background_images[i];
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            setActiveSlot(i);
                          }}
                          className={`h-16 w-full border-2 ${
                            activeSlot === i
                              ? 'border-yellow-300 shadow-[0_0_8px_2px_rgba(254,247,205,0.6)]'
                              : 'border-slate-600'
                          } bg-slate-800 flex items-center justify-center cursor-pointer`}
                        >
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs text-white opacity-40">Empty</span>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div
                  className="h-40 bg-dark-navy flex items-center justify-center border border-slate-600 cursor-pointer"
                  onClick={() => {
                    if (activeSlot !== null) {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) =>
                        handleImageUpload(
                          e as unknown as React.ChangeEvent<HTMLInputElement>,
                          editingCard
                        );
                      input.click();
                    }
                  }}
                >
                  {activeSlot === null ||
                  !editingCard.background_images[activeSlot] ? (
                    <span className="text-white opacity-50">Click to upload image</span>
                  ) : (
                    <img
                      src={editingCard.background_images[activeSlot]}
                      className="h-full object-contain"
                      alt="Selected image"
                    />
                  )}
                </div>

                {activeSlot !== null &&
                  editingCard.background_images[activeSlot] && (
                    <Button
                      variant="destructive"
                      onClick={() =>
                        handleRemoveImage(editingCard, activeSlot)
                      }
                    >
                      Remove Image
                    </Button>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminTesting;
