import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if configuration is missing or using placeholder values
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== "YOUR_SUPABASE_URL" && 
  supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY";

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const hasSupabaseConfig = !!supabase;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  // Extract a meaningful error message
  let errorMessage = "An unknown error occurred";
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const anyError = error as any;
    
    // Try to find a message in common Supabase error fields
    const rawMessage = anyError.message || anyError.error_description || anyError.error || anyError.msg;
    
    if (typeof rawMessage === 'string') {
      errorMessage = rawMessage;
    } else if (typeof rawMessage === 'object' && rawMessage !== null) {
      // If message is an object, stringify it or look for its own message
      errorMessage = rawMessage.message || JSON.stringify(rawMessage);
    } else {
      // Fallback to stringifying the whole error object
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = String(error);
      }
    }
  } else {
    errorMessage = String(error);
  }
  
  // Clean up common "[object Object]" strings if they somehow slipped through
  if (errorMessage === "[object Object]") {
    try {
      errorMessage = JSON.stringify(error);
    } catch (e) {
      errorMessage = "Complex error object (could not stringify)";
    }
  }

  // Handle network errors specifically
  if (errorMessage === "Failed to fetch") {
    if (!hasSupabaseConfig) {
      errorMessage = "Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your secrets.";
    } else {
      errorMessage = "Network error: Could not connect to Supabase. Check your URL and internet connection.";
    }
  }
  
  const errInfo = {
    error: errorMessage,
    operationType,
    path,
    timestamp: new Date().toISOString()
  };

  console.error('Supabase Error Context:', JSON.stringify(errInfo));
  
  // Throw the message so it can be caught and displayed in the UI
  throw new Error(errorMessage);
}

export const signInWithGoogle = async () => {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

async function testConnection() {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error) {
      console.warn("Supabase connection test failed or table 'products' doesn't exist yet:", error.message);
    } else {
      console.log("Supabase connection successful");
    }
  } catch (error) {
    console.error("Error testing Supabase connection:", error);
  }
}

testConnection();
