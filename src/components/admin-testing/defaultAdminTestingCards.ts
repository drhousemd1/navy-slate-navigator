
export interface AdminTestingCardData {
  id: string;
  title: string;
  description: string;
}

export const defaultAdminTestingCards: AdminTestingCardData[] = [
  {
    id: "admin-card-1",
    title: "Sample Test Card",
    description: "This is a placeholder test card for admin UI development."
  },
  {
    id: "admin-card-2",
    title: "Behavior Override Check",
    description: "Testing behavior override mechanics and UI placement."
  }
];
