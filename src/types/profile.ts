
import { UserRole } from '@/contexts/auth/types';

// Strict role typing specifically for profiles table (sub/dom relationship roles)
export type ProfileRole = 'sub' | 'dom';

export interface UserProfile {
  id: string;
  role: ProfileRole; // Use ProfileRole for profiles table
  avatar_url?: string | null;
  dom_points?: number | null;
  linked_partner_id?: string | null;
  partner_link_code?: string | null;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface LinkedPartnerInfo {
  id: string;
  email?: string;
  role: ProfileRole; // Use ProfileRole for linked partner relationship roles
}
