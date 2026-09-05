import { issueSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  return issueSession('/api/v1/auth/bootstrap', await req.text(), { okStatus: 201 });
}
