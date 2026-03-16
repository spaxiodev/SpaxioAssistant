/**
 * Supabase database types.
 * Regenerate with: npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string;
          slug: string;
          name: string;
          stripe_price_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      plan_entitlements: {
        Row: {
          id: string;
          plan_id: string;
          entitlement_key: string;
          value: Json;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      automations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: string;
          trigger_type: string;
          trigger_config: Json;
          action_type: string;
          action_config: Json;
          agent_id: string | null;
          template_key: string | null;
          webhook_token: string | null;
          webhook_secret: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          message: string | null;
          transcript_snippet: string | null;
          requested_service: string | null;
          requested_timeline: string | null;
          project_details: string | null;
          location: string | null;
          created_at: string;
          qualification_score: number | null;
          qualification_priority: string | null;
          qualification_summary: string | null;
          qualification_raw: Record<string, unknown> | null;
          qualified_at: string | null;
          recommended_deal_stage: string | null;
          estimated_deal_value: number | null;
          next_recommended_action: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      quote_requests: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string | null;
          customer_name: string;
          service_type: string | null;
          project_details: string | null;
          dimensions_size: string | null;
          location: string | null;
          notes: string | null;
          budget_text: string | null;
          budget_amount: number | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      business_settings: {
        Row: {
          id: string;
          organization_id: string;
          business_name: string | null;
          industry: string | null;
          company_description: string | null;
          services_offered: string[] | null;
          pricing_notes: string | null;
          faq: Json;
          tone_of_voice: string | null;
          contact_email: string | null;
          phone: string | null;
          lead_notification_email: string | null;
          primary_brand_color: string | null;
          chatbot_welcome_message: string | null;
          chatbot_name: string | null;
          widget_logo_url: string | null;
          widget_enabled: boolean;
          webhook_secret: string | null;
          service_base_prices: Json | null;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      agents: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          role_type: string;
          system_prompt: string | null;
          model_provider: string;
          model_id: string;
          temperature: number;
          enabled_tools: string[] | null;
          widget_enabled: boolean;
          webhook_enabled: boolean;
          memory_short_term_enabled: boolean;
          memory_long_term_enabled: boolean;
          created_by_ai_setup?: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Automation = Database['public']['Tables']['automations']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];
export type QuoteRequest = Database['public']['Tables']['quote_requests']['Row'];
export type BusinessSettings = Database['public']['Tables']['business_settings']['Row'];
export type Agent = Database['public']['Tables']['agents']['Row'];
