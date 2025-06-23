
import { UserRole } from '@/contexts/auth/types';

export interface UserProfile {
  id: string;
  role: UserRole;
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
  role: UserRole;
}
