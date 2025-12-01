// Validate environment variables at build time
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

export function validateEnvVars() {
  if (typeof window === 'undefined') {
    // Server-side: validate all vars
    const missing = requiredEnvVars.filter(
      (varName) => !process.env[varName] || process.env[varName]?.trim() === ''
    );
    
    if (missing.length > 0 && process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please set these in your Vercel project settings.'
      );
    }
    
    if (missing.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(
        `⚠️  Missing environment variables: ${missing.join(', ')}\n` +
        'Please check your .env.local file. See .env.example for reference.'
      );
    }
  }
}

// Call validation when module is imported
validateEnvVars();

