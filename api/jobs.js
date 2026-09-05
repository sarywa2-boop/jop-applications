export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || 'sa';
  const query = typeof request.query.q === 'string' ? request.query.q : 'administrative assistant';
  if (!appId || !appKey) {
    return response.status(503).json({ error: 'Jobs provider is not configured', message: 'Add ADZUNA_APP_ID and ADZUNA_APP_KEY to Vercel environment variables.' });
  }
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set('app_id', appId);
  url.searchParams.set('app_key', appKey);
  url.searchParams.set('results_per_page', '25');
  url.searchParams.set('what', query);
  url.searchParams.set('content-type', 'application/json');
  const upstream = await fetch(url);
  if (!upstream.ok) return response.status(502).json({ error: 'Jobs provider request failed' });
  const data = await upstream.json();
  return response.status(200).json({ source: 'Adzuna', fetchedAt: new Date().toISOString(), jobs: (data.results || []).map(job => ({ id: job.id, title: job.title, company: job.company?.display_name || '', location: job.location?.display_name || '', url: job.redirect_url, description: job.description || '', postedAt: job.created })) });
}
