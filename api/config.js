export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  return response.status(200).json({
    configured: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      adzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
      googleSearch: Boolean(process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID),
      tavily: Boolean(process.env.TAVILY_API_KEY),
      openaiAnalysis: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_ANALYSIS_ENABLED === 'true'),
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      dailyJobRefresh: Boolean(process.env.DAILY_JOBS_ENABLED === 'true' && process.env.CRON_SECRET && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      gmail: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)
    },
    policy: {
      dailyApprovalRequired: true,
      maxDailyMessages: 20,
      automaticSubmissionWithoutApproval: false
    }
  });
}
