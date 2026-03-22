import { NextResponse } from 'next/server';

/** Placeholder for Programmable Voice transfer (dial staff, conference, etc.). */
export async function POST() {
  return NextResponse.json(
    { error: 'not_implemented', message: 'Call transfer will return TwiML once wired to your voice flow.' },
    { status: 501 }
  );
}
