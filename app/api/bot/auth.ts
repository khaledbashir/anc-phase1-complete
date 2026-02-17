import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.BOT_API_TOKEN;

export function validateBotToken(req: NextRequest): NextResponse | null {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'BOT_API_TOKEN not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${BOT_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // Auth OK
}
