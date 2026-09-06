const track = (title = '', description = '') => /media|content|producer|editor|journal|broadcast|video|social|marketing|محتوى|إعلام|إنتاج|محرر|تسويق/i.test(`${title} ${description}`) ? { cv: 'Moh Resume Media.pdf', attachments: ['Moh Resume Media.pdf', 'Portfolio-Mohammed Alsary.pptx'] } : { cv: 'Mohammed_ALOOQ_CV.pdf', attachments: ['Mohammed_ALOOQ_CV.pdf'] };
const json = (res, status, body) => res.status(status).json(body);
async function searchAdzuna(query) {
  const { ADZUNA_APP_ID, ADZUNA_APP_KEY, ADZUNA_COUNTRY = 'sa' } = process.env;
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1`);
  url.searchParams.set('app_id', ADZUNA_APP_ID); url.searchParams.set('app_key', ADZUNA_APP_KEY); url.searchParams.set('results_per_page', '20'); url.searchParams.set('what', query);
  const r = await fetch(url); if (!r.ok) throw new Error('Adzuna search failed'); const data = await r.json();
  return (data.results || []).map(j => ({ title: j.title || '', company: j.company?.display_name || '', location: j.location?.display_name || '', url: j.redirect_url || '', description: j.description || '', source: 'Adzuna', postedAt: j.created || null }));
}
async function searchGoogle(query) {
  const { GOOGLE_CSE_KEY, GOOGLE_CSE_ID } = process.env; if (!GOOGLE_CSE_KEY || !GOOGLE_CSE_ID) return [];
  const url = new URL('https://www.googleapis.com/customsearch/v1'); url.searchParams.set('key', GOOGLE_CSE_KEY); url.searchParams.set('cx', GOOGLE_CSE_ID); url.searchParams.set('q', `${query} Saudi Arabia hiring email CV`); url.searchParams.set('num', '10');
  const r = await fetch(url); if (!r.ok) throw new Error('Google search failed'); const data = await r.json();
  return (data.items || []).map(i => ({ title: i.title || '', company: '', location: 'Saudi Arabia / Middle East', url: i.link || '', description: i.snippet || '', source: 'Google Programmable Search', postedAt: null }));
}
async function searchTavily(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const r = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ query: `${query} Saudi Arabia jobs`, search_depth: 'basic', topic: 'general', max_results: 10, include_answer: false, include_raw_content: false }) });
  if (!r.ok) throw new Error('Tavily search failed');
  const data = await r.json();
  return (data.results || []).map(i => ({ title: i.title || '', company: '', location: 'Saudi Arabia / Middle East', url: i.url || '', description: i.content || '', source: 'Tavily', postedAt: i.published_date || null }));
}
async function analyze(jobs) {
  if (!process.env.OPENAI_API_KEY) return jobs.map(j => ({ ...j, ...track(j.title, j.description), matchScore: 0, email: null }));
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Return JSON only: {"jobs":[{"index":0,"matchScore":0,"reason":"","email":null}]}. Use only emails explicitly in supplied text. Never invent emails.' }, { role: 'user', content: JSON.stringify({ profile: 'Mohammed AlSari: administration, operations, media and content; Saudi Arabia', jobs }) }] }) });
  if (!r.ok) throw new Error('OpenAI analysis failed'); const data = await r.json(); const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{"jobs":[]}');
  return jobs.map((j, index) => { const a = parsed.jobs?.find(x => x.index === index) || {}; return { ...j, ...track(j.title, j.description), matchScore: Number(a.matchScore) || 0, reason: typeof a.reason === 'string' ? a.reason : '', email: typeof a.email === 'string' ? a.email : null }; });
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try { const query = typeof req.body?.query === 'string' && req.body.query.trim() ? req.body.query.trim() : 'administrative assistant OR content producer'; const results = await Promise.allSettled([searchAdzuna(query), searchGoogle(query), searchTavily(query)]); const warnings = results.filter(r => r.status === 'rejected').map(r => r.reason instanceof Error ? r.reason.message : 'Search source failed'); const jobs = await analyze(results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)); return json(res, 200, { fetchedAt: new Date().toISOString(), jobs: jobs.filter(j => j.matchScore >= 60 || !process.env.OPENAI_API_KEY).slice(0, 20), sourceWarnings: warnings, requiresApprovalBeforeSend: true, maxDailyMessages: 20 }); } catch (error) { return json(res, 502, { error: error instanceof Error ? error.message : 'Amir search failed' }); }
}



