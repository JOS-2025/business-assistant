import React, { useState, useEffect } from "react";
import { 
  Truck, 
  Search, 
  Plus, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  AlertCircle
} from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Product, Supplier } from "../types/database";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import { format } from 'date-fns';

export default function SupplierIntelligence() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", email: "", address: "" });

  const fetchData = async () => {
    if (!user || !supabase) return;
    try {
      setLoading(true);
      const [suppliersRes, productsRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('products').select('*').eq('user_id', user.id)
      ]);

      if (suppliersRes.error) throw suppliersRes.error;
      if (productsRes.error) throw productsRes.error;

      setSuppliers(suppliersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      handleSupabaseError(err, OperationType.LIST, "suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim() || !user || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{ ...newSupplier, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      setSuppliers([...suppliers, data]);
      setNewSupplier({ name: "", phone: "", email: "", address: "" });
      setIsAdding(false);
      showToast("Supplier added!", "success");
    } catch (err) {
      handleSupabaseError(err, OperationType.CREATE, "suppliers");
    }
  };

  const handleCreatePO = (product: Product) => {
    const supplier = suppliers.find(s => s.id === product.supplier_id);
    const message = `Hi ${supplier?.name || 'Supplier'}, I would like to place an order for ${product.name}. Please let me know the current price and delivery time. Thank you!`;
    const whatsappUrl = `https://wa.me/${supplier?.phone?.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast("Purchase Order drafted on WhatsApp!", "success");
  };

  const lowStockProducts = products.filter(p => p.stock <= p.min_stock_level);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Intelligence</h1>
          <p className="text-sm text-slate-500">Manage your supply chain efficiently.</p>
        </div>
        <Button 
          onClick={() => setIsAdding(true)}
          className="rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10 p-0"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {/* Price Comparison / Low Stock Alerts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <AlertCircle className="w-5 h-5 text-emerald-600" />
          <h2>Price Alerts & Low Stock</h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">Analyzing supplier data...</p>
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-dashed border-slate-200 text-center">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">All stock levels are healthy!</p>
            </div>
          ) : (
            lowStockProducts.map((product, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{product.name}</span>
                    <p className="text-[10px] text-red-500 font-bold uppercase">LOW STOCK: {product.stock} {product.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Last Price</p>
                    <p className="font-bold text-slate-900">KES {product.last_purchase_price?.toLocaleString() || 'N/A'}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleCreatePO(product)}
                  className="w-full bg-emerald-600 text-[10px] font-bold h-8 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <FileText className="w-3 h-3" />
                  GENERATE PURCHASE ORDER
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Supplier List */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Truck className="w-5 h-5 text-emerald-600" />
          <h2>Your Suppliers</h2>
        </div>
        <div className="space-y-3">
          {suppliers.map((supplier, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                  {supplier.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{supplier.name}</p>
                  <p className="text-[10px] text-slate-500">{supplier.phone || 'No phone'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          ))}
          {suppliers.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400">No suppliers added yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[70] p-8 pb-12 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Add New Supplier
              </h2>
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <Input 
                  placeholder="Supplier Name" 
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  required
                  className="rounded-xl"
                />
                <Input 
                  placeholder="Phone Number" 
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  className="rounded-xl"
                />
                <Input 
                  placeholder="Email Address" 
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  className="rounded-xl"
                />
                <Input 
                  placeholder="Address" 
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="rounded-xl"
                />
                <Button type="submit" className="w-full rounded-xl bg-emerald-600 h-12 font-bold">
                  Save Supplier
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
