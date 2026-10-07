import { timingSafeEqual } from 'node:crypto';
import amirHandler from '../amir.js';

const json = (response, status, body) => response.status(status).json(body);

const hasValidCronToken = (request, expectedToken) => {
  const suppliedToken = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const supplied = Buffer.from(suppliedToken);
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return json(response, 405, { error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !hasValidCronToken(request, cronSecret)) {
    return json(response, 401, { error: 'Unauthorized' });
  }

  if (
    process.env.DAILY_JOBS_ENABLED !== 'true' ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return json(response, 503, { error: 'Daily job refresh is not configured' });
  }

  const result = {};
  const capturedResponse = {
    statusCode: 200,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      result.body = body;
      return body;
    },
    setHeader() {}
  };

  await amirHandler({
    method: 'POST',
    body: {
      query: process.env.DAILY_JOBS_QUERY ||
        'administrative assistant OR operations coordinator OR content producer Saudi Arabia'
    }
  }, capturedResponse);

  const search = result.body;
  if (capturedResponse.statusCode !== 200 || !search) {
    return json(response, 502, { error: 'Scheduled job search failed' });
  }
  if (!search.jobs.length) {
    return json(response, 502, {
      error: 'Scheduled job search returned no opportunities',
      sourceWarnings: search.sourceWarnings
    });
  }
  if (search.persistenceWarning) {
    return json(response, 502, {
      error: search.persistenceWarning,
      sourceWarnings: search.sourceWarnings
    });
  }

  return json(response, 200, {
    fetchedAt: search.fetchedAt,
    storedJobs: search.persisted ? search.jobs.length : 0,
    sources: [...new Set(search.jobs.map((job) => job.source))],
    sourceWarnings: search.sourceWarnings,
    analysisMode: search.analysisMode,
    requiresApprovalBeforeSend: true
  });
}
