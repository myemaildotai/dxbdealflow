// Base document interface for Supabase tables
export interface BaseDocument {
  id: string;
  created_at: string; // ISO string timestamp
  updated_at: string; // ISO string timestamp
}

// User profile interface (matches Supabase profiles table)
export interface UserProfile extends BaseDocument {
  display_name?: string;
  avatar_url?: string;
  email?: string; // From auth.users
  role?: 'admin' | 'user' | 'moderator';
  preferences?: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
}

// Auth user interface (from Supabase auth)
export interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  phone?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

// Example: Post document interface
export interface PostDoc extends BaseDocument {
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  published: boolean;
  tags: string[];
  likes: number;
  views: number;
  owner_uid: string; // For RLS
}

// Example: Comment document interface
export interface CommentDoc extends BaseDocument {
  post_id: string;
  content: string;
  author_id: string;
  author_name: string;
  parent_comment_id?: string; // For nested comments
  owner_uid: string; // For RLS
}

// File upload metadata
export interface FileDoc extends BaseDocument {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploaded_by: string;
  bucket: string;
  owner_uid: string; // For RLS
}

// Notification document
export interface NotificationDoc extends BaseDocument {
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  action_url?: string;
  owner_uid: string; // For RLS
}

// Settings document
export interface SettingsDoc extends BaseDocument {
  user_id: string;
  theme: 'light' | 'dark';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
  privacy: {
    profile_visible: boolean;
    activity_visible: boolean;
  };
  owner_uid: string; // For RLS
}

// Item document (example from template)
export interface ItemDoc extends BaseDocument {
  name: string;
  description?: string;
  category_id?: string;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, unknown>;
  tags: string[];
  owner_uid: string; // For RLS
}

// Category document (example from template)
export interface CategoryDoc extends BaseDocument {
  name: string;
  description?: string;
  parent_id?: string;
  display_order: number;
  is_active: boolean;
  owner_uid: string; // For RLS
}

// Table names as constants (snake_case for Supabase)
export const TABLES = {
  PROFILES: 'profiles',
  POSTS: 'posts',
  COMMENTS: 'comments',
  FILES: 'files',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  ITEMS: 'items',
  CATEGORIES: 'categories',
} as const;

// Type for table names
export type TableName = typeof TABLES[keyof typeof TABLES];

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Filter types for queries
export interface QueryFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}

// Sort types for queries
export interface QuerySort {
  column: string;
  ascending?: boolean;
}
