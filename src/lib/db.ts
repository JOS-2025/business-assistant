import Dexie, { Table } from 'dexie';
import { Transaction, Product, Customer, Branch, Debt, Supplier, SupplierPurchase } from '../types/database';

export interface PendingTransaction extends Transaction {
  synced: boolean;
}

export class OfflineDB extends Dexie {
  transactions!: Table<PendingTransaction>;
  products!: Table<Product>;
  customers!: Table<Customer>;
  branches!: Table<Branch>;
  debts!: Table<Debt>;
  suppliers!: Table<Supplier>;
  supplier_purchases!: Table<SupplierPurchase>;

  constructor() {
    super('BusinessAssistantOffline');
    this.version(4).stores({
      transactions: '++id, user_id, type, synced, created_at',
      products: 'id, user_id, name, category',
      customers: 'id, user_id, name, phone',
      branches: 'id, user_id, name',
      debts: 'id, user_id, customer_name, status',
      suppliers: 'id, user_id, name',
      supplier_purchases: 'id, user_id, supplier_id, status'
    });
  }
}

export const offlineDb = new OfflineDB();
