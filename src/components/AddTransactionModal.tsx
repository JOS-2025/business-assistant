import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, Loader2, X, Package } from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import { Transaction, Product, Branch, Customer } from "../types/database";
import { offlineDb } from "../lib/db";
import { sendWhatsAppReceipt } from "../services/whatsappService";
import { useSync } from "../hooks/useSync";
import { Phone, Check } from "lucide-react";

const INCOME_CATEGORIES = [
  "sales", "other income", "investment", "loan", "other"
];

const EXPENSE_CATEGORIES = [
  "stock", "rent", "transport", "salary", "utilities", "marketing", "maintenance", "other"
];

interface AddTransactionModalProps {
  onSuccess: () => void;
  defaultBranchId?: string;
}

export default function AddTransactionModal({ onSuccess, defaultBranchId }: AddTransactionModalProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const { isOnline } = useSync();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    type: 'sale' as 'sale' | 'expense',
    amount: '',
    category: 'sales',
    description: '',
    productId: '',
    customerId: '',
    quantity: '',
    branchId: defaultBranchId || ''
  });

  useEffect(() => {
    if (defaultBranchId) {
      setFormData(prev => ({ ...prev, branchId: defaultBranchId === 'all' ? '' : defaultBranchId }));
    }
  }, [defaultBranchId]);

  useEffect(() => {
    if (open && user) {
      const fetchData = async () => {
        try {
          if (isOnline && supabase) {
            const [prodRes, branchRes, custRes] = await Promise.all([
              supabase.from('products').select('*').eq('user_id', user.id),
              supabase.from('branches').select('*').eq('user_id', user.id),
              supabase.from('customers').select('*').eq('user_id', user.id)
            ]);
            
            if (prodRes.error) throw prodRes.error;
            if (branchRes.error) throw branchRes.error;
            if (custRes.error) throw custRes.error;
            
            setProducts(prodRes.data || []);
            setBranches(branchRes.data || []);
            setCustomers(custRes.data || []);
          } else {
            // Offline fallback
            const [offlineProducts, offlineBranches, offlineCustomers] = await Promise.all([
              offlineDb.products.toArray(),
              offlineDb.branches.toArray(),
              offlineDb.customers.toArray()
            ]);
            setProducts(offlineProducts);
            setBranches(offlineBranches);
            setCustomers(offlineCustomers);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          // Try offline fallback on error too
          const [offlineProducts, offlineBranches, offlineCustomers] = await Promise.all([
            offlineDb.products.toArray(),
            offlineDb.branches.toArray(),
            offlineDb.customers.toArray()
          ]);
          setProducts(offlineProducts);
          setBranches(offlineBranches);
          setCustomers(offlineCustomers);
        }
      };
      fetchData();
    }
  }, [open, user, isOnline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    if (!user) {
      showToast("Please log in to add transactions.", "error");
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      const quantity = formData.quantity ? parseFloat(formData.quantity) : 0;
      const branchId = formData.branchId || null;
      
      const vatRate = profile?.preferences?.vat_rate || 0;
      const taxAmount = formData.type === 'sale' ? (amount * (vatRate / 100)) : 0;

      const txData = {
        user_id: user.id,
        type: formData.type,
        amount: amount,
        category: formData.category,
        description: formData.description,
        product_id: formData.productId || null,
        customer_id: formData.customerId || null,
        quantity: quantity || null,
        branch_id: branchId,
        tax_amount: taxAmount,
        created_at: new Date().toISOString()
      };

      let savedTx: Transaction;

      if (navigator.onLine && supabase) {
        // Online: Save to Supabase
        const { data, error: txError } = await supabase
          .from('transactions')
          .insert(txData)
          .select()
          .single();

        if (txError) throw txError;
        savedTx = data;

        // Update product stock online
        if (formData.productId) {
          const product = products.find(p => p.id === formData.productId);
          if (product) {
            const { data: currentProduct } = await supabase
              .from('products')
              .select('stock, total_sold, total_bought')
              .eq('id', product.id)
              .single();

            if (currentProduct) {
              const currentStock = currentProduct.stock || 0;
              let updateData: any = {};

              if (formData.type === 'sale') {
                updateData = {
                  stock: currentStock - quantity,
                  total_sold: (currentProduct.total_sold || 0) + quantity
                };
              } else if (formData.type === 'expense' && formData.category === 'stock') {
                updateData = {
                  stock: currentStock + quantity,
                  total_bought: (currentProduct.total_bought || 0) + quantity
                };
              }

              if (Object.keys(updateData).length > 0) {
                await supabase.from('products').update(updateData).eq('id', product.id);
              }
            }
          }
        }
        showToast("Transaction saved successfully!", "success");
      } else {
        // Offline: Save to Dexie
        const id = await offlineDb.transactions.add({
          ...txData,
          id: crypto.randomUUID(),
          synced: false
        } as any);
        savedTx = { id: id.toString(), ...txData } as Transaction;
        showToast("Saved offline. Will sync when online.", "info");
      }

      setLastTransaction(savedTx);
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
      
      if (formData.type === 'sale' && selectedCustomer?.phone) {
        setShowReceiptOptions(true);
      } else {
        setOpen(false);
        resetForm();
        onSuccess();
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Failed to save transaction.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      type: 'sale', 
      amount: '', 
      category: 'sales', 
      description: '',
      productId: '',
      customerId: '',
      quantity: '',
      branchId: defaultBranchId || ''
    });
    setLastTransaction(null);
    setShowReceiptOptions(false);
  };

  const handleSendWhatsApp = async () => {
    if (lastTransaction) {
      const selectedCustomer = customers.find(c => c.id === lastTransaction.customer_id);
      await sendWhatsAppReceipt(lastTransaction, selectedCustomer, profile);
      setOpen(false);
      resetForm();
      onSuccess();
    }
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 gap-2"
      >
        <Plus className="w-5 h-5" />
        <span className="hidden sm:inline">Add Transaction</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                {showReceiptOptions ? "Sale Recorded!" : "Add Transaction"}
              </h2>
              <button 
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {showReceiptOptions ? (
              <div className="p-8 space-y-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Transaction Saved</h3>
                  <p className="text-slate-500">
                    Would you like to send a digital receipt to {customers.find(c => c.id === lastTransaction?.customer_id)?.name}?
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <Button 
                    onClick={handleSendWhatsApp}
                    className="w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    Send via WhatsApp
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                      onSuccess();
                    }}
                    className="w-full h-12 rounded-2xl border-slate-200 text-slate-600 font-bold"
                  >
                    Skip
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'sale', category: 'sales' }))}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                      formData.type === 'sale' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category: 'stock' }))}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                      formData.type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Expense
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount (KES)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="rounded-xl border-slate-200 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {(formData.type === 'sale' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                        <option key={cat} value={cat} className="capitalize">{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Branch</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">No branch selected</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Link to Product (Optional)
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const prod = products.find(p => p.id === prodId);
                      setFormData(prev => ({ 
                        ...prev, 
                        productId: prodId,
                        description: prod ? `${prev.type === 'sale' ? 'Sold' : 'Bought'} ${prod.name}` : prev.description
                      }));
                    }}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">No product selected</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (Stock: {prod.stock} {prod.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {formData.type === 'sale' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer (Optional)</label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">No customer selected</option>
                      {customers.map(cust => (
                        <option key={cust.id} value={cust.id}>{cust.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.type === 'sale' && formData.productId && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity (Optional)</label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        className="rounded-xl border-slate-200 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-500 font-medium">
                        {products.find(p => p.id === formData.productId)?.unit}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <Input
                    placeholder="e.g. Sold 2 bags of maize"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="rounded-xl border-slate-200 focus:ring-emerald-500"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-12 font-bold text-lg"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Save Transaction
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
