export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string | null;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          role?: 'owner' | 'admin' | 'member';
        };
      };
      business_settings: {
        Row: {
          id: string;
          organization_id: string;
          business_name: string | null;
          industry: string | null;
          company_description: string | null;
          services_offered: string[];
          pricing_notes: string | null;
          faq: Json;
          tone_of_voice: string | null;
          contact_email: string | null;
          phone: string | null;
          lead_notification_email: string | null;
          primary_brand_color: string | null;
          chatbot_name: string | null;
          chatbot_welcome_message: string | null;
          widget_logo_url: string | null;
          widget_label_override: string | null;
          show_widget_label: boolean;
          widget_enabled: boolean;
          widget_position_preset: string;
          widget_position_bottom: number;
          widget_position_right: number;
          faq_page_url: string | null;
          service_base_prices: Record<string, number>; // service_type -> minimum price for "worth it"
          website_url: string | null;
          website_learned_content: string | null;
          website_learned_at: string | null;
          last_learn_attempt_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          business_name?: string | null;
          industry?: string | null;
          company_description?: string | null;
          services_offered?: string[];
          pricing_notes?: string | null;
          faq?: Json;
          tone_of_voice?: string | null;
          contact_email?: string | null;
          phone?: string | null;
          lead_notification_email?: string | null;
          primary_brand_color?: string | null;
          chatbot_name?: string | null;
          chatbot_welcome_message?: string | null;
          widget_logo_url?: string | null;
          widget_label_override?: string | null;
          show_widget_label?: boolean;
          widget_enabled?: boolean;
          widget_position_preset?: string;
          widget_position_bottom?: number;
          widget_position_right?: number;
          faq_page_url?: string | null;
          service_base_prices?: Record<string, number>;
          website_url?: string | null;
          website_learned_content?: string | null;
          website_learned_at?: string | null;
          last_learn_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['business_settings']['Insert']> & { organization_id?: string };
      };
      widgets: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          status: string;
          trial_ends_at: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          status?: string;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          status?: string;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          widget_id: string;
          visitor_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          widget_id: string;
          visitor_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          visitor_id?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
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
        };
        Insert: {
          organization_id: string;
          conversation_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          message?: string | null;
          transcript_snippet?: string | null;
          requested_service?: string | null;
          requested_timeline?: string | null;
          project_details?: string | null;
          location?: string | null;
          created_at?: string;
        };
        Update: never;
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
        Insert: {
          organization_id: string;
          conversation_id?: string | null;
          customer_name: string;
          service_type?: string | null;
          project_details?: string | null;
          dimensions_size?: string | null;
          location?: string | null;
          notes?: string | null;
          budget_text?: string | null;
          budget_amount?: number | null;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row'];
export type BusinessSettings = Database['public']['Tables']['business_settings']['Row'];
export type Widget = Database['public']['Tables']['widgets']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];
export type QuoteRequest = Database['public']['Tables']['quote_requests']['Row'];
