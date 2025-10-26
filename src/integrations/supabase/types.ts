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
      books: {
        Row: {
          category: Database["public"]["Enums"]["book_category"]
          condition: Database["public"]["Enums"]["book_condition"]
          created_at: string
          description: string | null
          grade: string | null
          id: string
          image_url: string | null
          owner_id: string
          price: number | null
          title: string
          type: Database["public"]["Enums"]["book_type"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["book_category"]
          condition: Database["public"]["Enums"]["book_condition"]
          created_at?: string
          description?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          owner_id: string
          price?: number | null
          title: string
          type: Database["public"]["Enums"]["book_type"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["book_category"]
          condition?: Database["public"]["Enums"]["book_condition"]
          created_at?: string
          description?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          owner_id?: string
          price?: number | null
          title?: string
          type?: Database["public"]["Enums"]["book_type"]
          updated_at?: string
        }
        Relationships: []
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
          business_id: string | null
          contact_number: string | null
          created_at: string
          id: string
          name: string
          shop_address: string | null
          shop_name: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          verified: boolean | null
        }
        Insert: {
          business_id?: string | null
          contact_number?: string | null
          created_at?: string
          id: string
          name: string
          shop_address?: string | null
          shop_name?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          verified?: boolean | null
        }
        Update: {
          business_id?: string | null
          contact_number?: string | null
          created_at?: string
          id?: string
          name?: string
          shop_address?: string | null
          shop_name?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          verified?: boolean | null
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
