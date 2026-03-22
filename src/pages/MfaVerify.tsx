import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";

export default function MfaVerify() {
  const { user, aal } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (aal === 'aal2') {
      navigate('/');
    }
  }, [aal, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || code.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors.totp[0];
      if (!totpFactor) {
        // No MFA factor found, but we are here? Should not happen if enforced correctly.
        navigate('/');
        return;
      }

      const { data, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: data.id,
        code
      });

      if (verifyError) throw verifyError;

      showToast("Verification successful!", "success");
      navigate('/');
    } catch (err: any) {
      setError(err.message || "Verification failed. Please check your code.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Two-Factor Authentication
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">Verification Code</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-bold h-14 rounded-xl border-slate-200 focus:ring-emerald-500"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                required
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow-lg shadow-emerald-100"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Verify'
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-slate-500 font-medium hover:underline"
              onClick={handleLogout}
            >
              Cancel and Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
