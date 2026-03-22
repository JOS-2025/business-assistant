import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  History, 
  ChevronRight,
  Loader2,
  UserPlus
} from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { format } from 'date-fns';
import { cn } from "../lib/utils";
import { Customer, Transaction } from "../types/database";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { motion, AnimatePresence } from "motion/react";

export default function Customers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "" });

  useEffect(() => {
    if (!user || !supabase) return;

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        handleSupabaseError(err, OperationType.LIST, "customers");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [user]);

  const fetchHistory = async (customerId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCustomerHistory(data || []);
    } catch (err) {
      handleSupabaseError(err, OperationType.LIST, "transactions");
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim() || !user || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...newCustomer, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      setCustomers([...customers, data]);
      setNewCustomer({ name: "", phone: "", email: "", address: "" });
      setIsAdding(false);
      showToast("Customer added!", "success");
    } catch (err) {
      handleSupabaseError(err, OperationType.CREATE, "customers");
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-md mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage your customer relationships.</p>
        </div>
        <Button 
          onClick={() => setIsAdding(true)}
          className="rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10 p-0"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search customers..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Fetching customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No customers found.</p>
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <div 
              key={customer.id} 
              onClick={() => {
                setSelectedCustomer(customer);
                fetchHistory(customer.id);
              }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-600 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                  {customer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{customer.name}</p>
                  <p className="text-xs text-slate-500">{customer.phone || 'No phone'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
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
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Add New Customer
              </h2>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <Input 
                  placeholder="Full Name" 
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  required
                  className="rounded-xl"
                />
                <Input 
                  placeholder="Phone Number" 
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="rounded-xl"
                />
                <Input 
                  placeholder="Email Address" 
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="rounded-xl"
                />
                <Input 
                  placeholder="Address" 
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="rounded-xl"
                />
                <Button type="submit" className="w-full rounded-xl bg-emerald-600 h-12 font-bold">
                  Save Customer
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customer History Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[70] p-8 pb-12 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xl">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                    <p className="text-lg font-bold text-emerald-600">
                      KES {customerHistory.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Purchase</p>
                    <p className="text-sm font-bold text-slate-700">
                      {customerHistory.length > 0 ? format(new Date(customerHistory[0].created_at), 'MMM d, yyyy') : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Purchase History
                  </h3>
                  {customerHistory.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{t.description}</p>
                        <p className="text-[10px] text-slate-400">{format(new Date(t.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">KES {t.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {customerHistory.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4 italic">No purchase history found.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
