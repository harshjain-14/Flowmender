import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
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