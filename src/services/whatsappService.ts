import { Transaction, Customer, Profile } from "../types/database";

export interface WhatsAppMessage {
  phone: string;
  message: string;
}

export const sendWhatsAppReceipt = async (
  transaction: Transaction, 
  customer?: Customer | null,
  profile?: Profile | null
) => {
  if (!customer?.phone) return;

  const businessName = profile?.full_name || "Our Business";
  const currency = profile?.currency || "KES";
  
  const message = `*Receipt from ${businessName}*
--------------------------
Date: ${new Date(transaction.created_at).toLocaleDateString()}
Items: ${transaction.description}
Qty: ${transaction.quantity || 1}
Total: ${currency} ${transaction.amount.toLocaleString()}
--------------------------
Thank you for your business!`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodedMessage}`;
  
  // In a real app, we might use an API. For now, we open the link.
  window.open(whatsappUrl, '_blank');
};

export const sendDailyBrief = async (
  phone: string,
  stats: { sales: number; expenses: number; profit: number },
  businessName: string
) => {
  const message = `*Daily Business Brief: ${businessName}*
--------------------------
Date: ${new Date().toLocaleDateString()}
Total Sales: KES ${stats.sales.toLocaleString()}
Total Expenses: KES ${stats.expenses.toLocaleString()}
Net Profit: KES ${stats.profit.toLocaleString()}
--------------------------
Keep up the great work!`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
};
