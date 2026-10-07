import { createHash } from 'node:crypto';

const json = (response, status, body) => response.status(status).json(body);
const getText = (value) => typeof value === 'string' ? value.trim() : '';
const normalize = (value) => getText(value).toLowerCase();

const roleKeywords = {
  administration: [
    'administrative assistant', 'admin assistant', 'office assistant', 'executive assistant',
    'administrative coordinator', 'operations coordinator', 'office manager', 'administrator',
    'operations assistant', 'project coordinator', 'مسؤول إداري', 'مساعد إداري', 'منسق إداري',
    'منسق عمليات', 'مدير مكتب', 'سكرتير', 'منسق مشاريع'
  ],
  media: [
    'content producer', 'content creator', 'content specialist', 'content writer',
    'video producer', 'producer', 'editor', 'journalist', 'media coordinator',
    'social media', 'كاتب محتوى', 'منتج محتوى', 'منتج', 'محرر', 'صحفي',
    'منسق إعلامي', 'إعلام', 'إنتاج'
  ]
};

const classifyRole = (title, description = '') => {
  const text = normalize(`${title} ${description}`);
  const media = roleKeywords.media.some((keyword) => text.includes(keyword));
  return media
    ? { track: 'media', cv: 'Moh Resume Media.pdf', attachments: ['Moh Resume Media.pdf', 'Portfolio-Mohammed Alsary.pptx'] }
    : { track: 'administration', cv: 'Mohammed_ALOOQ_CV.pdf', attachments: ['Mohammed_ALOOQ_CV.pdf'] };
};

const scoreJob = (job) => {
  const title = normalize(job.title);
  const description = normalize(job.description);
  const track = classifyRole(job.title, job.description).track;
  const keywords = roleKeywords[track];
  const titleMatches = keywords.filter((keyword) => title.includes(keyword));
  const descriptionMatches = keywords.filter((keyword) => description.includes(keyword));
  const locationText = normalize(`${job.location} ${job.description}`);
  const inSaudiArabia = /saudi arabia|riyadh|jeddah|dammam|khobar|الرياض|جدة|الدمام|الخبر|السعودية/.test(locationText);
  const remote = /remote|م\\u0646\\s?\\u0628\\u0639\\u062f/.test(locationText);
  const score = Math.min(
    95,
    25 + Math.min(titleMatches.length, 2) * 24 +
      Math.min(descriptionMatches.length, 3) * 4 +
      (inSaudiArabia ? 12 : 0) +
      (remote ? 4 : 0)
  );
  return {
    ...job,
    ...classifyRole(job.title, job.description),
    matchScore: score,
    reason: titleMatches.length
      ? `مطابقة مبدئية بالكلمات المفتاحية: ${titleMatches.slice(0, 2).join('، ')}${inSaudiArabia ? ' · الموقع في السعودية' : ''}.`
      : 'مطابقة أولية حسب مسار الوظيفة والموقع؛ راجع تفاصيل الإعلان يدويًا.',
    email: null
  };
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  return response.json();
};

const searchAdzuna = async (query) => {
  const { ADZUNA_APP_ID, ADZUNA_APP_KEY, ADZUNA_COUNTRY = 'sa' } = process.env;
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1`);
  url.searchParams.set('app_id', ADZUNA_APP_ID);
  url.searchParams.set('app_key', ADZUNA_APP_KEY);
  url.searchParams.set('results_per_page', '20');
  url.searchParams.set('what', query);
  const data = await fetchJson(url);
  return (data.results || []).map((job) => ({
    title: job.title || '',
    company: job.company?.display_name || '',
    location: job.location?.display_name || '',
    url: job.redirect_url || '',
    description: job.description || '',
    source: 'Adzuna',
    postedAt: job.created || null
  }));
};

const searchGoogle = async (query) => {
  const { GOOGLE_CSE_KEY, GOOGLE_CSE_ID = '975f68497748d4a95' } = process.env;
  if (!GOOGLE_CSE_KEY || !GOOGLE_CSE_ID) return [];
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_CSE_KEY);
  url.searchParams.set('cx', GOOGLE_CSE_ID);
  url.searchParams.set('q', `${query} Saudi Arabia hiring`);
  url.searchParams.set('num', '10');
  const data = await fetchJson(url);
  return (data.items || []).map((item) => ({
    title: item.title || '',
    company: '',
    location: 'Saudi Arabia / Middle East',
    url: item.link || '',
    description: item.snippet || '',
    source: 'Google Programmable Search',
    postedAt: null
  }));
};

const searchTavily = async (query) => {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const data = await fetchJson('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query: `${query} Saudi Arabia jobs`,
      search_depth: 'basic',
      topic: 'general',
      max_results: 10,
      include_answer: false,
      include_raw_content: false
    })
  });
  return (data.results || []).map((item) => ({
    title: item.title || '',
    company: '',
    location: 'Saudi Arabia / Middle East',
    url: item.url || '',
    description: item.content || '',
    source: 'Tavily',
    postedAt: item.published_date || null
  }));
};

const analyzeWithOpenAI = async (jobs) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || process.env.OPENAI_ANALYSIS_ENABLED !== 'true') return null;
  const data = await fetchJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Return JSON only: {"jobs":[{"index":0,"matchScore":0,"reason":"","email":null}]}. Use only emails explicitly present in the supplied text. Never invent an email.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            profile: 'Mohammed AlSari: administration, operations, media and content; Saudi Arabia',
            jobs
          })
        }
      ]
    })
  });
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{"jobs":[]}');
  return jobs.map((job, index) => {
    const analysis = parsed.jobs?.find((item) => item.index === index) || {};
    return {
      ...job,
      ...classifyRole(job.title, job.description),
      matchScore: Number.isFinite(Number(analysis.matchScore))
        ? Math.max(0, Math.min(100, Number(analysis.matchScore)))
        : 0,
      reason: getText(analysis.reason),
      email: getText(analysis.email) || null
    };
  });
};

const persistJobs = async (jobs, fetchedAt) => {
  const supabaseUrl = getText(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const apiKey = getText(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !apiKey || jobs.length === 0) return false;

  const rows = jobs.map((job) => ({
    external_id: createHash('sha256').update(job.url).digest('hex'),
    source: job.source,
    title: job.title,
    company: job.company || null,
    location: job.location || null,
    url: job.url,
    description: job.description || null,
    posted_at: job.postedAt || null,
    fetched_at: fetchedAt,
    track: job.track,
    match_score: job.matchScore,
    reason: job.reason
  }));
  const url = new URL(`${supabaseUrl}/rest/v1/jobs`);
  url.searchParams.set('on_conflict', 'source,external_id');
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(rows)
  });
  if (!response.ok) throw new Error(`Supabase returned HTTP ${response.status}`);
  return true;
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Method not allowed' });
  }

  const query = getText(request.body?.query) || 'administrative assistant OR content producer';
  try {
    const results = await Promise.allSettled([
      searchAdzuna(query),
      searchGoogle(query),
      searchTavily(query)
    ]);
    const sourceWarnings = results
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason instanceof Error
        ? result.reason.message
        : 'A job search provider failed');
    const sourceJobs = results
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value);

    let jobs = sourceJobs.map(scoreJob);
    let analysisWarning = 'التحليل الذكي متوقف حاليًا؛ درجات المطابقة تقديرية بالكلمات المفتاحية.';
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_ANALYSIS_ENABLED === 'true') {
      try {
        jobs = await analyzeWithOpenAI(sourceJobs) || jobs;
        analysisWarning = null;
      } catch (error) {
        const status = error instanceof Error ? error.message.match(/HTTP \\d+/)?.[0] : null;
        analysisWarning = status
          ? `تعذّر تحليل OpenAI (${status})؛ عُرضت مطابقة تقديرية بالكلمات المفتاحية.`
          : 'تعذّر تحليل OpenAI؛ عُرضت مطابقة تقديرية بالكلمات المفتاحية.';
      }
    }

    const uniqueJobs = [...new Map(
      jobs.filter((job) => job.url).map((job) => [job.url, job])
    ).values()];
    uniqueJobs.sort((first, second) => second.matchScore - first.matchScore);
    const fetchedAt = new Date().toISOString();
    let persistenceWarning = null;
    let persisted = false;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        persisted = await persistJobs(uniqueJobs, fetchedAt);
      } catch (error) {
        console.error('Could not persist Amir search results', error);
        persistenceWarning = 'تعذّر حفظ النتائج في قاعدة البيانات.';
      }
    }
    return json(response, 200, {
      fetchedAt,
      jobs: uniqueJobs.slice(0, 20),
      sourceWarnings,
      analysisWarning,
      analysisMode: analysisWarning ? 'heuristic' : 'openai',
      persisted,
      persistenceWarning,
      requiresApprovalBeforeSend: true,
      maxDailyMessages: 20
    });
  } catch (error) {
    console.error('Amir search failed', error);
    return json(response, 502, {
      error: error instanceof Error ? error.message : 'Amir search failed'
    });
  }
}
