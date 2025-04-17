// 📂 src/pages/AdminTesting.tsx
import React, { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import AdminTestingCard from '@/components/admin-testing/AdminTestingCard'
import ActivityDataReset from '@/components/admin-testing/ActivityDataReset'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Plus, MoveVertical } from 'lucide-react'
import { AdminTestingCardData } from '@/components/admin-testing/defaultAdminTestingCards'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd'

interface SupabaseCardData {
  id: string
  title: string
  description: string | null
  priority: string
  points: number
  order: number
  background_opacity: number
  focal_point_x: number
  focal_point_y: number
  title_color: string
  subtext_color: string
  calendar_color: string
  icon_color: string
  highlight_effect: boolean
  usage_data: number[]
  background_images: string[]
}

const AdminTesting: React.FC = () => {
  const [cards, setCards] = useState<AdminTestingCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cardsFetched, setCardsFetched] = useState(false)
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [globalCarouselIndex, setGlobalCarouselIndex] = useState(0)
  const [carouselTimer, setCarouselTimer] = useState<number>(5)

  // Fetch cards and start global carousel timer
  useEffect(() => {
    fetchCards()

    // load saved timer from localStorage (default 5s)
    const savedTimer = parseInt(
      localStorage.getItem('adminTestingCards_carouselTimer') || '5',
      10
    )
    setCarouselTimer(savedTimer)

    const intervalId = setInterval(() => {
      setGlobalCarouselIndex(prev => prev + 1)
    }, savedTimer * 1000)

    return () => clearInterval(intervalId)
  }, [])

  const fetchCards = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from<SupabaseCardData>('admin_testing_cards')
      .select('*')
      .order('order', { ascending: true })

    if (error) {
      console.error('Error fetching cards:', error)
      toast({
        title: 'Error',
        description: 'Failed to load cards',
        variant: 'destructive',
      })
    } else {
      setCards(
        data!.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          priority: d.priority,
          points: d.points,
          order: d.order,
          background_opacity: d.background_opacity,
          focal_point_x: d.focal_point_x,
          focal_point_y: d.focal_point_y,
          title_color: d.title_color,
          subtext_color: d.subtext_color,
          calendar_color: d.calendar_color,
          icon_color: d.icon_color,
          highlight_effect: d.highlight_effect,
          usage_data: d.usage_data,
          background_images: d.background_images,
        }))
      )
      setCardsFetched(true)
    }
    setIsLoading(false)
  }

  const handleAddCard = async () => {
    const newCard: AdminTestingCardData = {
      id: uuidv4(),
      title: 'New Card',
      description: 'This is a new admin testing card.',
      priority: 'medium',
      points: 5,
      background_opacity: 80,
      focal_point_x: 50,
      focal_point_y: 50,
      title_color: '#FFFFFF',
      subtext_color: '#8E9196',
      calendar_color: '#7E69AB',
      icon_color: '#FFFFFF',
      highlight_effect: false,
      usage_data: [0, 0, 0, 0, 0, 0, 0],
      background_images: [],
      order: cards.length,
    }

    try {
      console.log('Adding new card to Supabase:', newCard)
      const { data, error } = await supabase
        .from('admin_testing_cards')
        .insert({ ...newCard, points: newCard.points || 0 })
        .select()
        .single()

      if (error) throw error

      const inserted = data as SupabaseCardData
      const formatted: AdminTestingCardData = {
        id: inserted.id,
        title: inserted.title,
        description: inserted.description,
        priority: inserted.priority,
        points: inserted.points,
        order: inserted.order,
        background_opacity: inserted.background_opacity,
        focal_point_x: inserted.focal_point_x,
        focal_point_y: inserted.focal_point_y,
        title_color: inserted.title_color,
        subtext_color: inserted.subtext_color,
        calendar_color: inserted.calendar_color,
        icon_color: inserted.icon_color,
        highlight_effect: inserted.highlight_effect,
        usage_data: inserted.usage_data,
        background_images: inserted.background_images,
      }

      setCards(prev => [...prev, formatted])
      toast({
        title: 'Success',
        description: 'New card created successfully',
      })
      return formatted
    } catch (error) {
      console.error('Error in handleAddCard:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while adding the card',
        variant: 'destructive',
      })
      return null
    }
  }

  const handleUpdateCard = (updatedCard: AdminTestingCardData) => {
    setCards(prev =>
      prev.map(c => (c.id === updatedCard.id ? updatedCard : c))
    )
  }

  const saveCardOrder = async () => {
    setIsSavingOrder(true)
    try {
      const updates = cards.map(c => ({ id: c.id, order: c.order }))
      for (const u of updates) {
        await supabase
          .from('admin_testing_cards')
          .update({ order: u.order })
          .eq('id', u.id)
      }
      toast({
        title: 'Success',
        description: 'Card order saved successfully',
      })
    } catch (error) {
      console.error('Error saving order:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while saving card order',
        variant: 'destructive',
      })
    } finally {
      setIsSavingOrder(false)
    }
  }

  const toggleReorderMode = () => {
    setIsReorderMode(prev => {
      if (prev) saveCardOrder()
      return !prev
    })
  }

  const onDragStart = () => {
    document.body.classList.add('dragging-active')
  }

  const onDragEnd = (result: DropResult) => {
    document.body.classList.remove('dragging-active')
    const { source, destination } = result
    if (!destination || destination.index === source.index) return

    const reordered = Array.from(cards)
    const [moved] = reordered.splice(source.index, 1)
    reordered.splice(destination.index, 0, moved)
    const reindexed = reordered.map((c, idx) => ({ ...c, order: idx }))
    setCards(reindexed)
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-6">
          Admin Testing Panel
        </h1>

        <div className="flex justify-end gap-2 mb-6">
          <Button
            onClick={toggleReorderMode}
            disabled={isSavingOrder}
            className={
              isReorderMode
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          >
            <MoveVertical className="mr-2 h-4 w-4" />
            {isReorderMode ? 'Save Order' : 'Reorder Cards'}
          </Button>

          <Button
            onClick={handleAddCard}
            disabled={isReorderMode}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Card
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center text-white p-8">Loading cards...</div>
        ) : cards.length === 0 && cardsFetched ? (
          <div className="text-center text-white p-8">
            <p>
              No cards found. Click “Add New Card” to create one.
            </p>
          </div>
        ) : cards.length === 0 && !cardsFetched ? (
          <div className="text-center text-white p-8">
            <p>Unable to load cards. Please refresh.</p>
          </div>
        ) : (
          <DragDropContext
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <Droppable
              droppableId="cards"
              isDropDisabled={!isReorderMode}
              direction="vertical"
            >
              {provided => (
                <div
                  className="flex flex-col gap-6 w-full"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {cards.map((card, idx) => (
                    <Draggable
                      key={card.id}
                      draggableId={card.id}
                      index={idx}
                      isDragDisabled={!isReorderMode}
                    >
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          style={{
                            ...prov.draggableProps.style,
                            userSelect: 'none',
                          }}
                          className={snap.isDragging ? 'opacity-80' : ''}
                        >
                          <div
                            className={`
                              transition-opacity duration-500 ease-out
                              ${snap.isDragging ? 'opacity-70' : 'opacity-100'}
                            `}
                          >
                            <AdminTestingCard
                              card={card}
                              onUpdate={handleUpdateCard}
                              isReorderMode={isReorderMode}
                              globalCarouselIndex={globalCarouselIndex}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        <div className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
            Data Management
          </h2>
          <ActivityDataReset />
        </div>
      </div>
    </AppLayout>
  )
}

export default AdminTesting
