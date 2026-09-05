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
      gmail: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)
    },
    policy: { dailyApprovalRequired: true, maxDailyMessages: 20, automaticSubmissionWithoutApproval: false }
  });
}
