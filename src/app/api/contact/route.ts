import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getClientIp } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

const CONTACT_EMAIL = 'polidorispaxio@gmail.com';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function sanitize(s: unknown, max = 2000): string {
  if (s == null) return '';
  return String(s).slice(0, max);
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed } = rateLimit({
      key: `contact:${ip}`,
      limit: 5,
      windowMs: 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = sanitize(body.name, 255).trim();
    const email = sanitize(body.email, 255).trim();
    const subject = sanitize(body.subject, 200).trim();
    const message = sanitize(body.message).trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const resend = getResend();
    if (resend) {
      const from = process.env.RESEND_FROM_EMAIL || 'Spaxio Assistant <onboarding@resend.dev>';
      const subjectLine = subject
        ? `[Spaxio Contact] ${subject}`
        : `[Spaxio Contact] Message from ${name}`;
      await resend.emails.send({
        from,
        to: [CONTACT_EMAIL],
        replyTo: email,
        subject: subjectLine,
        text: `Name: ${name}\nEmail: ${email}\n\nSubject: ${subject || '(none)'}\n\nMessage:\n${message}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to send message. Please try again or email us directly.' },
      { status: 500 }
    );
  }
}
