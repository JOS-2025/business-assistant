import { useState, useEffect } from "react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Trash2,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { cn } from "../lib/utils";

interface Debt {
  id: string;
  customer_name: string;
  amount: number;
  type: 'debt' | 'credit';
  status: 'pending' | 'paid';
  due_date: string | null;
  description: string;
  created_at: string;
}

export default function Debts() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debt' | 'credit'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDebts();
    }
  }, [user]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        throw new Error("Supabase is not configured. Please check your secrets.");
      }
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDebts(data || []);
    } catch (error) {
      console.error("Error fetching debts:", error);
      handleSupabaseError(error, OperationType.LIST, "debts");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (debt: Debt) => {
    try {
      const newStatus = debt.status === 'pending' ? 'paid' : 'pending';
      const { error } = await supabase
        .from('debts')
        .update({ status: newStatus })
        .eq('id', debt.id);

      if (error) throw error;
      
      setDebts(prev => prev.map(d => d.id === debt.id ? { ...d, status: newStatus } : d));
      showToast(`Marked as ${newStatus}`, "success");
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, "debts");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    
    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDebts(prev => prev.filter(d => d.id !== id));
      showToast("Record deleted", "success");
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, "debts");
    }
  };

  const filteredDebts = debts.filter(d => {
    const matchesSearch = d.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filter === 'all' || d.status === filter;
    const matchesType = typeFilter === 'all' || d.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPendingDebt = debts
    .filter(d => d.status === 'pending' && d.type === 'debt')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalPendingCredit = debts
    .filter(d => d.status === 'pending' && d.type === 'credit')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-slate-900">Debts & Credit (Deni)</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-red-50 p-3 rounded-xl border border-red-100">
            <p className="text-[10px] uppercase font-bold text-red-600 mb-1">Customers Owe You</p>
            <p className="text-lg font-bold text-red-700">KES {totalPendingDebt.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">You Owe Others</p>
            <p className="text-lg font-bold text-amber-700">KES {totalPendingCredit.toLocaleString()}</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-slate-100 border-none rounded-lg text-xs py-1.5 px-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="all">All Status</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-100 border-none rounded-lg text-xs py-1.5 px-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="debt">Customer Owe</option>
            <option value="credit">You Owe</option>
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm">Loading records...</p>
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <DollarSign className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-medium mb-1">No records found</h3>
            <p className="text-slate-500 text-sm max-w-[200px]">
              Keep track of who owes you and who you owe.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredDebts.map((debt) => (
                <motion.div
                  key={debt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "bg-white p-4 rounded-2xl shadow-sm border transition-all",
                    debt.status === 'paid' ? "opacity-60 border-slate-100" : "border-slate-200"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        debt.type === 'debt' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                      )}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{debt.customer_name}</h3>
                        <p className="text-xs text-slate-500">{debt.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-lg",
                        debt.type === 'debt' ? "text-red-600" : "text-amber-600"
                      )}>
                        {debt.type === 'debt' ? '+' : '-'} KES {debt.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        {debt.status === 'paid' ? (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(debt.created_at), 'MMM d, yyyy')}
                      </div>
                      {debt.due_date && (
                        <div className={cn(
                          "flex items-center gap-1",
                          new Date(debt.due_date) < new Date() && debt.status === 'pending' ? "text-red-500" : ""
                        )}>
                          <AlertCircle className="w-3 h-3" />
                          Due: {format(new Date(debt.due_date), 'MMM d')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleToggleStatus(debt)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors",
                          debt.status === 'paid' 
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                            : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                        )}
                      >
                        {debt.status === 'paid' ? "Undo Paid" : "Mark Paid"}
                      </button>
                      <button 
                        onClick={() => handleDelete(debt.id)}
                        className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AddDebtModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDebts}
      />
    </div>
  );
}

function AddDebtModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    amount: "",
    type: "debt" as 'debt' | 'credit',
    due_date: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.customer_name || !formData.amount) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('debts')
        .insert({
          user_id: user.id,
          customer_name: formData.customer_name,
          amount: parseFloat(formData.amount),
          type: formData.type,
          due_date: formData.due_date || null,
          description: formData.description,
          status: 'pending'
        });

      if (error) throw error;
      
      showToast("Record added successfully", "success");
      onSuccess();
      onClose();
      setFormData({
        customer_name: "",
        amount: "",
        type: "debt",
        due_date: "",
        description: ""
      });
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, "debts");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Add Debt/Credit</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'debt' }))}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  formData.type === 'debt' ? "bg-white text-red-600 shadow-sm" : "text-slate-500"
                )}
              >
                Customer Owes Me
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'credit' }))}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  formData.type === 'credit' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500"
                )}
              >
                I Owe Someone
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
              <input
                required
                type="text"
                value={formData.customer_name}
                onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="e.g. Mama Mboga or Supplier X"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount (KES)</label>
                <input
                  required
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What is this for?"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-20 resize-none"
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Record"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function X(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}

function Loader2(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
