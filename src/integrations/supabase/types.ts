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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string | null
          details: string | null
          entity: string
          entity_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string | null
          details?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string | null
          details?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      cofounder_capital: {
        Row: {
          cofounder_name: string
          contribution_amount_iqd: number
          contribution_amount_usd: number
          contribution_date: string
          created_at: string | null
          currency_input: string | null
          fx_date: string
          fx_rate: number
          id: string
          is_fx_locked: boolean | null
          notes: string | null
        }
        Insert: {
          cofounder_name: string
          contribution_amount_iqd: number
          contribution_amount_usd: number
          contribution_date: string
          created_at?: string | null
          currency_input?: string | null
          fx_date: string
          fx_rate: number
          id?: string
          is_fx_locked?: boolean | null
          notes?: string | null
        }
        Update: {
          cofounder_name?: string
          contribution_amount_iqd?: number
          contribution_amount_usd?: number
          contribution_date?: string
          created_at?: string | null
          currency_input?: string | null
          fx_date?: string
          fx_rate?: number
          id?: string
          is_fx_locked?: boolean | null
          notes?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount_iqd: number
          amount_usd: number
          created_at: string | null
          currency_input: string | null
          fx_date: string
          fx_rate: number
          id: string
          is_fx_locked: boolean | null
          order_id: string | null
          person_id: string | null
          rate: number | null
          rule: Database["public"]["Enums"]["commission_rule"] | null
          status: Database["public"]["Enums"]["commission_status"] | null
          type: string
        }
        Insert: {
          amount_iqd: number
          amount_usd: number
          created_at?: string | null
          currency_input?: string | null
          fx_date: string
          fx_rate: number
          id?: string
          is_fx_locked?: boolean | null
          order_id?: string | null
          person_id?: string | null
          rate?: number | null
          rule?: Database["public"]["Enums"]["commission_rule"] | null
          status?: Database["public"]["Enums"]["commission_status"] | null
          type: string
        }
        Update: {
          amount_iqd?: number
          amount_usd?: number
          created_at?: string | null
          currency_input?: string | null
          fx_date?: string
          fx_rate?: number
          id?: string
          is_fx_locked?: boolean | null
          order_id?: string | null
          person_id?: string | null
          rate?: number | null
          rule?: Database["public"]["Enums"]["commission_rule"] | null
          status?: Database["public"]["Enums"]["commission_status"] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          city: string | null
          company_logo_url: string | null
          company_name: string | null
          company_slogan: string | null
          country: string | null
          created_at: string | null
          default_currency: string | null
          email: string | null
          id: string
          industry: string | null
          legal_name: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          street: string | null
          tax_id: string | null
          time_zone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_slogan?: string | null
          country?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          tax_id?: string | null
          time_zone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_slogan?: string | null
          country?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          tax_id?: string | null
          time_zone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      customer_reminder_settings: {
        Row: {
          created_at: string | null
          custom_schedule_enabled: boolean | null
          customer_id: string | null
          id: string
          opt_out_reason: string | null
          reminders_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_schedule_enabled?: boolean | null
          customer_id?: string | null
          id?: string
          opt_out_reason?: string | null
          reminders_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_schedule_enabled?: boolean | null
          customer_id?: string | null
          id?: string
          opt_out_reason?: string | null
          reminders_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_reminder_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company: string
          contact_name: string | null
          created_at: string | null
          credit_limit_usd: number | null
          email: string | null
          id: string
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company: string
          contact_name?: string | null
          created_at?: string | null
          credit_limit_usd?: number | null
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string
          contact_name?: string | null
          created_at?: string | null
          credit_limit_usd?: number | null
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          document_name: string
          document_url: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          uploaded_at: string | null
        }
        Insert: {
          document_name: string
          document_url?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          document_name?: string
          document_url?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          uploaded_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          commission_rate_pct: number | null
          created_at: string | null
          id: string
          name: string
          role: string | null
          status: string | null
        }
        Insert: {
          commission_rate_pct?: number | null
          created_at?: string | null
          id?: string
          name: string
          role?: string | null
          status?: string | null
        }
        Update: {
          commission_rate_pct?: number | null
          created_at?: string | null
          id?: string
          name?: string
          role?: string | null
          status?: string | null
        }
        Relationships: []
      }
      exchange_rate_history: {
        Row: {
          created_at: string | null
          effective_date: string
          exchange_rate: number
          exchange_rate_id: string | null
          id: string
          status: Database["public"]["Enums"]["exchange_rate_status"] | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          effective_date: string
          exchange_rate: number
          exchange_rate_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["exchange_rate_status"] | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          exchange_rate?: number
          exchange_rate_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["exchange_rate_status"] | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rate_history_exchange_rate_id_fkey"
            columns: ["exchange_rate_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_settings: {
        Row: {
          api_key: string | null
          api_provider: string | null
          auto_update_enabled: boolean | null
          created_at: string | null
          id: string
          last_update: string | null
          update_frequency:
            | Database["public"]["Enums"]["update_frequency"]
            | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_provider?: string | null
          auto_update_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_update?: string | null
          update_frequency?:
            | Database["public"]["Enums"]["update_frequency"]
            | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_provider?: string | null
          auto_update_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_update?: string | null
          update_frequency?:
            | Database["public"]["Enums"]["update_frequency"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          currency_from: string
          currency_to: string
          effective_date: string
          exchange_rate: number
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["exchange_rate_status"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          currency_from?: string
          currency_to?: string
          effective_date: string
          exchange_rate: number
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["exchange_rate_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          currency_from?: string
          currency_to?: string
          effective_date?: string
          exchange_rate?: number
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["exchange_rate_status"] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_iqd: number
          amount_usd: number
          category: string | null
          created_at: string | null
          currency_input: string | null
          date: string
          description: string | null
          exp_no: string
          fx_date: string
          fx_rate: number
          id: string
          is_fx_locked: boolean | null
          notes: string | null
          receipt_url: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount_iqd: number
          amount_usd: number
          category?: string | null
          created_at?: string | null
          currency_input?: string | null
          date: string
          description?: string | null
          exp_no: string
          fx_date: string
          fx_rate: number
          id?: string
          is_fx_locked?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount_iqd?: number
          amount_usd?: number
          category?: string | null
          created_at?: string | null
          currency_input?: string | null
          date?: string
          description?: string | null
          exp_no?: string
          fx_date?: string
          fx_rate?: number
          id?: string
          is_fx_locked?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      invoice_settings: {
        Row: {
          auto_send_invoices: boolean | null
          created_at: string | null
          default_payment_terms: number | null
          footer_text: string | null
          id: string
          invoice_next_number: number | null
          invoice_prefix: string | null
          late_fee_percentage: number | null
          payment_instructions: string | null
          require_po_number: boolean | null
          show_tax_details: boolean | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_send_invoices?: boolean | null
          created_at?: string | null
          default_payment_terms?: number | null
          footer_text?: string | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          late_fee_percentage?: number | null
          payment_instructions?: string | null
          require_po_number?: boolean | null
          show_tax_details?: boolean | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_send_invoices?: boolean | null
          created_at?: string | null
          default_payment_terms?: number | null
          footer_text?: string | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          late_fee_percentage?: number | null
          payment_instructions?: string | null
          require_po_number?: boolean | null
          show_tax_details?: boolean | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_iqd: number
          amount_usd: number
          created_at: string | null
          currency_input: string | null
          customer_id: string | null
          due_date: string | null
          fx_date: string
          fx_rate: number
          id: string
          invoice_no: string
          is_fx_locked: boolean | null
          issued_date: string | null
          order_id: string | null
          paid_iqd: number | null
          paid_usd: number | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
        }
        Insert: {
          amount_iqd: number
          amount_usd: number
          created_at?: string | null
          currency_input?: string | null
          customer_id?: string | null
          due_date?: string | null
          fx_date: string
          fx_rate: number
          id?: string
          invoice_no: string
          is_fx_locked?: boolean | null
          issued_date?: string | null
          order_id?: string | null
          paid_iqd?: number | null
          paid_usd?: number | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
        }
        Update: {
          amount_iqd?: number
          amount_usd?: number
          created_at?: string | null
          currency_input?: string | null
          customer_id?: string | null
          due_date?: string | null
          fx_date?: string
          fx_rate?: number
          id?: string
          invoice_no?: string
          is_fx_locked?: boolean | null
          issued_date?: string | null
          order_id?: string | null
          paid_iqd?: number | null
          paid_usd?: number | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      month_close: {
        Row: {
          closed_at: string | null
          id: string
          month_yyyy_mm: string
          snapshot_json: Json | null
          status: Database["public"]["Enums"]["month_close_status"] | null
        }
        Insert: {
          closed_at?: string | null
          id?: string
          month_yyyy_mm: string
          snapshot_json?: Json | null
          status?: Database["public"]["Enums"]["month_close_status"] | null
        }
        Update: {
          closed_at?: string | null
          id?: string
          month_yyyy_mm?: string
          snapshot_json?: Json | null
          status?: Database["public"]["Enums"]["month_close_status"] | null
        }
        Relationships: []
      }
      order_costs: {
        Row: {
          amount_iqd: number
          amount_usd: number
          category: string | null
          created_at: string | null
          currency_input: string | null
          description: string | null
          due_date: string | null
          fx_date: string
          fx_rate: number
          id: string
          is_fx_locked: boolean | null
          order_id: string
          paid_status: string | null
          vendor_id: string | null
        }
        Insert: {
          amount_iqd: number
          amount_usd: number
          category?: string | null
          created_at?: string | null
          currency_input?: string | null
          description?: string | null
          due_date?: string | null
          fx_date: string
          fx_rate: number
          id?: string
          is_fx_locked?: boolean | null
          order_id: string
          paid_status?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount_iqd?: number
          amount_usd?: number
          category?: string | null
          created_at?: string | null
          currency_input?: string | null
          description?: string | null
          due_date?: string | null
          fx_date?: string
          fx_rate?: number
          id?: string
          is_fx_locked?: boolean | null
          order_id?: string
          paid_status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_costs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cargo_desc: string | null
          carrier_name: string | null
          carrier_type: string | null
          closed_at: string | null
          container_number: string | null
          container_type: string | null
          created_at: string | null
          customer_id: string | null
          destination_city: string | null
          destination_country: string | null
          direction: Database["public"]["Enums"]["direction_type"]
          equipment_size: string | null
          eta: string | null
          etd: string | null
          id: string
          incoterm: string | null
          mode: Database["public"]["Enums"]["transport_mode"]
          notes: string | null
          order_no: string
          origin_city: string | null
          origin_country: string | null
          packages: number | null
          responsible_employee_id: string | null
          seal_number: string | null
          status_step: number | null
          volume: number | null
          weight: number | null
        }
        Insert: {
          cargo_desc?: string | null
          carrier_name?: string | null
          carrier_type?: string | null
          closed_at?: string | null
          container_number?: string | null
          container_type?: string | null
          created_at?: string | null
          customer_id?: string | null
          destination_city?: string | null
          destination_country?: string | null
          direction: Database["public"]["Enums"]["direction_type"]
          equipment_size?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          incoterm?: string | null
          mode: Database["public"]["Enums"]["transport_mode"]
          notes?: string | null
          order_no: string
          origin_city?: string | null
          origin_country?: string | null
          packages?: number | null
          responsible_employee_id?: string | null
          seal_number?: string | null
          status_step?: number | null
          volume?: number | null
          weight?: number | null
        }
        Update: {
          cargo_desc?: string | null
          carrier_name?: string | null
          carrier_type?: string | null
          closed_at?: string | null
          container_number?: string | null
          container_type?: string | null
          created_at?: string | null
          customer_id?: string | null
          destination_city?: string | null
          destination_country?: string | null
          direction?: Database["public"]["Enums"]["direction_type"]
          equipment_size?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          incoterm?: string | null
          mode?: Database["public"]["Enums"]["transport_mode"]
          notes?: string | null
          order_no?: string
          origin_city?: string | null
          origin_country?: string | null
          packages?: number | null
          responsible_employee_id?: string | null
          seal_number?: string | null
          status_step?: number | null
          volume?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_responsible_employee_id_fkey"
            columns: ["responsible_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          commission_type: Database["public"]["Enums"]["commission_type"] | null
          company: string
          created_at: string | null
          id: string
          rate_value: number | null
          status: string | null
        }
        Insert: {
          commission_type?:
            | Database["public"]["Enums"]["commission_type"]
            | null
          company: string
          created_at?: string | null
          id?: string
          rate_value?: number | null
          status?: string | null
        }
        Update: {
          commission_type?:
            | Database["public"]["Enums"]["commission_type"]
            | null
          company?: string
          created_at?: string | null
          id?: string
          rate_value?: number | null
          status?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          currency: string | null
          iban: string | null
          id: string
          is_default: boolean | null
          method_type: string
          notes: string | null
          routing_number: string | null
          status: string | null
          swift_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          iban?: string | null
          id?: string
          is_default?: boolean | null
          method_type: string
          notes?: string | null
          routing_number?: string | null
          status?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          iban?: string | null
          id?: string
          is_default?: boolean | null
          method_type?: string
          notes?: string | null
          routing_number?: string | null
          status?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_reminder_history: {
        Row: {
          created_at: string | null
          date_sent: string | null
          id: string
          payment_reminder_id: string | null
          recipient_email: string | null
          status: string | null
          template_used: string | null
        }
        Insert: {
          created_at?: string | null
          date_sent?: string | null
          id?: string
          payment_reminder_id?: string | null
          recipient_email?: string | null
          status?: string | null
          template_used?: string | null
        }
        Update: {
          created_at?: string | null
          date_sent?: string | null
          id?: string
          payment_reminder_id?: string | null
          recipient_email?: string | null
          status?: string | null
          template_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminder_history_payment_reminder_id_fkey"
            columns: ["payment_reminder_id"]
            isOneToOne: false
            referencedRelation: "payment_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminder_settings: {
        Row: {
          created_at: string | null
          id: string
          reminder_1_days_before: number | null
          reminder_1_enabled: boolean | null
          reminder_2_days_before: number | null
          reminder_2_enabled: boolean | null
          reminder_3_days_after: number | null
          reminder_3_enabled: boolean | null
          reminder_4_days_after: number | null
          reminder_4_enabled: boolean | null
          reminder_5_days_after: number | null
          reminder_5_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reminder_1_days_before?: number | null
          reminder_1_enabled?: boolean | null
          reminder_2_days_before?: number | null
          reminder_2_enabled?: boolean | null
          reminder_3_days_after?: number | null
          reminder_3_enabled?: boolean | null
          reminder_4_days_after?: number | null
          reminder_4_enabled?: boolean | null
          reminder_5_days_after?: number | null
          reminder_5_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reminder_1_days_before?: number | null
          reminder_1_enabled?: boolean | null
          reminder_2_days_before?: number | null
          reminder_2_enabled?: boolean | null
          reminder_3_days_after?: number | null
          reminder_3_enabled?: boolean | null
          reminder_4_days_after?: number | null
          reminder_4_enabled?: boolean | null
          reminder_5_days_after?: number | null
          reminder_5_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_reminder_templates: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          subject: string | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          subject?: string | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          subject?: string | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_reminders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          days_overdue: number | null
          due_date: string | null
          id: string
          invoice_id: string | null
          last_reminder_sent: string | null
          next_reminder_scheduled: string | null
          reminder_count: number | null
          status: Database["public"]["Enums"]["reminder_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          days_overdue?: number | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          last_reminder_sent?: string | null
          next_reminder_scheduled?: string | null
          reminder_count?: number | null
          status?: Database["public"]["Enums"]["reminder_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          days_overdue?: number | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          last_reminder_sent?: string | null
          next_reminder_scheduled?: string | null
          reminder_count?: number | null
          status?: Database["public"]["Enums"]["reminder_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_iqd: number
          amount_usd: number
          counterparty_id: string | null
          created_at: string | null
          currency_input: string | null
          date: string
          direction: Database["public"]["Enums"]["payment_direction"]
          fx_date: string
          fx_gain_loss_iqd: number | null
          fx_gain_loss_usd: number | null
          fx_rate: number
          id: string
          is_fx_locked: boolean | null
          method: string | null
          notes: string | null
          order_id: string | null
          pay_currency: string | null
          pay_no: string
          payment_method_id: string | null
          ref_id: string | null
          ref_type: Database["public"]["Enums"]["payment_ref_type"]
          reference: string | null
        }
        Insert: {
          amount_iqd: number
          amount_usd: number
          counterparty_id?: string | null
          created_at?: string | null
          currency_input?: string | null
          date: string
          direction: Database["public"]["Enums"]["payment_direction"]
          fx_date: string
          fx_gain_loss_iqd?: number | null
          fx_gain_loss_usd?: number | null
          fx_rate: number
          id?: string
          is_fx_locked?: boolean | null
          method?: string | null
          notes?: string | null
          order_id?: string | null
          pay_currency?: string | null
          pay_no: string
          payment_method_id?: string | null
          ref_id?: string | null
          ref_type: Database["public"]["Enums"]["payment_ref_type"]
          reference?: string | null
        }
        Update: {
          amount_iqd?: number
          amount_usd?: number
          counterparty_id?: string | null
          created_at?: string | null
          currency_input?: string | null
          date?: string
          direction?: Database["public"]["Enums"]["payment_direction"]
          fx_date?: string
          fx_gain_loss_iqd?: number | null
          fx_gain_loss_usd?: number | null
          fx_rate?: number
          id?: string
          is_fx_locked?: boolean | null
          method?: string | null
          notes?: string | null
          order_id?: string | null
          pay_currency?: string | null
          pay_no?: string
          payment_method_id?: string | null
          ref_id?: string | null
          ref_type?: Database["public"]["Enums"]["payment_ref_type"]
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_payment_terms: {
        Row: {
          amount_iqd: number | null
          amount_usd: number | null
          currency: string | null
          description: string | null
          id: string
          percentage: number | null
          quotation_id: string
        }
        Insert: {
          amount_iqd?: number | null
          amount_usd?: number | null
          currency?: string | null
          description?: string | null
          id?: string
          percentage?: number | null
          quotation_id: string
        }
        Update: {
          amount_iqd?: number | null
          amount_usd?: number | null
          currency?: string | null
          description?: string | null
          id?: string
          percentage?: number | null
          quotation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_payment_terms_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_services: {
        Row: {
          fx_date: string | null
          fx_rate: number | null
          id: string
          margin_pct: number | null
          quotation_id: string
          quoted_price_iqd: number | null
          quoted_price_usd: number | null
          service_fee_iqd: number | null
          service_fee_usd: number | null
          service_name: string
          vendor_cost_iqd: number | null
          vendor_cost_usd: number | null
        }
        Insert: {
          fx_date?: string | null
          fx_rate?: number | null
          id?: string
          margin_pct?: number | null
          quotation_id: string
          quoted_price_iqd?: number | null
          quoted_price_usd?: number | null
          service_fee_iqd?: number | null
          service_fee_usd?: number | null
          service_name: string
          vendor_cost_iqd?: number | null
          vendor_cost_usd?: number | null
        }
        Update: {
          fx_date?: string | null
          fx_rate?: number | null
          id?: string
          margin_pct?: number | null
          quotation_id?: string
          quoted_price_iqd?: number | null
          quoted_price_usd?: number | null
          service_fee_iqd?: number | null
          service_fee_usd?: number | null
          service_name?: string
          vendor_cost_iqd?: number | null
          vendor_cost_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_services_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_templates: {
        Row: {
          company_logo_url: string | null
          company_slogan: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          is_standard: boolean | null
          template_file_url: string | null
          template_name: string
        }
        Insert: {
          company_logo_url?: string | null
          company_slogan?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_standard?: boolean | null
          template_file_url?: string | null
          template_name: string
        }
        Update: {
          company_logo_url?: string | null
          company_slogan?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_standard?: boolean | null
          template_file_url?: string | null
          template_name?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          approved_at: string | null
          created_at: string | null
          currency_input: string | null
          fx_date: string | null
          fx_rate: number | null
          id: string
          is_fx_locked: boolean | null
          margin_pct: number | null
          order_id: string | null
          pdf_url: string | null
          quotation_description: string | null
          quote_no: string
          service_fee_iqd: number | null
          service_fee_usd: number | null
          signed_pdf_url: string | null
          status: Database["public"]["Enums"]["quotation_status"] | null
          template_id: string | null
          total_iqd: number | null
          total_usd: number | null
          validity_days: number | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          currency_input?: string | null
          fx_date?: string | null
          fx_rate?: number | null
          id?: string
          is_fx_locked?: boolean | null
          margin_pct?: number | null
          order_id?: string | null
          pdf_url?: string | null
          quotation_description?: string | null
          quote_no: string
          service_fee_iqd?: number | null
          service_fee_usd?: number | null
          signed_pdf_url?: string | null
          status?: Database["public"]["Enums"]["quotation_status"] | null
          template_id?: string | null
          total_iqd?: number | null
          total_usd?: number | null
          validity_days?: number | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          currency_input?: string | null
          fx_date?: string | null
          fx_rate?: number | null
          id?: string
          is_fx_locked?: boolean | null
          margin_pct?: number | null
          order_id?: string | null
          pdf_url?: string | null
          quotation_description?: string | null
          quote_no?: string
          service_fee_iqd?: number | null
          service_fee_usd?: number | null
          signed_pdf_url?: string | null
          status?: Database["public"]["Enums"]["quotation_status"] | null
          template_id?: string | null
          total_iqd?: number | null
          total_usd?: number | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quotation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_bills: {
        Row: {
          amount_iqd: number
          amount_usd: number
          bill_no: string
          created_at: string | null
          currency_input: string | null
          due_date: string | null
          fx_date: string
          fx_rate: number
          id: string
          is_fx_locked: boolean | null
          issued_date: string | null
          order_id: string | null
          paid_iqd: number | null
          paid_usd: number | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["bill_status"] | null
          vendor_id: string | null
        }
        Insert: {
          amount_iqd: number
          amount_usd: number
          bill_no: string
          created_at?: string | null
          currency_input?: string | null
          due_date?: string | null
          fx_date: string
          fx_rate: number
          id?: string
          is_fx_locked?: boolean | null
          issued_date?: string | null
          order_id?: string | null
          paid_iqd?: number | null
          paid_usd?: number | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["bill_status"] | null
          vendor_id?: string | null
        }
        Update: {
          amount_iqd?: number
          amount_usd?: number
          bill_no?: string
          created_at?: string | null
          currency_input?: string | null
          due_date?: string | null
          fx_date?: string
          fx_rate?: number
          id?: string
          is_fx_locked?: boolean | null
          issued_date?: string | null
          order_id?: string | null
          paid_iqd?: number | null
          paid_usd?: number | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["bill_status"] | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          city: string | null
          company: string
          created_at: string | null
          email: string | null
          id: string
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          rating: number | null
          type: string | null
        }
        Insert: {
          city?: string | null
          company: string
          created_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          rating?: number | null
          type?: string | null
        }
        Update: {
          city?: string | null
          company?: string
          created_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          rating?: number | null
          type?: string | null
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
      app_role: "admin" | "manager" | "user" | "viewer"
      bill_status: "draft" | "issued" | "partial" | "paid"
      commission_rule: "on_payment" | "on_close"
      commission_status: "accrued" | "approved" | "paid"
      commission_type: "pct" | "fixed"
      direction_type: "import" | "export"
      exchange_rate_status: "Active" | "Inactive"
      invoice_status: "draft" | "issued" | "partial" | "paid"
      month_close_status: "open" | "locked" | "closed"
      payment_direction: "AR" | "AP"
      payment_ref_type: "invoice" | "bill"
      quotation_status: "draft" | "sent" | "approved" | "rejected"
      reminder_status: "pending" | "sent" | "escalated" | "resolved"
      transport_mode: "sea" | "air" | "road" | "rail"
      update_frequency: "Hourly" | "Daily" | "Weekly"
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
      app_role: ["admin", "manager", "user", "viewer"],
      bill_status: ["draft", "issued", "partial", "paid"],
      commission_rule: ["on_payment", "on_close"],
      commission_status: ["accrued", "approved", "paid"],
      commission_type: ["pct", "fixed"],
      direction_type: ["import", "export"],
      exchange_rate_status: ["Active", "Inactive"],
      invoice_status: ["draft", "issued", "partial", "paid"],
      month_close_status: ["open", "locked", "closed"],
      payment_direction: ["AR", "AP"],
      payment_ref_type: ["invoice", "bill"],
      quotation_status: ["draft", "sent", "approved", "rejected"],
      reminder_status: ["pending", "sent", "escalated", "resolved"],
      transport_mode: ["sea", "air", "road", "rail"],
      update_frequency: ["Hourly", "Daily", "Weekly"],
    },
  },
} as const
