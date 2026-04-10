import { NextRequest } from 'next/server';
import { proxyHandler } from '@/lib/proxy/handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  return proxyHandler({
    source: 'birdeye',
    endpoint: `/defi/token_overview`,
    params: { address },
    cache: { ttl: 60 },
  }, request);
}
