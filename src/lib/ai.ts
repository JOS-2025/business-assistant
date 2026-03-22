import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Product } from "../types/database";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please add it to your secrets.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export type TransactionType = 'sale' | 'expense' | 'debt' | 'payment';

export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  productName?: string;
  quantity?: number;
  customerName?: string;
}

export async function parseTransactionMessage(message: string): Promise<ParsedTransaction | null> {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following message into a structured transaction. 
      
      Examples:
      - "Sold 5 bags of cement for 4500" -> {"type": "sale", "amount": 4500, "category": "sales", "description": "Sold 5 bags of cement", "productName": "cement", "quantity": 5}
      - "Bought fuel for the delivery truck 2000" -> {"type": "expense", "amount": 2000, "category": "transport", "description": "Fuel for delivery truck"}
      - "Paid rent for March 15000" -> {"type": "expense", "amount": 15000, "category": "rent", "description": "March rent"}
      - "Confirmed. KES 1,200.00 received from JANE DOE 0712345678 on 18/3/26 at 1:12 PM." -> {"type": "sale", "amount": 1200, "category": "sales", "description": "M-Pesa payment from JANE DOE", "customerName": "JANE DOE"}
      - "Bought 10 crates of soda for 6000" -> {"type": "expense", "amount": 6000, "category": "stock", "description": "10 crates of soda", "productName": "soda", "quantity": 10}
      - "Received 5000 from a friend as a gift" -> {"type": "sale", "amount": 5000, "category": "other income", "description": "Gift received"}
      - "Sold 2 bags of fertilizer for 3000 each to Mama Njoroge" -> {"type": "sale", "amount": 6000, "category": "sales", "description": "Sold 2 bags of fertilizer to Mama Njoroge", "productName": "fertilizer", "quantity": 2, "customerName": "Mama Njoroge"}
      
      Message: "${message}"`,
      config: {
        systemInstruction: `You are a financial assistant for small businesses in Africa. 
        Your task is to parse user messages into a structured JSON object representing a transaction.
        
        Rules:
        1. Categories MUST be one of: sales, other income, stock, rent, transport, salary, utilities, marketing, other.
        2. If the message indicates money coming in (sales, gifts, interest), type is 'sale'.
        3. If the message indicates money going out (buying stock, paying bills, transport), type is 'expense'.
        4. For M-Pesa receipts, extract the amount and treat it as a 'sale' in the 'sales' category.
        5. The description should be concise but informative.
        6. If a product name and quantity are mentioned (e.g., "5 bags of cement", "10 crates of soda"), extract them into 'productName' and 'quantity'.
        7. If a customer name is mentioned, extract it into 'customerName'.
        8. If the message is ambiguous, make the best guess based on common business practices.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: "Must be either 'sale', 'expense', 'debt', or 'payment'",
              enum: ["sale", "expense", "debt", "payment"]
            },
            amount: {
              type: Type.NUMBER,
              description: "The monetary amount of the transaction"
            },
            category: {
              type: Type.STRING,
              description: "The category of the transaction (e.g., sales, other income, stock, rent, transport, salary, utilities, marketing, other)"
            },
            description: {
              type: Type.STRING,
              description: "A short, clean description of the transaction"
            },
            productName: {
              type: Type.STRING,
              description: "The name of the product mentioned, if any"
            },
            quantity: {
              type: Type.NUMBER,
              description: "The quantity of the product mentioned, if any"
            },
            customerName: {
              type: Type.STRING,
              description: "The name of the customer mentioned, if any"
            }
          },
          required: ["type", "amount", "category", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as ParsedTransaction;
  } catch (error) {
    console.error("Error parsing transaction:", error);
    return null;
  }
}

export interface DemandForecast {
  product_id: string;
  product_name: string;
  predicted_stock_out_days: number;
  recommendation: string;
}

export async function getDemandForecasting(products: Product[], transactions: Transaction[]): Promise<DemandForecast[]> {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these products and transactions to forecast demand. 
      Products: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, stock: p.stock })))}
      Recent Transactions: ${JSON.stringify(transactions.slice(0, 50).map(t => ({ product_id: t.product_id, type: t.type, quantity: t.quantity, date: t.created_at })))}
      
      Return a JSON array of forecasts for products at risk of stock-out.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              product_id: { type: Type.STRING },
              product_name: { type: Type.STRING },
              predicted_stock_out_days: { type: Type.NUMBER },
              recommendation: { type: Type.STRING }
            },
            required: ['product_id', 'product_name', 'predicted_stock_out_days', 'recommendation']
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Forecasting Error:", error);
    return [];
  }
}

export interface SmartDiscount {
  product_id: string;
  product_name: string;
  suggested_discount_percent: number;
  reason: string;
}

export async function getSmartDiscounts(products: Product[], transactions: Transaction[]): Promise<SmartDiscount[]> {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify "dead stock" (products not moving) and suggest discounts.
      Products: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, stock: p.stock, price: p.price })))}
      Recent Transactions: ${JSON.stringify(transactions.slice(0, 100).map(t => ({ product_id: t.product_id, type: t.type, date: t.created_at })))}
      
      Return a JSON array of suggested discounts.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              product_id: { type: Type.STRING },
              product_name: { type: Type.STRING },
              suggested_discount_percent: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            },
            required: ['product_id', 'product_name', 'suggested_discount_percent', 'reason']
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Discounting Error:", error);
    return [];
  }
}

export interface CashFlowRunway {
  runway_days: number;
  monthly_burn_rate: number;
  monthly_revenue: number;
  advice: string;
}

export async function getCashFlowForecasting(transactions: Transaction[], currentBalance: number): Promise<CashFlowRunway | null> {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these transactions and current balance to calculate cash flow runway.
      Current Balance: ${currentBalance}
      Recent Transactions: ${JSON.stringify(transactions.slice(0, 100).map(t => ({ type: t.type, amount: t.amount, date: t.created_at })))}
      
      Return a JSON object with runway details.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            runway_days: { type: Type.NUMBER },
            monthly_burn_rate: { type: Type.NUMBER },
            monthly_revenue: { type: Type.NUMBER },
            advice: { type: Type.STRING }
          },
          required: ['runway_days', 'monthly_burn_rate', 'monthly_revenue', 'advice']
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Cash Flow Error:", error);
    return null;
  }
}
