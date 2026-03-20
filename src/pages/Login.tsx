import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Store, AlertCircle, Loader2, Mail, Lock } from "lucide-react";
import { supabase, handleSupabaseError, OperationType, signInWithEmail, signUpWithEmail, signInWithGoogle } from "../lib/supabase";
import { useToast } from "../components/Toast";

export default function Login() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        showToast("Logged in successfully!", "success");
        navigate('/');
      } else {
        await signUpWithEmail(email, password);
        showToast("Check your email for the confirmation link!", "info");
      }
    } catch (err: any) {
      const message = err.message || "Authentication failed. Please try again.";
      
      // Handle common auth errors with friendly messages
      if (message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please check your details and try again.");
      } else if (message.includes("Email not confirmed")) {
        setError("Please confirm your email address before logging in. Check your inbox.");
      } else if (message.includes("User already registered")) {
        setError("An account with this email already exists. Try logging in instead.");
      } else {
        setError(message);
        // Only log unexpected/system errors to the system handler
        handleSupabaseError(err, OperationType.WRITE, "auth");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed. Please try again.");
      console.error(err);
      handleSupabaseError(err, OperationType.WRITE, "auth");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Biashara Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your smart business assistant.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-800">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login' 
                ? 'Sign in to access your business data' 
                : 'Start tracking your business today'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  className="pl-11 h-12 rounded-xl border-slate-200 focus:ring-emerald-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-12 rounded-xl border-slate-200 focus:ring-emerald-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow-lg shadow-emerald-100"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                mode === 'login' ? 'Sign In' : 'Sign Up'
              )}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or continue with</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-12 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all font-medium flex items-center justify-center gap-3"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Google
          </Button>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-emerald-600 font-medium hover:underline"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' 
                ? "Don't have an account? Sign Up" 
                : "Already have an account? Sign In"}
            </button>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[10px] text-slate-400">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
