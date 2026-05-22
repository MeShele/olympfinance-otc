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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      company_settings: {
        Row: {
          accountant_name: string
          accountant_phone: string
          acquiring_enabled: boolean
          bank_details: string
          beneficiaries: string
          branches: string
          charter_capital: number
          company_name: string
          created_at: string
          director_name: string
          director_phone: string
          director_short: string
          email: string
          fee_percent: number
          foreign_accounts: string
          founders: string
          id: string
          inn: string
          legal_address: string
          license_date: string
          license_number: string
          liquidity_provider_inn: string
          liquidity_provider_name: string
          liquidity_provider_residency: string
          liquidity_provider_wallet: string
          manual_wallet_address: string
          okpo: string
          operator_id: string
          operator_wallet_address: string
          phone: string
          subsidiaries: string
          sumsub_enabled: boolean
          tax_office: string
          updated_at: string
          wallets: string
          website: string
        }
        Insert: {
          accountant_name?: string
          accountant_phone?: string
          acquiring_enabled?: boolean
          bank_details?: string
          beneficiaries?: string
          branches?: string
          charter_capital?: number
          company_name?: string
          created_at?: string
          director_name?: string
          director_phone?: string
          director_short?: string
          email?: string
          fee_percent?: number
          foreign_accounts?: string
          founders?: string
          id?: string
          inn?: string
          legal_address?: string
          license_date?: string
          license_number?: string
          liquidity_provider_inn?: string
          liquidity_provider_name?: string
          liquidity_provider_residency?: string
          liquidity_provider_wallet?: string
          manual_wallet_address?: string
          okpo?: string
          operator_id: string
          operator_wallet_address?: string
          phone?: string
          subsidiaries?: string
          sumsub_enabled?: boolean
          tax_office?: string
          updated_at?: string
          wallets?: string
          website?: string
        }
        Update: {
          accountant_name?: string
          accountant_phone?: string
          acquiring_enabled?: boolean
          bank_details?: string
          beneficiaries?: string
          branches?: string
          charter_capital?: number
          company_name?: string
          created_at?: string
          director_name?: string
          director_phone?: string
          director_short?: string
          email?: string
          fee_percent?: number
          foreign_accounts?: string
          founders?: string
          id?: string
          inn?: string
          legal_address?: string
          license_date?: string
          license_number?: string
          liquidity_provider_inn?: string
          liquidity_provider_name?: string
          liquidity_provider_residency?: string
          liquidity_provider_wallet?: string
          manual_wallet_address?: string
          okpo?: string
          operator_id?: string
          operator_wallet_address?: string
          phone?: string
          subsidiaries?: string
          sumsub_enabled?: boolean
          tax_office?: string
          updated_at?: string
          wallets?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_data: {
        Row: {
          aml_rejections: number
          created_at: string
          gsfr_reports: number
          id: string
          net_profit: number
          operator_id: string
          reorganization_info: string
          report_month: number
          report_year: number
          state_registration_changes: string
          suspicious_reports: number
          taxes_paid: number
          total_assets: number
          total_equity: number
          total_liabilities: number
          updated_at: string
        }
        Insert: {
          aml_rejections?: number
          created_at?: string
          gsfr_reports?: number
          id?: string
          net_profit?: number
          operator_id: string
          reorganization_info?: string
          report_month: number
          report_year: number
          state_registration_changes?: string
          suspicious_reports?: number
          taxes_paid?: number
          total_assets?: number
          total_equity?: number
          total_liabilities?: number
          updated_at?: string
        }
        Update: {
          aml_rejections?: number
          created_at?: string
          gsfr_reports?: number
          id?: string
          net_profit?: number
          operator_id?: string
          reorganization_info?: string
          report_month?: number
          report_year?: number
          state_registration_changes?: string
          suspicious_reports?: number
          taxes_paid?: number
          total_assets?: number
          total_equity?: number
          total_liabilities?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_data_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          bank_accounts: string | null
          code: string
          created_at: string
          fee_percent: number
          icon: string
          id: string
          is_active: boolean
          max_amount: number
          min_amount: number
          name: string
          network: string | null
          operator_id: string
          rate_to_usd: number
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          bank_accounts?: string | null
          code: string
          created_at?: string
          fee_percent?: number
          icon: string
          id?: string
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          name: string
          network?: string | null
          operator_id: string
          rate_to_usd?: number
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          bank_accounts?: string | null
          code?: string
          created_at?: string
          fee_percent?: number
          icon?: string
          id?: string
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          name?: string
          network?: string | null
          operator_id?: string
          rate_to_usd?: number
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currencies_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_pair_rates: {
        Row: {
          crypto_currency_id: string
          fiat_currency_id: string
          id: string
          operator_id: string
          rate: number
          updated_at: string | null
        }
        Insert: {
          crypto_currency_id: string
          fiat_currency_id: string
          id?: string
          operator_id: string
          rate: number
          updated_at?: string | null
        }
        Update: {
          crypto_currency_id?: string
          fiat_currency_id?: string
          id?: string
          operator_id?: string
          rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "currency_pair_rates_crypto_currency_id_fkey"
            columns: ["crypto_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_pair_rates_fiat_currency_id_fkey"
            columns: ["fiat_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          applicant_id: string | null
          created_at: string
          document_country: string | null
          document_number: string | null
          document_type: string | null
          document_url: string | null
          external_user_id: string | null
          id: string
          operator_id: string
          rejection_reason: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          applicant_id?: string | null
          created_at?: string
          document_country?: string | null
          document_number?: string | null
          document_type?: string | null
          document_url?: string | null
          external_user_id?: string | null
          id?: string
          operator_id: string
          rejection_reason?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          applicant_id?: string | null
          created_at?: string
          document_country?: string | null
          document_number?: string | null
          document_type?: string | null
          document_url?: string | null
          external_user_id?: string | null
          id?: string
          operator_id?: string
          rejection_reason?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidity_providers: {
        Row: {
          created_at: string
          id: string
          inn: string
          is_default: boolean
          name: string
          operator_id: string
          residency: string
          updated_at: string
          wallet: string
        }
        Insert: {
          created_at?: string
          id?: string
          inn?: string
          is_default?: boolean
          name?: string
          operator_id: string
          residency?: string
          updated_at?: string
          wallet?: string
        }
        Update: {
          created_at?: string
          id?: string
          inn?: string
          is_default?: boolean
          name?: string
          operator_id?: string
          residency?: string
          updated_at?: string
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidity_providers_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_kgs: number
          contact_info: string | null
          created_at: string
          fee: number
          from_amount: number
          from_currency: string
          id: string
          network: string | null
          notes: string | null
          operator_id: string
          rate: number
          status: string
          to_amount: number
          to_currency: string
          tx_hash: string | null
          updated_at: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          amount_kgs?: number
          contact_info?: string | null
          created_at?: string
          fee?: number
          from_amount: number
          from_currency: string
          id?: string
          network?: string | null
          notes?: string | null
          operator_id: string
          rate: number
          status?: string
          to_amount: number
          to_currency: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          amount_kgs?: number
          contact_info?: string | null
          created_at?: string
          fee?: number
          from_amount?: number
          from_currency?: string
          id?: string
          network?: string | null
          notes?: string | null
          operator_id?: string
          rate?: number
          status?: string
          to_amount?: number
          to_currency?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_payments: {
        Row: {
          contact_info: string | null
          created_at: string
          expires_at: string | null
          from_amount: number
          from_currency: string
          id: string
          network: string | null
          operator_id: string
          payment_id: string
          payment_url: string | null
          payment_wallet: string | null
          rate: number
          status: string
          to_amount: number
          to_currency: string
          updated_at: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          expires_at?: string | null
          from_amount: number
          from_currency: string
          id?: string
          network?: string | null
          operator_id: string
          payment_id: string
          payment_url?: string | null
          payment_wallet?: string | null
          rate: number
          status?: string
          to_amount: number
          to_currency: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          expires_at?: string | null
          from_amount?: number
          from_currency?: string
          id?: string
          network?: string | null
          operator_id?: string
          payment_id?: string
          payment_url?: string | null
          payment_wallet?: string | null
          rate?: number
          status?: string
          to_amount?: number
          to_currency?: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_payments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_verified: boolean
          kyc_required: boolean
          operator_id: string
          personal_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          kyc_required?: boolean
          operator_id: string
          personal_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          kyc_required?: boolean
          operator_id?: string
          personal_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          operator_id: string
          staff_role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          operator_id: string
          staff_role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          operator_id?: string
          staff_role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          operator_id: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          operator_id: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          operator_id?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_view_kyc_doc: { Args: { file_path: string }; Returns: boolean }
      get_staff_permissions: { Args: { _user_id: string }; Returns: Json }
      get_user_operator_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_permission: {
        Args: { _action: string; _section: string; _user_id: string }
        Returns: boolean
      }
      is_staff_of_operator: {
        Args: { _operator_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "operator_admin" | "staff"
      kyc_status:
        | "pending"
        | "in_progress"
        | "approved"
        | "rejected"
        | "expired"
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
      app_role: ["admin", "user", "operator_admin", "staff"],
      kyc_status: ["pending", "in_progress", "approved", "rejected", "expired"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.98.2 (currently installed v2.90.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
