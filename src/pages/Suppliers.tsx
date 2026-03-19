import { useState, useEffect } from "react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { 
  Plus, 
  Search, 
  Truck, 
  Phone, 
  Mail, 
  MapPin, 
  Trash2, 
  Edit2, 
  ChevronRight,
  Package,
  X,
  Loader2,
  CheckCircle2,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  created_at: string;
}

interface SupplierPurchase {
  id: string;
  supplier_id: string;
  product_name: string;
  quantity: number;
  total_cost: number;
  status: 'paid' | 'pending';
  created_at: string;
}

export default function Suppliers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchasesModalOpen, setIsPurchasesModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    if (user) {
      fetchSuppliers();
    }
  }, [user]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        throw new Error("Supabase is not configured. Please check your secrets.");
      }
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      handleSupabaseError(error, OperationType.LIST, "suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuppliers(prev => prev.filter(s => s.id !== id));
      showToast("Supplier deleted", "success");
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, "suppliers");
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-slate-900">Suppliers</h1>
          <button 
            onClick={() => {
              setSelectedSupplier(null);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm">Loading suppliers...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <Truck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-medium mb-1">No suppliers found</h3>
            <p className="text-slate-500 text-sm max-w-[200px]">
              Add your suppliers to track where you get your stock from.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filteredSuppliers.map((supplier) => (
                <motion.div
                  key={supplier.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{supplier.name}</h3>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {supplier.category || "General"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <span className="truncate">{supplier.phone || "No phone"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <span className="truncate">{supplier.email || "No email"}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-xs text-slate-600 mt-1">
                      <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <span className="truncate">{supplier.address || "No address provided"}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Package className="w-3 h-3" />
                      Contact: {supplier.contact_person || "N/A"}
                    </div>
                    <button 
                      onClick={() => {
                        setViewingSupplier(supplier);
                        setIsPurchasesModalOpen(true);
                      }}
                      className="text-emerald-600 text-[10px] font-bold uppercase flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      View Purchases <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AddSupplierModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSuppliers}
        supplier={selectedSupplier}
      />

      <SupplierPurchasesModal
        isOpen={isPurchasesModalOpen}
        onClose={() => setIsPurchasesModalOpen(false)}
        supplier={viewingSupplier}
      />
    </div>
  );
}

function SupplierPurchasesModal({ isOpen, onClose, supplier }: {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "",
    quantity: 1,
    total_cost: 0,
    status: "pending" as "paid" | "pending"
  });

  useEffect(() => {
    if (isOpen && supplier) {
      fetchPurchases();
    }
  }, [isOpen, supplier]);

  const fetchPurchases = async () => {
    if (!supplier) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_purchases')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      handleSupabaseError(error, OperationType.LIST, "supplier_purchases");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supplier || !formData.product_name) return;

    try {
      const { error } = await supabase
        .from('supplier_purchases')
        .insert({
          ...formData,
          supplier_id: supplier.id,
          user_id: user.id
        });

      if (error) throw error;
      showToast("Purchase added", "success");
      setIsAdding(false);
      setFormData({ product_name: "", quantity: 1, total_cost: 0, status: "pending" });
      fetchPurchases();
    } catch (error) {
      handleSupabaseError(error, OperationType.WRITE, "supplier_purchases");
    }
  };

  const toggleStatus = async (purchase: SupplierPurchase) => {
    const newStatus = purchase.status === "paid" ? "pending" : "paid";
    try {
      const { error } = await supabase
        .from('supplier_purchases')
        .update({ status: newStatus })
        .eq('id', purchase.id);

      if (error) throw error;
      setPurchases(prev => prev.map(p => p.id === purchase.id ? { ...p, status: newStatus } : p));
      showToast(`Marked as ${newStatus}`, "success");
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, "supplier_purchases");
    }
  };

  const deletePurchase = async (id: string) => {
    if (!confirm("Delete this purchase record?")) return;
    try {
      const { error } = await supabase
        .from('supplier_purchases')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPurchases(prev => prev.filter(p => p.id !== id));
      showToast("Purchase deleted", "success");
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, "supplier_purchases");
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
          className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Purchases: {supplier.name}</h2>
              <p className="text-xs text-slate-500">Track orders and payments</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isAdding ? "bg-slate-100 text-slate-600" : "bg-emerald-600 text-white"
                )}
              >
                {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {isAdding && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                onSubmit={handleAddPurchase}
                className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">New Purchase</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product Name</label>
                    <input
                      required
                      type="text"
                      value={formData.product_name}
                      onChange={e => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                      placeholder="What did you buy?"
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={e => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Cost</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.total_cost}
                      onChange={e => setFormData(prev => ({ ...prev, total_cost: parseFloat(e.target.value) }))}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                    <div className="flex gap-2">
                      {(['pending', 'paid'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all",
                            formData.status === s 
                              ? (s === 'paid' ? "bg-emerald-600 text-white" : "bg-amber-500 text-white")
                              : "bg-white text-slate-400 border border-slate-200"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">
                  Save Purchase
                </button>
              </motion.form>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">No purchase records for this supplier.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchases.map((purchase) => (
                  <div 
                    key={purchase.id}
                    className={cn(
                      "p-4 border rounded-2xl shadow-sm flex justify-between items-center group transition-all",
                      purchase.status === 'paid' 
                        ? "bg-slate-50 border-slate-100 opacity-75" 
                        : "bg-white border-slate-100"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {purchase.status === 'paid' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <h4 className={cn(
                          "font-bold truncate",
                          purchase.status === 'paid' ? "text-slate-500 line-through" : "text-slate-900"
                        )}>
                          {purchase.product_name}
                        </h4>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                          purchase.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {purchase.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Qty: {purchase.quantity}</span>
                        <span>Cost: KES {purchase.total_cost.toLocaleString()}</span>
                        <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button 
                        onClick={() => toggleStatus(purchase)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                          purchase.status === 'paid' 
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50" 
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                        )}
                      >
                        {purchase.status === 'paid' ? "Mark Pending" : "Mark Paid"}
                      </button>
                      <button 
                        onClick={() => deletePurchase(purchase.id)}
                        className="p-2 text-slate-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function AddSupplierModal({ isOpen, onClose, onSuccess, supplier }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSuccess: () => void,
  supplier: Supplier | null
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    category: "General"
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        category: supplier.category || "General"
      });
    } else {
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        category: "General"
      });
    }
  }, [supplier, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name) return;

    setLoading(true);
    try {
      if (supplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', supplier.id);
        if (error) throw error;
        showToast("Supplier updated", "success");
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({
            ...formData,
            user_id: user.id
          });
        if (error) throw error;
        showToast("Supplier added", "success");
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      handleSupabaseError(error, OperationType.WRITE, "suppliers");
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
            <h2 className="text-xl font-bold text-slate-900">
              {supplier ? "Edit Supplier" : "Add Supplier"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Coca Cola Distributors"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={e => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. Beverages"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="07..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="supplier@example.com"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address / Location</label>
              <textarea
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Where are they located?"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-20 resize-none"
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (supplier ? "Update Supplier" : "Add Supplier")}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
