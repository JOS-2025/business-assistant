import { Outlet, NavLink } from "react-router";
import { 
  Home, 
  Package, 
  MessageSquarePlus, 
  User, 
  Cloud, 
  CloudOff, 
  MoreHorizontal, 
  Truck, 
  BarChart3, 
  DollarSign,
  X
} from "lucide-react";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";

export default function Layout() {
  const [isConnected, setIsConnected] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsConnected(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
      }
    });

    const checkConnection = async () => {
      if (!supabase) {
        setIsConnected(false);
        return;
      }
      try {
        const { error } = await supabase.from('products').select('id').limit(1);
        if (error && error.message.includes('fetch')) {
          setIsConnected(false);
        } else {
          setIsConnected(true);
        }
      } catch (err) {
        setIsConnected(false);
      }
    };

    const interval = setInterval(checkConnection, 30000);
    checkConnection();

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <div className={cn(
        "h-1 w-full transition-colors duration-500",
        isConnected ? "bg-emerald-500" : "bg-red-500"
      )} />
      
      <main className="flex-1 flex flex-col min-h-0 pb-[76px]">
        <Outlet />
      </main>
      
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 px-4 py-3 flex justify-between items-center z-50 pb-4 h-[76px]">
        <NavLink 
          to="/" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-colors min-w-[60px]",
            isActive ? "text-emerald-600" : "text-slate-400 hover:text-slate-900"
          )}
        >
          <Home className="w-6 h-6" />
          <span>Home</span>
        </NavLink>
        
        <NavLink 
          to="/products" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-colors min-w-[60px]",
            isActive ? "text-emerald-600" : "text-slate-400 hover:text-slate-900"
          )}
        >
          <Package className="w-6 h-6" />
          <span>Stock</span>
        </NavLink>
        
        <NavLink 
          to="/chat" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-colors min-w-[60px]",
            isActive ? "text-emerald-600" : "text-slate-400 hover:text-slate-900"
          )}
        >
          <div className="bg-emerald-600 text-white p-3 rounded-full -mt-8 shadow-lg shadow-emerald-600/20">
            <MessageSquarePlus className="w-6 h-6" />
          </div>
          <span className="mt-1">Add</span>
        </NavLink>
        
        <NavLink 
          to="/debts" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-colors min-w-[60px]",
            isActive ? "text-emerald-600" : "text-slate-400 hover:text-slate-900"
          )}
        >
          <DollarSign className="w-6 h-6" />
          <span>Deni</span>
        </NavLink>
        
        <button 
          onClick={() => setIsMoreMenuOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-colors min-w-[60px]",
            isMoreMenuOpen ? "text-emerald-600" : "text-slate-400 hover:text-slate-900"
          )}
        >
          <MoreHorizontal className="w-6 h-6" />
          <span>More</span>
        </button>
      </nav>

      {/* More Menu Drawer */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[70] p-8 pb-12 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-slate-900">More Features</h2>
                <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <NavLink 
                  to="/suppliers" 
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <Truck className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Suppliers</span>
                </NavLink>

                <NavLink 
                  to="/reports" 
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Reports</span>
                </NavLink>

                <NavLink 
                  to="/profile" 
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Profile</span>
                </NavLink>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
