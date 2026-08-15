function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name} (see .env.example)`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required('SUPABASE_URL');
  },
  get supabaseServiceRoleKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  get openaiApiKey() {
    return required('OPENAI_API_KEY');
  },
  get openaiModel() {
    return process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  },
  get crossoutUserId() {
    return required('CROSSOUT_USER_ID');
  },
};
