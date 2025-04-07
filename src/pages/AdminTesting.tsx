
  const handleDeleteCard = async (cardId: string) => {
    try {
      console.log("AdminTesting: Deleting card", cardId);
      
      const { error } = await supabase
        .from('admin_testing_cards')
        .delete()
        .eq('id', cardId);
      
      if (error) {
        throw error;
      }
      
      const newArr = adminTestingCards.filter(card => card.id !== cardId);
      setAdminTestingCards(newArr);
      
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newArr));
      
      setIsEditModalOpen(false);
      
      toast({
        title: "Card Deleted",
        description: "The admin testing card has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to delete card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleAddCard = async () => {
    try {
      const newId = `card-${Date.now()}`;
      const newCard: AdminTestingCardData = {
        id: newId,
        title: 'New Card',
        description: 'This is a new card description',
        iconName: '',
        icon_color: '#FFFFFF',
        title_color: '#FFFFFF',
        subtext_color: '#8E9196',
        calendar_color: '#7E69AB',
        highlight_effect: false,
        priority: 'medium',
        usage_data: [0, 0, 0, 0, 0, 0, 0]
      };

      const { error } = await supabase
        .from('admin_testing_cards')
        .insert([{
          id: newCard.id,
          title: newCard.title,
          description: newCard.description,
          icon_name: newCard.iconName,
          icon_color: newCard.icon_color,
          title_color: newCard.title_color,
          subtext_color: newCard.subtext_color,
          calendar_color: newCard.calendar_color,
          highlight_effect: newCard.highlight_effect,
          priority: newCard.priority,
          usage_data: newCard.usage_data
        }]);
      
      if (error) {
        throw error;
      }
      
      setAdminTestingCards(prev => {
        const newArr = [...prev, newCard];
        localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(newArr));
        return newArr;
      });

      toast({
        title: "Card Added",
        description: "A new card has been added successfully",
      });
      
      setSelectedCard(newCard);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error("Error adding admin testing card:", error);
      toast({
        title: "Error",
        description: `Failed to add card: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const updateCardUsage = async (card: AdminTestingCardData) => {
    try {
      const dayOfWeek = new Date().getDay();
      
      const usageData = [...(card.usage_data || [0, 0, 0, 0, 0, 0, 0])];
      
      usageData[dayOfWeek] = (usageData[dayOfWeek] || 0) + 1;
      
      const { error } = await supabase
        .from('admin_testing_cards')
        .update({ 
          usage_data: usageData,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);
      
      if (error) {
        throw error;
      }
      
      const updatedCards = adminTestingCards.map(c => {
        if (c.id === card.id) {
          return { ...c, usage_data: usageData };
        }
        return c;
      });
      
      setAdminTestingCards(updatedCards);
      
      localStorage.setItem(ADMIN_TESTING_STORAGE_KEY, JSON.stringify(updatedCards));
      
      toast({
        title: "Usage Recorded",
        description: "Card usage has been recorded for today",
      });
    } catch (error) {
      console.error("Error updating card usage:", error);
      toast({
        title: "Error",
        description: "Failed to update card usage",
        variant: "destructive"
      });
    }
  };
