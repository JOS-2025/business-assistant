import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  AlertTriangle, 
  Tag, 
  ArrowRight, 
  Loader2, 
  Sparkles,
  RefreshCw
} from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { getDemandForecasting, getSmartDiscounts, DemandForecast, SmartDiscount } from "../lib/ai";
import { Product, Transaction } from "../types/database";
import { Button } from "../components/ui/button";
import { motion } from "motion/react";

export default function PredictiveAnalytics() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [discounts, setDiscounts] = useState<SmartDiscount[]>([]);

  const fetchInsights = async () => {
    if (!user || !supabase) return;
    try {
      setLoading(true);
      const [productsRes, transactionsRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200)
      ]);

      if (productsRes.error) throw productsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      const products = productsRes.data as Product[];
      const transactions = transactionsRes.data as Transaction[];

      const [forecastData, discountData] = await Promise.all([
        getDemandForecasting(products, transactions),
        getSmartDiscounts(products, transactions)
      ]);

      setForecasts(forecastData);
      setDiscounts(discountData);
    } catch (err) {
      handleSupabaseError(err, OperationType.LIST, "analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [user]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Predictive Analytics</h1>
          <p className="text-sm text-slate-500">Insights to grow your business.</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchInsights} 
          disabled={loading}
          className="rounded-full"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </header>

      {/* Demand Forecasting */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h2>Demand Forecasting</h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">AI is analyzing your sales history...</p>
            </div>
          ) : forecasts.length === 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200 text-center">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No stock-out risks detected yet.</p>
            </div>
          ) : (
            forecasts.map((forecast, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{forecast.product_name}</span>
                  <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    {forecast.predicted_stock_out_days} days left
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{forecast.recommendation}</p>
                <Button variant="ghost" className="w-full text-emerald-600 text-[10px] font-bold h-8 hover:bg-emerald-50">
                  DRAFT REORDER <ArrowRight className="ml-1 w-3 h-3" />
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Smart Discounting */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Tag className="w-5 h-5 text-emerald-600" />
          <h2>Smart Discounting</h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">AI is identifying slow-moving items...</p>
            </div>
          ) : discounts.length === 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200 text-center">
              <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">All your stock is moving well!</p>
            </div>
          ) : (
            discounts.map((discount, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{discount.product_name}</span>
                  <div className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    -{discount.suggested_discount_percent}% OFF
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{discount.reason}</p>
                <Button className="w-full bg-emerald-600 text-[10px] font-bold h-8 rounded-xl">
                  APPLY DISCOUNT
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <div className="bg-emerald-900 text-white p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">AI Tip</span>
        </div>
        <p className="text-xs text-emerald-50/80 leading-relaxed">
          Predictive analytics gets better the more you use the app. Keep recording your daily sales to improve the accuracy of these forecasts.
        </p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
