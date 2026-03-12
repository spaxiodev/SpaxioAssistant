import { NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Log an error and return a safe JSON response for API routes.
 * Never exposes stack traces or internal details in production.
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;

  if (context) {
    console.error(`[API Error] ${context}:`, message);
  } else {
    console.error('[API Error]:', message);
  }
  if (stack && isDev) {
    console.error(stack);
  }

  const status = 500;
  const body: { error: string } = {
    error: isDev ? message : 'An unexpected error occurred. Please try again.',
  };
  return NextResponse.json(body, { status });
}

/**
 * Wrap an API handler with try/catch and return safe 500 on thrown errors.
 * Use for route handlers that don't already have top-level try/catch.
 */
export function withErrorHandler<T extends Request>(
  handler: (request: T) => Promise<NextResponse>,
  context: string
): (request: T) => Promise<NextResponse> {
  return async (request: T) => {
    try {
      return await handler(request);
    } catch (err) {
      return handleApiError(err, context);
    }
  };
}
