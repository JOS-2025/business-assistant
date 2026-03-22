import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  ChevronRight,
  Loader2
} from "lucide-react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { format } from 'date-fns';
import { cn } from "../lib/utils";
import { AuditLog } from "../types/database";

export default function AuditLogs() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user || !supabase) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        handleSupabaseError(err, OperationType.LIST, "audit_logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'owner' && profile?.role !== 'manager') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Shield className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only owners and managers can view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-md mx-auto w-full">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">Track all business actions for transparency.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search logs..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Fetching logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No logs found.</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 capitalize">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {format(new Date(log.created_at), 'MMM d, HH:mm')}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <pre className="text-[10px] text-slate-500 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
