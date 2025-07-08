import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string;
          is_admin: boolean;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          is_admin?: boolean;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          is_admin?: boolean;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          file_url: string;
          image_url: string | null;
          screenshots: string[] | null;
          download_count: number;
          rating: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          file_url: string;
          image_url?: string | null;
          screenshots?: string[] | null;
          download_count?: number;
          rating?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: string;
          file_url?: string;
          image_url?: string | null;
          screenshots?: string[] | null;
          download_count?: number;
          rating?: number;
          created_by?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;
          content: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          user_id: string;
          content: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          user_id?: string;
          content?: string;
          rating?: number;
          created_at?: string;
        };
      };
    };
  };
};