import React, { useState, useEffect } from "react";
import { 
  Store, 
  Share2, 
  ExternalLink, 
  Copy, 
  Check, 
  ShoppingBag, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Smartphone,
  Globe,
  QrCode
} from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Product } from "../types/database";
import { Button } from "../components/ui/button";
import { motion, AnimatePresence } from "motion/react";

export default function Storefront() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    if (!user || !supabase) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      handleSupabaseError(err, OperationType.LIST, "storefront");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const storefrontUrl = `${window.location.origin}/public-catalog/${user?.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(storefrontUrl);
    setCopied(true);
    showToast("Storefront link copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Business Catalog',
          text: 'Check out our current stock and prices!',
          url: storefrontUrl
        });
      } catch (err) {
        console.error("Share error:", err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full">
      <header className="text-center space-y-3">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Digital Storefront</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Create a public catalog for your customers to browse your products and prices.
        </p>
      </header>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Your Storefront Link</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-500 truncate">
              {storefrontUrl}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleCopy}
              className="rounded-xl shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <Button 
          onClick={handleShare}
          className="w-full rounded-2xl bg-emerald-600 h-14 font-bold text-lg shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share Storefront
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Catalog Preview</h2>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {products.length} Products
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">Loading catalog...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-2 py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Add products to see them here.</p>
            </div>
          ) : (
            products.slice(0, 4).map((product, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                <div className="w-full aspect-square bg-slate-50 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-slate-200" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs truncate">{product.name}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">KES {(product.price || 0).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {products.length > 4 && (
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            + {products.length - 4} more products
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">Mobile Ready</h3>
          <p className="text-[10px] text-slate-500 leading-relaxed">Optimized for WhatsApp browsing.</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">QR Codes</h3>
          <p className="text-[10px] text-slate-500 leading-relaxed">Print and stick in your shop.</p>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Globe className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Global Reach</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your storefront is accessible from anywhere. Customers can browse your catalog, check prices, and send you orders directly on WhatsApp.
        </p>
      </div>
    </div>
  );
}
