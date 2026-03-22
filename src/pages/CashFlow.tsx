import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Loader2, 
  Sparkles,
  RefreshCw,
  DollarSign,
  Calendar,
  AlertCircle,
  Activity
} from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { getCashFlowForecasting, CashFlowRunway } from "../lib/ai";
import { Transaction } from "../types/database";
import { Button } from "../components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { format } from 'date-fns';

export default function CashFlow() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [runway, setRunway] = useState<CashFlowRunway | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchData = async () => {
    if (!user || !supabase) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      const txs = data as Transaction[];
      setTransactions(txs);

      const currentBalance = txs.reduce((sum, t) => {
        if (t.type === 'sale' || t.type === 'payment') return sum + t.amount;
        return sum - t.amount;
      }, 0);
      const runwayData = await getCashFlowForecasting(txs, currentBalance);
      setRunway(runwayData);
    } catch (err) {
      handleSupabaseError(err, OperationType.LIST, "cashflow");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const currentBalance = transactions.reduce((sum, t) => {
    if (t.type === 'sale' || t.type === 'payment') return sum + t.amount;
    return sum - t.amount;
  }, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cash Flow Forecasting</h1>
          <p className="text-sm text-slate-500">Know your business runway.</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchData} 
          disabled={loading}
          className="rounded-full"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </header>

      {/* Current Balance Card */}
      <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg shadow-emerald-600/20 space-y-4">
        <div className="flex items-center gap-2 text-emerald-100">
          <DollarSign className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Current Balance</span>
        </div>
        <h2 className="text-3xl font-bold">KES {currentBalance.toLocaleString()}</h2>
        <div className="flex items-center gap-2 text-emerald-100 text-xs">
          <Activity className="w-4 h-4" />
          <span>Real-time calculation from all transactions</span>
        </div>
      </div>

      {/* Runway Analysis */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2>Runway Analysis</h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">AI is calculating your runway...</p>
            </div>
          ) : !runway ? (
            <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200 text-center">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Add more transactions for AI analysis.</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6"
            >
              <div className="text-center space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estimated Runway</p>
                <h3 className="text-4xl font-bold text-slate-900">{runway.runway_days} Days</h3>
                <p className="text-xs text-slate-500">Before you run out of cash at current burn rate.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    Burn Rate
                  </p>
                  <p className="text-sm font-bold text-slate-800">KES {runway.monthly_burn_rate.toLocaleString()} / mo</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    Revenue
                  </p>
                  <p className="text-sm font-bold text-slate-800">KES {runway.monthly_revenue.toLocaleString()} / mo</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  <strong>AI Advice:</strong> {runway.advice}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">AI Insight</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The "Runway" is the amount of time your business can continue to operate if your income stops today. A healthy runway for small businesses is typically 90 days.
        </p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
