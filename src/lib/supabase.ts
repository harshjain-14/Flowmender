import { createClient } from '@supabase/supabase-js'

// Use build-time replacements instead of import.meta.env to prevent exposure
const supabaseUrl = typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = typeof __SUPABASE_ANON_KEY__ !== 'undefined' ? __SUPABASE_ANON_KEY__ : import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables. Please check your .env file or Netlify environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string
          name: string
          content: string
          type: string
          size: number
          uploaded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          content: string
          type: string
          size: number
          uploaded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          content?: string
          type?: string
          size?: number
          uploaded_at?: string
          created_at?: string
        }
      }
      analysis_results: {
        Row: {
          id: string
          user_id: string
          document_id: string
          document_name: string
          analyzed_at: string
          context: any
          journeys: any
          edge_cases: any
          summary: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          document_name: string
          analyzed_at?: string
          context?: any
          journeys?: any
          edge_cases?: any
          summary?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          document_name?: string
          analyzed_at?: string
          context?: any
          journeys?: any
          edge_cases?: any
          summary?: any
          created_at?: string
        }
      }
    }
  }
}