import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service Role 클라이언트 생성
 * RLS를 우회하여 모든 작업 수행 가능
 * API 라우트에서만 사용해야 함 (클라이언트 사이드 노출 금지)
 */
export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
