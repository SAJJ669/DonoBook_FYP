export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      book_metadata: {
        Row: {
          author: string | null
          confidence_score: number | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          edition: string | null
          id: string
          isbn: string | null
          metadata_source: string | null
          page_count: number | null
          publication_year: number | null
          publisher: string | null
          subjects: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          confidence_score?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          edition?: string | null
          id?: string
          isbn?: string | null
          metadata_source?: string | null
          page_count?: number | null
          publication_year?: number | null
          publisher?: string | null
          subjects?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          confidence_score?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          edition?: string | null
          id?: string
          isbn?: string | null
          metadata_source?: string | null
          page_count?: number | null
          publication_year?: number | null
          publisher?: string | null
          subjects?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          ai_extracted_data: Json | null
          back_image_url: string | null
          binder_image_url: string | null
          category: Database["public"]["Enums"]["book_category"]
          condition: Database["public"]["Enums"]["book_condition"]
          created_at: string
          description: string | null
          dimensions: Json | null
          front_image_url: string | null
          grade: string | null
          id: string
          image_url: string | null
          inner_pages: Json | null
          isbn: string | null
          metadata_id: string | null
          owner_id: string
          price: number | null
          title: string
          type: Database["public"]["Enums"]["book_type"]
          updated_at: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          back_image_url?: string | null
          binder_image_url?: string | null
          category: Database["public"]["Enums"]["book_category"]
          condition: Database["public"]["Enums"]["book_condition"]
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          front_image_url?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          inner_pages?: Json | null
          isbn?: string | null
          metadata_id?: string | null
          owner_id: string
          price?: number | null
          title: string
          type: Database["public"]["Enums"]["book_type"]
          updated_at?: string
        }
        Update: {
          ai_extracted_data?: Json | null
          back_image_url?: string | null
          binder_image_url?: string | null
          category?: Database["public"]["Enums"]["book_category"]
          condition?: Database["public"]["Enums"]["book_condition"]
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          front_image_url?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          inner_pages?: Json | null
          isbn?: string | null
          metadata_id?: string | null
          owner_id?: string
          price?: number | null
          title?: string
          type?: Database["public"]["Enums"]["book_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_metadata_id_fkey"
            columns: ["metadata_id"]
            isOneToOne: false
            referencedRelation: "book_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      bookstore_verifications: {
        Row: {
          business_id: string
          contact_number: string
          created_at: string | null
          id: string
          proof_image_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shop_address: string
          shop_name: string
          status: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          contact_number: string
          created_at?: string | null
          id?: string
          proof_image_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_address: string
          shop_name: string
          status?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          contact_number?: string
          created_at?: string | null
          id?: string
          proof_image_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_address?: string
          shop_name?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          business_id: string | null
          contact_number: string | null
          created_at: string
          gender: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          shop_address: string | null
          shop_name: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          business_id?: string | null
          contact_number?: string | null
          created_at?: string
          gender?: string | null
          id: string
          latitude?: number | null
          longitude?: number | null
          name: string
          shop_address?: string | null
          shop_name?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          business_id?: string | null
          contact_number?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          shop_address?: string | null
          shop_name?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          verified?: boolean | null
        }
        Relationships: []
      }
      user_messages: {
        Row: {
          created_at: string | null
          edit_history: Json | null
          edited_at: string | null
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string | null
          edit_history?: Json | null
          edited_at?: string | null
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string | null
          edit_history?: Json | null
          edited_at?: string | null
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      book_category: "textbook" | "reading_book"
      book_condition: "new" | "used"
      book_type: "donate" | "exchange" | "sell"
      user_type: "user" | "bookstore"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      book_category: ["textbook", "reading_book"],
      book_condition: ["new", "used"],
      book_type: ["donate", "exchange", "sell"],
      user_type: ["user", "bookstore"],
    },
  },
} as const
