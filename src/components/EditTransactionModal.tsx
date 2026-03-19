import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, X, Trash2, Package } from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";

const INCOME_CATEGORIES = [
  "sales", "other income", "investment", "loan", "other"
];

const EXPENSE_CATEGORIES = [
  "stock", "rent", "transport", "salary", "utilities", "marketing", "maintenance", "other"
];

interface Product {
  id: string;
  name: string;
  stock: number;
  unit: string;
  total_sold?: number;
  total_bought?: number;
}

interface Transaction {
  id: string;
  type: 'sale' | 'expense';
  amount: number;
  category: string;
  description: string;
  created_at: string;
  product_id?: string;
  quantity?: number;
}

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTransactionModal({ transaction, onClose, onSuccess }: EditTransactionModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    type: transaction.type,
    amount: transaction.amount.toString(),
    category: transaction.category,
    description: transaction.description,
    productId: transaction.product_id || '',
    quantity: transaction.quantity?.toString() || ''
  });

  useEffect(() => {
    if (user) {
      const fetchProducts = async () => {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id);
          
          if (error) throw error;
          setProducts(data || []);
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      };
      fetchProducts();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    if (!user) {
      showToast("Please log in to update transactions.", "error");
      return;
    }

    setLoading(true);
    try {
      const newAmount = parseFloat(formData.amount);
      const newQuantity = formData.quantity ? parseFloat(formData.quantity) : 0;
      const newProductId = formData.productId || null;

      // 1. Get the current transaction data (to be sure)
      const { data: oldData, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transaction.id)
        .single();
      
      if (fetchError) throw fetchError;

      const oldProductId = oldData.product_id;
      const oldQuantity = oldData.quantity || 0;
      const oldType = oldData.type;
      const oldCategory = oldData.category;

      // 2. Reverse old product stock impact
      if (oldProductId) {
        const { data: oldProduct, error: prodError } = await supabase
          .from('products')
          .select('*')
          .eq('id', oldProductId)
          .single();
        
        if (!prodError && oldProduct) {
          let updatedStock = oldProduct.stock || 0;
          let updatedSold = oldProduct.total_sold || 0;
          let updatedBought = oldProduct.total_bought || 0;

          if (oldType === 'sale') {
            updatedStock += oldQuantity;
            updatedSold -= oldQuantity;
          } else if (oldType === 'expense' && oldCategory === 'stock') {
            updatedStock -= oldQuantity;
            updatedBought -= oldQuantity;
          }

          await supabase
            .from('products')
            .update({
              stock: updatedStock,
              total_sold: updatedSold,
              total_bought: updatedBought
            })
            .eq('id', oldProductId);
        }
      }

      // 3. Apply new product stock impact
      if (newProductId) {
        const { data: newProduct, error: prodError } = await supabase
          .from('products')
          .select('*')
          .eq('id', newProductId)
          .single();
        
        if (!prodError && newProduct) {
          let updatedStock = newProduct.stock || 0;
          let updatedSold = newProduct.total_sold || 0;
          let updatedBought = newProduct.total_bought || 0;

          if (formData.type === 'sale') {
            updatedStock -= newQuantity;
            updatedSold += newQuantity;
          } else if (formData.type === 'expense' && formData.category === 'stock') {
            updatedStock += newQuantity;
            updatedBought += newQuantity;
          }

          await supabase
            .from('products')
            .update({
              stock: updatedStock,
              total_sold: updatedSold,
              total_bought: updatedBought
            })
            .eq('id', newProductId);
        }
      }

      // 4. Update the transaction document
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          type: formData.type,
          amount: newAmount,
          category: formData.category,
          description: formData.description,
          product_id: newProductId,
          quantity: newQuantity || null,
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      showToast("Transaction updated successfully!", "success");
      onSuccess();
      onClose();
    } catch (error) {
      showToast("Failed to update transaction.", "error");
      handleSupabaseError(error, OperationType.UPDATE, `transactions/${transaction.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      showToast("Please log in to delete transactions.", "error");
      return;
    }

    setDeleting(true);
    try {
      // 1. Get the current transaction data
      const { data: oldData, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transaction.id)
        .single();
      
      if (fetchError) throw fetchError;

      const oldProductId = oldData.product_id;
      const oldQuantity = oldData.quantity || 0;
      const oldType = oldData.type;
      const oldCategory = oldData.category;

      // 2. Reverse product stock impact
      if (oldProductId) {
        const { data: oldProduct, error: prodError } = await supabase
          .from('products')
          .select('*')
          .eq('id', oldProductId)
          .single();
        
        if (!prodError && oldProduct) {
          let updatedStock = oldProduct.stock || 0;
          let updatedSold = oldProduct.total_sold || 0;
          let updatedBought = oldProduct.total_bought || 0;

          if (oldType === 'sale') {
            updatedStock += oldQuantity;
            updatedSold -= oldQuantity;
          } else if (oldType === 'expense' && oldCategory === 'stock') {
            updatedStock -= oldQuantity;
            updatedBought -= oldQuantity;
          }

          await supabase
            .from('products')
            .update({
              stock: updatedStock,
              total_sold: updatedSold,
              total_bought: updatedBought
            })
            .eq('id', oldProductId);
        }
      }

      // 3. Delete the transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);

      if (deleteError) throw deleteError;

      showToast("Transaction deleted successfully!", "success");
      onSuccess();
      onClose();
    } catch (error) {
      showToast("Failed to delete transaction.", "error");
      handleSupabaseError(error, OperationType.DELETE, `transactions/${transaction.id}`);
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Edit Transaction</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
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

          <div className="flex gap-3 pt-2">
            <Button 
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDelete(true)}
              className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-12 font-bold"
              disabled={deleting || loading}
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Delete
            </Button>
            <Button 
              type="submit" 
              className="flex-[2] rounded-xl bg-emerald-600 hover:bg-emerald-700 h-12 font-bold text-lg"
              disabled={loading || deleting}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Update
            </Button>
          </div>
        </form>

        {showConfirmDelete && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Transaction?</h3>
                <p className="text-sm text-slate-500">This action cannot be undone and will reverse stock changes.</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="default" 
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
