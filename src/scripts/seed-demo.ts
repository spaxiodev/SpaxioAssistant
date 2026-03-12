/**
 * Demo seed: landscaping company.
 * Run with: npm run db:seed
 * Requires SUPABASE_SERVICE_ROLE_KEY. Creates or updates business_settings for the first organization.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function seed() {
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) {
    console.log('No organization found. Sign up first to create an org, then run seed again.');
    return;
  }

  const { error: settingsError } = await supabase
    .from('business_settings')
    .upsert(
      {
        organization_id: org.id,
        business_name: 'GreenScape Landscaping',
        industry: 'Landscaping',
        company_description:
          'GreenScape Landscaping provides lawn care, garden design, tree trimming, and hardscaping services for residential and commercial clients in the greater metro area. Family-owned since 2010.',
        services_offered: [
          'Lawn mowing and maintenance',
          'Garden design and installation',
          'Tree and shrub trimming',
          'Mulching and edging',
          'Seasonal cleanup',
          'Hardscaping (patios, walkways)',
          'Irrigation and drainage',
        ],
        pricing_notes:
          'Pricing depends on property size and scope. We offer free estimates. Seasonal contracts available for lawn care.',
        faq: [
          {
            question: 'Do you offer free estimates?',
            answer: 'Yes, we provide free estimates for all projects.',
          },
          {
            question: 'What areas do you serve?',
            answer: 'We serve the greater metro area within about 30 miles.',
          },
          {
            question: 'Are you licensed and insured?',
            answer: 'Yes, we are fully licensed and insured for your peace of mind.',
          },
          {
            question: 'When is the best time to start a new lawn or garden project?',
            answer: 'Spring and fall are ideal for most planting and design work. We can schedule a consultation anytime.',
          },
        ],
        tone_of_voice: 'friendly and professional',
        contact_email: 'hello@greenscapelandscaping.com',
        phone: '+1 (555) 123-4567',
        lead_notification_email: 'leads@greenscapelandscaping.com',
        primary_brand_color: '#166534',
        chatbot_welcome_message:
          "Hi! I'm here to help with any questions about our landscaping services—lawn care, garden design, tree work, and more. How can I help you today?",
      },
      { onConflict: 'organization_id' }
    );

  if (settingsError) {
    console.error('business_settings upsert error:', settingsError);
    return;
  }

  const { data: widget } = await supabase
    .from('widgets')
    .select('id')
    .eq('organization_id', org.id)
    .limit(1)
    .single();

  if (widget) {
    await supabase.from('conversations').insert({
      widget_id: widget.id,
      visitor_id: 'demo-visitor-1',
      metadata: {},
    }).select('id').single().then(({ data: conv }) => {
      if (conv) {
        supabase.from('messages').insert([
          { conversation_id: conv.id, role: 'user', content: 'Do you do seasonal lawn care?' },
          {
            conversation_id: conv.id,
            role: 'assistant',
            content:
              'Yes! We offer seasonal lawn care contracts including mowing, edging, and basic maintenance. Would you like a free estimate?',
          },
        ]);
      }
    });

    await supabase.from('leads').insert({
      organization_id: org.id,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1 (555) 987-6543',
      message: 'Interested in a quote for backyard garden design.',
      requested_service: 'Garden design and installation',
      transcript_snippet: 'User asked about garden design...',
    });

    await supabase.from('quote_requests').insert({
      organization_id: org.id,
      customer_name: 'Bob Wilson',
      service_type: 'Lawn mowing and maintenance',
      project_details: 'Weekly mowing, ~0.5 acre residential',
      location: '123 Oak St',
      notes: 'Prefers Thursday mornings',
    });
  }

  console.log('Demo seed done. Organization:', org.id);
}

seed();
