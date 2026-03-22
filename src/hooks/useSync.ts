import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { offlineDb } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

export function useSync() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && user) {
      syncPendingTransactions();
      syncMetadata();
    }
  }, [isOnline, user]);

  const syncMetadata = async () => {
    if (!user || !supabase) return;

    try {
      const [productsRes, customersRes, branchesRes, debtsRes, transRes, suppliersRes, purchasesRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id),
        supabase.from('customers').select('*').eq('user_id', user.id),
        supabase.from('branches').select('*').eq('user_id', user.id),
        supabase.from('debts').select('*').eq('user_id', user.id),
        supabase.from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('suppliers').select('*').eq('user_id', user.id),
        supabase.from('supplier_purchases').select('*').eq('user_id', user.id)
      ]);

      if (productsRes.data) {
        await offlineDb.products.clear();
        await offlineDb.products.bulkPut(productsRes.data);
      }

      if (customersRes.data) {
        await offlineDb.customers.clear();
        await offlineDb.customers.bulkPut(customersRes.data);
      }

      if (branchesRes.data) {
        await offlineDb.branches.clear();
        await offlineDb.branches.bulkPut(branchesRes.data);
      }

      if (debtsRes.data) {
        await offlineDb.debts.clear();
        await offlineDb.debts.bulkPut(debtsRes.data);
      }

      if (suppliersRes.data) {
        await offlineDb.suppliers.clear();
        await offlineDb.suppliers.bulkPut(suppliersRes.data);
      }

      if (purchasesRes.data) {
        await offlineDb.supplier_purchases.clear();
        await offlineDb.supplier_purchases.bulkPut(purchasesRes.data);
      }

      if (transRes.data) {
        // Only sync transactions that are not already in IndexedDB as pending
        const pendingIds = (await offlineDb.transactions.where('synced').equals(0).toArray()).map(t => t.id);
        const toSync = transRes.data.filter(t => !pendingIds.includes(t.id)).map(t => ({ ...t, synced: true }));
        
        // We clear non-pending transactions first to avoid duplicates or old data
        await offlineDb.transactions.where('synced').equals(1).delete();
        await offlineDb.transactions.bulkPut(toSync as any);
      }
    } catch (error) {
      if (error instanceof Error && (error as any).isNetworkError) {
        // Silently fail for network errors during background sync
        console.log('Metadata sync deferred: Connection lost');
      } else {
        console.error('Metadata sync failed:', error);
      }
    }
  };

  const syncPendingTransactions = async () => {
    if (syncing) return;
    
    try {
      const pending = await offlineDb.transactions
        .where('synced')
        .equals(0) // 0 for false in IndexedDB (Dexie handles bool as 0/1 in some cases)
        .toArray();

      if (pending.length === 0) return;

      setSyncing(true);
      console.log(`Syncing ${pending.length} transactions...`);

      for (const tx of pending) {
        const { id, synced, ...txData } = tx;
        const { error } = await supabase
          .from('transactions')
          .insert([txData]);

        if (!error) {
          await offlineDb.transactions.update(id, { synced: true });
        } else {
          console.error('Sync error for tx:', id, error);
        }
      }

      showToast(`Successfully synced ${pending.length} offline transactions!`, 'success');
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return { isOnline, syncing, syncPendingTransactions };
}
