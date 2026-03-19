import { useState, useEffect } from "react";
import { supabase, handleSupabaseError, OperationType } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Calendar, 
  Download,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  DollarSign
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import { motion } from "motion/react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { cn } from "../lib/utils";

interface Transaction {
  id: string;
  type: 'sale' | 'expense';
  amount: number;
  category: string;
  created_at: string;
  product_id?: string;
  quantity?: number;
}

interface Product {
  id: string;
  name: string;
  total_sold: number;
  total_bought: number;
  stock: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'month'>('7d');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        throw new Error("Supabase is not configured. Please set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the secrets panel.");
      }
      
      let startDate = subDays(new Date(), 7);
      if (timeRange === '30d') startDate = subDays(new Date(), 30);
      if (timeRange === 'month') startDate = startOfMonth(new Date());

      const [transRes, prodRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user?.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('products')
          .select('*')
          .eq('user_id', user?.id)
      ]);

      const { data: transData, error: transError } = transRes;
      const { data: prodData, error: prodError } = prodRes;

      if (transError) throw transError;
      if (prodError) throw prodError;

      setTransactions(transData || []);
      setProducts(prodData || []);
    } catch (error) {
      handleSupabaseError(error, OperationType.LIST, "reports");
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const dailyDataRaw = eachDayOfInterval({
    start: timeRange === '7d' ? subDays(new Date(), 6) : 
           timeRange === '30d' ? subDays(new Date(), 29) : 
           startOfMonth(new Date()),
    end: new Date()
  }).map(date => {
    const dayTrans = transactions.filter(t => isSameDay(new Date(t.created_at), date));
    const sales = dayTrans.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const expenses = dayTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return {
      date: format(date, 'MMM d'),
      sales,
      expenses,
      profit: sales - expenses
    };
  });

  // Calculate Trend Line for Profit (Linear Regression)
  const n = dailyDataRaw.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  dailyDataRaw.forEach((d, i) => {
    sumX += i;
    sumY += d.profit;
    sumXY += i * d.profit;
    sumX2 += i * i;
  });
  
  const denominator = (n * sumX2 - sumX * sumX);
  const m = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;

  const dailyData = dailyDataRaw.map((d, i) => ({
    ...d,
    profitTrend: m * i + b
  }));

  const categoryData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, []);

  const topProducts = products
    .sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
    .slice(0, 5);

  const totalSales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalSales - totalExpenses;

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-y-auto pb-10">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-slate-900">Business Reports</h1>
          <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          {(['7d', '30d', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                timeRange === range ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
              )}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'This Month'}
            </button>
          ))}
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales</span>
            </div>
            <p className="text-xl font-bold text-slate-900">KES {totalSales.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Expenses</span>
            </div>
            <p className="text-xl font-bold text-slate-900">KES {totalExpenses.toLocaleString()}</p>
          </div>
          <div className="col-span-2 bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-600/20 text-white">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Net Profit</p>
                <p className="text-2xl font-bold">KES {netProfit.toLocaleString()}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium">
              <ArrowUpRight className="w-4 h-4" />
              <span>{((netProfit / (totalExpenses || 1)) * 100).toFixed(1)}% Margin</span>
            </div>
          </div>
        </div>

        {/* Sales vs Expenses Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Performance Over Time
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(value) => `K${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" name="Sales" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="transparent" strokeDasharray="5 5" name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={false} name="Net Profit" />
                <Line type="monotone" dataKey="profitTrend" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 3" dot={false} name="Profit Trend" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expenses by Category */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-amber-500" />
              Expense Distribution
            </h3>
            {categoryData.length > 0 ? (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `KES ${value.toLocaleString()}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-slate-900 font-bold text-xs"
                      >
                        KES {totalExpenses > 1000 ? `${(totalExpenses / 1000).toFixed(1)}k` : totalExpenses}
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                  {categoryData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[10px] font-medium text-slate-600 truncate capitalize">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-900">
                        {((item.value / (totalExpenses || 1)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <PieChartIcon className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-xs">No expense data for this period</p>
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Top Selling Products
            </h3>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{product.name}</p>
                      <p className="text-[10px] text-slate-500">{product.total_sold} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600">
                      {((product.total_sold / (products.reduce((sum, p) => sum + (p.total_sold || 0), 0) || 1)) * 100).toFixed(0)}%
                    </p>
                    <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${(product.total_sold / (products.reduce((sum, p) => sum + (p.total_sold || 0), 0) || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
