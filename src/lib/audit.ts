import { supabase } from './supabase';

export async function logAction(userId: string, action: string, details: any = {}) {
  if (!supabase) return;
  try {
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.error("Failed to log action:", err);
  }
}
