import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ history: [], retention: 'Reports are stored in your browser and available as JSON exports.' }); }
