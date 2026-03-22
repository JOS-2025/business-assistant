import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  Percent, 
  Plus, 
  Trash2, 
  Shield, 
  FileText,
  Check, 
  AlertCircle,
  Loader2,
  Globe,
  Bell,
  LogOut,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Briefcase,
  Fingerprint,
  QrCode
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Branch, Profile, UserRole } from "../types/database";
import { cn } from "../lib/utils";
import { logAction } from "../lib/audit";
import { useNavigate } from "react-router";

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Form States
  const [newBranchName, setNewBranchName] = useState("");
  const [vatRate, setVatRate] = useState(profile?.preferences?.vat_rate || 16);
  const [lowStockThreshold, setLowStockThreshold] = useState(profile?.preferences?.low_stock_threshold || 5);
  const [businessName, setBusinessName] = useState(profile?.full_name || "");
  const [currency, setCurrency] = useState(profile?.currency || "KES");
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsapp_number || "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.preferences?.whatsapp_alerts ?? true);

  // 2FA States
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaEnrollment, setMfaEnrollment] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (user && supabase) {
      checkMfaStatus();
    }
  }, [user]);

  const checkMfaStatus = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    const activeFactor = data.all.find(f => f.status === 'verified');
    setMfaEnabled(!!activeFactor);
  };

  const startMfaEnrollment = async () => {
    if (!supabase) return;
    try {
      setEnrolling(true);
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'BusinessAssistantAI',
        friendlyName: user?.email || 'Business Owner'
      });
      if (error) throw error;
      setMfaEnrollment(data);
    } catch (err) {
      showToast("Failed to start 2FA enrollment", "error");
    } finally {
      setEnrolling(false);
    }
  };

  const verifyMfa = async () => {
    if (!supabase || !mfaEnrollment) return;
    try {
      setEnrolling(true);
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaEnrollment.id,
        code: mfaCode
      });
      if (error) throw error;
      showToast("2FA enabled successfully!", "success");
      setMfaEnabled(true);
      setMfaEnrollment(null);
      setMfaCode("");
    } catch (err) {
      showToast("Invalid verification code", "error");
    } finally {
      setEnrolling(false);
    }
  };

  const unenrollMfa = async () => {
    if (!supabase) return;
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.all.find(f => f.status === 'verified');
      if (factor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
        showToast("2FA disabled", "info");
        setMfaEnabled(false);
      }
    } catch (err) {
      showToast("Failed to disable 2FA", "error");
    }
  };

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.full_name || "");
      setCurrency(profile.currency || "KES");
      setWhatsappNumber(profile.whatsapp_number || "");
      setVatRate(profile.preferences?.vat_rate || 16);
      setLowStockThreshold(profile.preferences?.low_stock_threshold || 5);
      setNotificationsEnabled(profile.preferences?.whatsapp_alerts ?? true);
    }
  }, [profile]);

  useEffect(() => {
    if (!user || !supabase) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [branchesRes, staffRes] = await Promise.all([
          supabase.from('branches').select('*').eq('user_id', user.id),
          supabase.from('profiles').select('*').neq('id', user.id) // Get other staff
        ]);

        if (branchesRes.error) throw branchesRes.error;
        if (staffRes.error) throw staffRes.error;

        setBranches(branchesRes.data || []);
        setStaff(staffRes.data || []);
      } catch (err) {
        handleSupabaseError(err, OperationType.LIST, "settings");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!supabase || !user) return;
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: businessName,
          currency: currency,
          whatsapp_number: whatsappNumber,
          preferences: {
            whatsapp_alerts: notificationsEnabled,
            vat_rate: Number(vatRate),
            low_stock_threshold: Number(lowStockThreshold)
          }
        })
        .eq('id', user.id);
      
      if (error) throw error;
      await refreshProfile();
      showToast("Business profile updated!", "success");
      await logAction(user.id, 'update_profile', { 
        businessName, 
        currency, 
        whatsappNumber,
        preferences: {
          whatsapp_alerts: notificationsEnabled,
          vat_rate: vatRate,
          low_stock_threshold: lowStockThreshold
        }
      });
    } catch (err) {
      handleSupabaseError(err, OperationType.UPDATE, "profiles");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddBranch = async () => {
    if (!newBranchName.trim() || !user || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([{ name: newBranchName, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      setBranches([...branches, data]);
      setNewBranchName("");
      showToast("Branch added!", "success");
      await logAction(user.id, 'create_branch', { name: newBranchName });
    } catch (err) {
      handleSupabaseError(err, OperationType.CREATE, "branches");
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!supabase || !user) return;
    try {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
      setBranches(branches.filter(b => b.id !== id));
      showToast("Branch removed.", "info");
      await logAction(user.id, 'delete_branch', { id });
    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, "branches");
    }
  };

  const handleUpdateRole = async (staffId: string, newRole: UserRole) => {
    if (!supabase || !user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', staffId);
      
      if (error) throw error;
      setStaff(staff.map(s => s.id === staffId ? { ...s, role: newRole } : s));
      showToast("Staff role updated.", "success");
      await logAction(user.id, 'update_staff_role', { staffId, newRole });
    } catch (err) {
      handleSupabaseError(err, OperationType.UPDATE, "profiles");
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (profile?.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Shield className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only business owners can access settings.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full pb-24">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your business profile, staff, and preferences.</p>
      </header>

      {/* Business Profile */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Briefcase className="w-5 h-5 text-emerald-600" />
          <h2>Business Profile</h2>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-sm">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
            <Input 
              placeholder="e.g. Muchemi General Store" 
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Currency</label>
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="KES">KES - Kenyan Shilling</option>
              <option value="USD">USD - US Dollar</option>
              <option value="UGX">UGX - Ugandan Shilling</option>
              <option value="TZS">TZS - Tanzanian Shilling</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
            <Input 
              placeholder="e.g. +254 700 000 000" 
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">VAT Rate (%)</label>
              <Input 
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Low Stock Alert</label>
              <Input 
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="rounded-xl"
              />
            </div>
          </div>
          <Button 
            onClick={handleUpdateProfile} 
            disabled={updating}
            className="w-full rounded-xl bg-emerald-600 h-11 font-bold shadow-lg shadow-emerald-600/20"
          >
            {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Profile"}
          </Button>
        </div>
      </section>

      {/* Multi-Branch Support */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Building2 className="w-5 h-5 text-emerald-600" />
          <h2>Branches</h2>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-4 space-y-4 shadow-sm">
          <div className="flex gap-2">
            <Input 
              placeholder="Branch Name (e.g. Westlands Shop)" 
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className="rounded-xl"
            />
            <Button onClick={handleAddBranch} className="rounded-xl bg-emerald-600 shrink-0">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="space-y-2">
            {branches.map(branch => (
              <div key={branch.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-medium text-slate-700">{branch.name}</span>
                <button 
                  onClick={() => handleDeleteBranch(branch.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {branches.length === 0 && !loading && (
              <p className="text-xs text-slate-400 text-center py-2">No branches added yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Staff Accounts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Users className="w-5 h-5 text-emerald-600" />
          <h2>Staff Accounts</h2>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-4 space-y-4 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Current Staff</p>
          <div className="space-y-3">
            {staff.map(member => (
              <div key={member.id} className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">{member.full_name || 'Unnamed Staff'}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    member.role === 'manager' ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-600"
                  )}>
                    {member.role}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateRole(member.id, 'staff')}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all",
                      member.role === 'staff' ? "bg-white border-emerald-600 text-emerald-600" : "bg-transparent border-slate-200 text-slate-400"
                    )}
                  >
                    Staff
                  </button>
                  <button 
                    onClick={() => handleUpdateRole(member.id, 'manager')}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all",
                      member.role === 'manager' ? "bg-white border-emerald-600 text-emerald-600" : "bg-transparent border-slate-200 text-slate-400"
                    )}
                  >
                    Manager
                  </button>
                </div>
              </div>
            ))}
            {staff.length === 0 && !loading && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">No staff members found.</p>
                <p className="text-[10px] text-slate-300 mt-1">Invite staff by sharing your business ID.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Fingerprint className="w-5 h-5 text-emerald-600" />
          <h2>Security</h2>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Two-Factor Authentication</p>
              <p className="text-[10px] text-slate-500">Secure your account with an authenticator app.</p>
            </div>
            <button 
              onClick={() => mfaEnabled ? unenrollMfa() : startMfaEnrollment()}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                mfaEnabled ? "bg-emerald-600" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                mfaEnabled ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          {mfaEnrollment && (
            <div className="p-4 bg-slate-50 rounded-2xl space-y-4 animate-in slide-in-from-top-2">
              <div className="flex flex-col items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                  <QRCodeSVG value={mfaEnrollment.totp.qr_code} size={160} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700">Scan this QR Code</p>
                  <p className="text-[10px] text-slate-400">Use Google Authenticator or Authy</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Code</label>
                <div className="flex gap-2">
                  <Input 
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="000000"
                    className="text-center tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                  <Button 
                    onClick={verifyMfa}
                    disabled={mfaCode.length !== 6 || enrolling}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Preferences */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Bell className="w-5 h-5 text-emerald-600" />
          <h2>Preferences</h2>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">WhatsApp Alerts</p>
              <p className="text-[10px] text-slate-500">Receive daily summaries on WhatsApp.</p>
            </div>
            <button 
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                notificationsEnabled ? "bg-emerald-600" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                notificationsEnabled ? "right-1" : "left-1"
              )} />
            </button>
          </div>
          <div className="pt-4 border-t border-slate-50">
            <button 
              onClick={() => navigate('/policies')}
              className="w-full flex items-center justify-between text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-slate-400" />
                App Policies
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-red-600 font-bold">
          <AlertCircle className="w-5 h-5" />
          <h2>Account</h2>
        </div>
        <div className="bg-white rounded-3xl border border-red-50 p-4 space-y-4 shadow-sm">
          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </section>

      <div className="text-center space-y-2">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Business Assistant AI v2.1.0</p>
        <p className="text-[10px] text-slate-300">Powered by Gemini AI</p>
      </div>
    </div>
  );
}
