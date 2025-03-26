
  const handleSubmit = async (values: RewardFormValues) => {
    console.log("Form submitted with values:", values);
    setLoading(true);
    
    try {
      // Prepare the reward data object with all form values
      const rewardToSave = {
        ...values,
        iconName: selectedIconName || undefined,
      };
      
      // Explicitly ensure background_image_url is properly handled
      if (!imagePreview) {
        rewardToSave.background_image_url = null;
      }
      
      console.log("Calling onSave with data:", rewardToSave);
      await onSave(rewardToSave);
      
      toast({
        title: "Success",
        description: "Reward saved successfully",
      });
    } catch (error) {
      console.error('Error saving reward:', error);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const incrementCost = () => {
    const currentCost = form.getValues('cost');
    form.setValue('cost', currentCost + 1);
  };

  const decrementCost = () => {
    const currentCost = form.getValues('cost');
    form.setValue('cost', Math.max(0, currentCost - 1));
  };
