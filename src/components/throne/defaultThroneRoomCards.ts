
import { Skull, Crown, Swords, Award } from 'lucide-react';

export const defaultThroneRoomCards = [
  {
    id: "royal-duty",
    title: "Royal Duty",
    description: "Complete daily tasks before sunset.",
    icon: Skull,
    priority: "medium" as const,
    points: 5
  },
  {
    id: "kingdom-status",
    title: "Kingdom Status",
    description: "Monitor your kingdom's prosperity.",
    icon: Crown,
    priority: "high" as const,
    points: 10
  },
  {
    id: "realm-defense",
    title: "Realm Defense",
    description: "Protect your boundaries from invaders.",
    icon: Swords,
    priority: "low" as const,
    points: 3
  },
  {
    id: "royal-achievements",
    title: "Royal Achievements",
    description: "View your earned honors and merits.",
    icon: Award,
    priority: "medium" as const,
    points: 7
  }
];
