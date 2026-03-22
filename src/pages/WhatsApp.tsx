import React, { useState } from "react";
import { 
  MessageSquare, 
  Smartphone, 
  CheckCircle2, 
  Zap, 
  ArrowRight, 
  Bell, 
  Receipt, 
  BarChart3,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { motion } from "motion/react";

export default function WhatsApp() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate connection process
    setTimeout(() => {
      setIsConnecting(false);
      showToast("WhatsApp connection initiated! Check your phone.", "success");
    }, 2000);
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-emerald-600" />,
      title: "NLP Transaction Entry",
      description: "Just type 'Sold 5 bags of cement for 4500' on WhatsApp and the AI handles the rest."
    },
    {
      icon: <Bell className="w-5 h-5 text-emerald-600" />,
      title: "Daily Summaries",
      description: "Get an automated daily summary of your sales and profit at 8:00 PM every day."
    },
    {
      icon: <Receipt className="w-5 h-5 text-emerald-600" />,
      title: "Instant Receipts",
      description: "Generate and send professional PDF receipts to your customers directly via WhatsApp."
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-emerald-600" />,
      title: "Low Stock Alerts",
      description: "Receive instant notifications when any product stock falls below your threshold."
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full">
      <header className="text-center space-y-3">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp Integration</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Connect your business to WhatsApp and manage everything with simple text messages.
        </p>
      </header>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            1
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">Connect Your Number</h3>
            <p className="text-xs text-slate-500">Link your WhatsApp Business or personal number.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            2
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">Verify Identity</h3>
            <p className="text-xs text-slate-500">Send a verification code to our secure bot.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            3
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">Start Managing</h3>
            <p className="text-xs text-slate-500">Type transactions, get reports, and more!</p>
          </div>
        </div>

        <Button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full rounded-2xl bg-emerald-600 h-14 font-bold text-lg shadow-lg shadow-emerald-600/20"
        >
          {isConnecting ? "Connecting..." : "Connect WhatsApp Now"}
          {!isConnecting && <ArrowRight className="ml-2 w-5 h-5" />}
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">What you can do</h2>
        <div className="grid gap-4">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                {feature.icon}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{feature.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Security First</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your data is encrypted end-to-end. We never share your business transactions with third parties. WhatsApp integration uses official Meta APIs for maximum reliability.
        </p>
        <button className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 hover:underline">
          READ OUR PRIVACY POLICY <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="text-center pb-8">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Powered by Business Assistant AI</p>
      </div>
    </div>
  );
}
