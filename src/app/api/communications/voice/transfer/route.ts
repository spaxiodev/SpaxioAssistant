import { NextResponse } from 'next/server';

/** Placeholder for Programmable Voice transfer (dial staff, conference, etc.). */
export async function POST() {
  return NextResponse.json(
    { error: 'not_implemented', message: 'Call transfer is not implemented yet.' },
    { status: 501 }
  );
}
