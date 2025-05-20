
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
// Type for storing recently used icons
export interface RecentIcon {
  name: string;
  isCustom: boolean;
  url?: string;
}

// Get recent icons from localStorage
export const getRecentIcons = (): RecentIcon[] => {
  const recentIconsString = localStorage.getItem('recentIcons');
  return recentIconsString ? JSON.parse(recentIconsString) : [];
};

// Helper function to manage recently used icons
export const updateRecentIcons = (iconToAdd: RecentIcon): RecentIcon[] => {
  // Get current recent icons from localStorage
  let recentIcons = getRecentIcons();
  
  // Check if icon already exists in the list
  const existingIndex = recentIcons.findIndex(icon => 
    (icon.isCustom && iconToAdd.isCustom && icon.url === iconToAdd.url) || 
    (!icon.isCustom && !iconToAdd.isCustom && icon.name === iconToAdd.name)
  );
  
  // If icon exists, remove it (to move it to the front)
  if (existingIndex > -1) {
    recentIcons.splice(existingIndex, 1);
  }
  
  // Add icon to the front of the list
  recentIcons.unshift(iconToAdd);
  
  // Limit to 5 recent icons
  recentIcons = recentIcons.slice(0, 5);
  
  // Save to localStorage
  localStorage.setItem('recentIcons', JSON.stringify(recentIcons));
  
  return recentIcons;
};
