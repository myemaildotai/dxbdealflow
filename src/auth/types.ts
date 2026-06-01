import type { User } from "@supabase/supabase-js";
import { Agency, BrokerProfile, PlatformUser, UserRole, UserStatus } from "@/lib/deal-types";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  role: UserRole | null;
  status: UserStatus | null;
  firstName: string | null;
  lastName: string | null;
  platformUser: PlatformUser | null;
  brokerProfile: BrokerProfile | null;
  agency: Agency | null;
}

export type SupabaseAuthUser = User;

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
}

