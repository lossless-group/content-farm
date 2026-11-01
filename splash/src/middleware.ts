import { defineMiddleware } from 'astro:middleware';
import { corpusIsDegraded } from '@loaders/corpus';

// Pages render per request, so the CDN is what keeps them fast. It serves a page
// for a minute, then keeps serving it while it fetches a fresh copy behind the
// scenes. A page built while GitHub was failing is never cached, so an outage
// can't outlive itself.
const CACHED = 'public, max-age=0, s-maxage=60, stale-while-revalidate=3600';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (context.request.method === 'GET' && response.status === 200 && !response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', corpusIsDegraded() ? 'no-store' : CACHED);
  }
  return response;
});
