import React, { useState, useEffect } from "react";
import { 
  Users, 
  MessageSquare, 
  Gift, 
  ArrowRight, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Phone,
  DollarSign,
  Star
} from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Customer, Debt } from "../types/database";
import { Button } from "../components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { format } from 'date-fns';

export default function CustomerEngagement() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const fetchData = async () => {
    if (!user || !supabase) return;
    try {
      setLoading(true);
      const [customersRes, debtsRes] = await Promise.all([
        supabase.from('customers').select('*').eq('user_id', user.id).order('loyalty_points', { ascending: false }),
        supabase.from('debts').select('*, customers(*)').eq('user_id', user.id).eq('status', 'pending')
      ]);

      if (customersRes.error) throw customersRes.error;
      if (debtsRes.error) throw debtsRes.error;

      setCustomers(customersRes.data || []);
      setDebts(debtsRes.data || []);
    } catch (err) {
      handleSupabaseError(err, OperationType.LIST, "engagement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const topCustomers = customers.slice(0, 5);
  const overdueDebts = debts.filter(d => new Date(d.due_date) < new Date());

  const handleSendReminder = (debt: any) => {
    const message = `Hi ${debt.customers.name}, just a friendly reminder of your KES ${debt.amount.toLocaleString()} balance at Business Assistant AI. You can pay via M-Pesa. Thank you!`;
    const whatsappUrl = `https://wa.me/${debt.customers.phone?.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast("Reminder drafted on WhatsApp!", "success");
  };

  const handleSendReward = (customer: Customer) => {
    const message = `Hi ${customer.name}, thank you for being a loyal customer! Here is a 10% discount code for your next purchase: LOYALTY10. See you soon!`;
    const whatsappUrl = `https://wa.me/${customer.phone?.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast("Reward sent to WhatsApp!", "success");
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Engagement</h1>
          <p className="text-sm text-slate-500">Automate your customer relationships.</p>
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

      {/* AI Debt Collector */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h2>AI Debt Collector</h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">Analyzing overdue debts...</p>
            </div>
          ) : overdueDebts.length === 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200 text-center">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">All debts are up to date!</p>
            </div>
          ) : (
            overdueDebts.map((debt: any, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{debt.customers.name}</span>
                    <p className="text-[10px] text-red-500 font-bold uppercase">OVERDUE {format(new Date(debt.due_date), 'MMM d')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">KES {debt.amount.toLocaleString()}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleSendReminder(debt)}
                  className="w-full bg-emerald-600 text-[10px] font-bold h-8 rounded-xl flex items-center gap-2"
                >
                  <MessageSquare className="w-3 h-3" />
                  SEND WHATSAPP REMINDER
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Loyalty Rewards */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Star className="w-5 h-5 text-emerald-600" />
          <h2>Loyalty Rewards</h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">Identifying top customers...</p>
            </div>
          ) : topCustomers.length === 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No customer data yet.</p>
            </div>
          ) : (
            topCustomers.map((customer, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs">
                      {customer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{customer.name}</span>
                      <p className="text-[10px] text-emerald-600 font-bold">{customer.loyalty_points} Points</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    TOP {idx + 1}
                  </div>
                </div>
                <Button 
                  onClick={() => handleSendReward(customer)}
                  variant="outline"
                  className="w-full text-emerald-600 text-[10px] font-bold h-8 rounded-xl border-emerald-600 hover:bg-emerald-50"
                >
                  <Gift className="w-3 h-3 mr-2" />
                  SEND THANK YOU REWARD
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">AI Tip</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The AI Debt Collector uses polite, non-aggressive language to maintain your customer relationships while ensuring you get paid on time.
        </p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
