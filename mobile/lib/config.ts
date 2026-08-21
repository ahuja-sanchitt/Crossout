// URL of the deployed web app — its /api/insights route is what powers the
// Insights screen (the OpenAI key can't ship inside the mobile bundle). Point
// this at your Vercel deployment; for local dev, your machine's LAN IP
// (e.g. http://192.168.1.20:3000) since "localhost" from the phone means the
// phone itself.
export const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL ?? '';
