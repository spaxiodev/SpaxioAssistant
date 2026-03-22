/**
 * IMAP / Custom mailbox provider module.
 *
 * Supports:
 * - Sending email via SMTP (using nodemailer)
 * - Testing SMTP connectivity (nodemailer verify)
 * - Testing IMAP connectivity (raw TLS/TCP connection check)
 * - Validating stored connection
 *
 * Passwords are stored AES-256-GCM encrypted in config_json.
 * They are decrypted server-side only and never logged.
 */

import nodemailer from 'nodemailer';
import * as tls from 'tls';
import * as net from 'net';
import { decryptSecret, encryptSecret } from '@/lib/security/secrets';
import type { SendEmailPayload, SendEmailResult, ValidateConnectionResult, ProviderRecord } from './types';

export interface ImapConfig {
  /** Email address used for authentication and as the "From" address. */
  email: string;
  /** Optional "From" display name (e.g. "Support Team"). */
  from_name?: string | null;
  /** AES-256-GCM encrypted password (app password for Gmail/Outlook IMAP). */
  password_enc: string;
  /** IMAP server hostname. */
  imap_host: string;
  /** IMAP port (typically 993 for TLS, 143 for STARTTLS). */
  imap_port: number;
  /** True = implicit TLS (port 993). False = plain/STARTTLS (port 143). */
  imap_secure: boolean;
  /** SMTP server hostname. */
  smtp_host: string;
  /** SMTP port (typically 465 for SSL, 587 for STARTTLS, 25 for plain). */
  smtp_port: number;
  /** True = implicit TLS (port 465). False = STARTTLS/plain (port 587/25). */
  smtp_secure: boolean;
}

/** Credential input for building/saving the IMAP config (plaintext password). */
export interface ImapCredentials {
  email: string;
  from_name?: string | null;
  password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
}

function extractConfig(provider: ProviderRecord): ImapConfig {
  const c = provider.config_json as ImapConfig | null;
  if (!c?.email || !c?.password_enc || !c?.smtp_host) {
    throw new Error('IMAP provider is missing credential configuration. Please reconfigure.');
  }
  return c;
}

/**
 * Builds a config_json object with the password encrypted.
 * Call this before inserting/updating an email_providers row.
 */
export function buildImapConfig(creds: ImapCredentials): ImapConfig {
  return {
    email: creds.email,
    from_name: creds.from_name ?? null,
    password_enc: encryptSecret(creds.password),
    imap_host: creds.imap_host,
    imap_port: creds.imap_port,
    imap_secure: creds.imap_secure,
    smtp_host: creds.smtp_host,
    smtp_port: creds.smtp_port,
    smtp_secure: creds.smtp_secure,
  };
}

/** Tests an SMTP connection (authentication included). */
export async function testSmtpConnection(creds: {
  host: string;
  port: number;
  secure: boolean;
  email: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const transporter = nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.email, pass: creds.password },
    connectionTimeout: 12000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: { rejectUnauthorized: false }, // allow self-signed certs in test
  });

  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP verification failed';
    // Strip any credential echoes from error message
    const safe = message.replace(/pass(?:word)?[^\s]*/gi, '***').replace(/auth[^\s]*/gi, '***');
    return { ok: false, error: safe };
  } finally {
    transporter.close();
  }
}

/** Tests basic TCP/TLS connectivity to an IMAP server (no authentication). */
export async function testImapConnectivity(params: {
  host: string;
  port: number;
  secure: boolean;
  timeoutMs?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const timeout = params.timeoutMs ?? 10000;

  return new Promise((resolve) => {
    let settled = false;

    function finish(ok: boolean, error?: string) {
      if (settled) return;
      settled = true;
      resolve({ ok, error });
    }

    try {
      if (params.secure) {
        const socket = tls.connect(
          { host: params.host, port: params.port, rejectUnauthorized: false },
          () => {
            socket.destroy();
            finish(true);
          }
        );
        socket.setTimeout(timeout, () => {
          socket.destroy();
          finish(false, `IMAP connection timed out (${params.host}:${params.port})`);
        });
        socket.on('error', (err: Error) => finish(false, `IMAP connection error: ${err.message}`));
      } else {
        const socket = net.connect({ host: params.host, port: params.port }, () => {
          socket.destroy();
          finish(true);
        });
        socket.setTimeout(timeout, () => {
          socket.destroy();
          finish(false, `IMAP connection timed out (${params.host}:${params.port})`);
        });
        socket.on('error', (err: Error) => finish(false, `IMAP connection error: ${err.message}`));
      }
    } catch (err) {
      finish(false, err instanceof Error ? err.message : 'IMAP connect failed');
    }
  });
}

/** Sends an email via SMTP using the stored (encrypted) credentials. */
export async function sendViaSmtp(
  provider: ProviderRecord,
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  try {
    const config = extractConfig(provider);
    const password = decryptSecret(config.password_enc);

    const fromAddress = config.from_name
      ? `"${config.from_name.replace(/"/g, '')}" <${config.email}>`
      : config.email;

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: { user: config.email, pass: password },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: { rejectUnauthorized: true },
    });

    const toAddress = payload.toName
      ? `"${payload.toName.replace(/"/g, '')}" <${payload.to}>`
      : payload.to;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? undefined,
      headers: {
        'X-Auto-Response-Suppress': 'All',
        'Auto-Submitted': 'auto-replied',
        ...(payload.inReplyTo ? { 'In-Reply-To': payload.inReplyTo } : {}),
        ...(payload.references?.length
          ? { References: payload.references.filter(Boolean).join(' ') }
          : {}),
      },
    });

    transporter.close();
    return { success: true, messageId: info.messageId ?? null, provider: 'imap' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP send failed';
    // Scrub any potential credential leaks
    const safe = message.replace(/pass(?:word)?[^\s]*/gi, '***').replace(/auth[^\s]*/gi, '***');
    return { success: false, error: safe, provider: 'imap' };
  }
}

/** Validates the stored IMAP/SMTP connection (SMTP auth test). */
export async function validateImapConnection(provider: ProviderRecord): Promise<ValidateConnectionResult> {
  try {
    const config = extractConfig(provider);
    const password = decryptSecret(config.password_enc);

    const smtpResult = await testSmtpConnection({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      email: config.email,
      password,
    });

    if (!smtpResult.ok) {
      return { ok: false, error: smtpResult.error };
    }

    return { ok: true, email: config.email, name: config.from_name ?? undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'IMAP/SMTP validation failed',
    };
  }
}
