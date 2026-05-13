import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getProjects, getAllTrades, getAllPayments } from '../services/api';
import { Project, Trade, Payment, PeriodKey, PERIOD_OPTIONS, getPeriodDates } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, Building, DollarSign, Wallet, Package, Calendar, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } } };

const fmt = (n: number) => n.toLocaleString('fr-MA');

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showPeriod, setShowPeriod] = useState(false);

  useEffect(() => {
    if (!user) return;
    let pLoaded = false, tLoaded = false, payLoaded = false;
    const check = () => { if (pLoaded && tLoaded && payLoaded) setLoading(false); };
    
    const u1 = getProjects(user.uid, d => { setProjects(d); pLoaded = true; check(); }, () => { setLoading(false); });
    const u2 = getAllTrades(user.uid, d => { setTrades(d); tLoaded = true; check(); }, () => { setLoading(false); });
    const u3 = getAllPayments(user.uid, d => { setPayments(d); payLoaded = true; check(); }, () => { setLoading(false); });
    
    return () => { u1(); u2(); u3(); };
  }, [user]);

  const filteredPayments = useMemo(() => {
    const { start, end } = getPeriodDates(period, customStart ? new Date(customStart) : undefined, customEnd ? new Date(customEnd) : undefined);
    return payments.filter(p => p.date && p.date >= start && p.date <= end);
  }, [payments, period, customStart, customEnd]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-5">
        <div className="w-10 h-10 border-t-2 border-r-2 border-[#D4AF37] rounded-full animate-spin" />
        <span className="font-playfair text-[10px] uppercase tracking-[0.3em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>Initializing Matrix...</span>
      </div>
    );
  }

  const safeNum = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n; };

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'ongoing').length;

  // Global Budget from Trades
  const globalBudget = Number(trades.reduce((sum, t) => sum + safeNum(t.budget || t.amount), 0).toFixed(2));

  // If period is "all", we can just sum up the existing trade totals for exactness, or sum up payments.
  // For period filtering, we sum up filtered payments.
  let filteredAdvances = 0;
  let filteredExpenses = 0;

  if (period === 'all') {
    filteredAdvances = Number(trades.reduce((sum, t) => sum + safeNum(t.totalClientAdvances || t.totalAdvances), 0).toFixed(2));
    filteredExpenses = Number(trades.reduce((sum, t) => sum + safeNum(t.totalLaborExpenses) + safeNum(t.totalMaterialExpenses), 0).toFixed(2));
  } else {
    filteredAdvances = Number(filteredPayments.filter(p => p.type === 'client_advance' || p.type === 'advance' || p.type === 'income').reduce((s, p) => s + safeNum(p.amount), 0).toFixed(2));
    filteredExpenses = Number(filteredPayments.filter(p => p.type === 'labor_expense' || p.type === 'material_expense' || p.type === 'expense').reduce((s, p) => s + safeNum(p.amount), 0).toFixed(2));
  }

  const filteredBalance = Number((filteredAdvances - filteredExpenses).toFixed(2));

  const tradesWithWarnings = trades.filter((t) => {
    const budget = safeNum(t.budget || t.amount);
    const expenses = safeNum(t.totalLaborExpenses) + safeNum(t.totalMaterialExpenses);
    return budget > 0 && expenses > budget;
  });

  const projectChartData = projects.map(p => {
    const pt = trades.filter(t => t.projectId === p.id);
    return {
      name: p.name.length > 10 ? p.name.substring(0, 10) + '…' : p.name,
      Budget: pt.reduce((s, t) => s + safeNum(t.budget || t.amount), 0),
      Advances: pt.reduce((s, t) => s + safeNum(t.totalClientAdvances || t.totalAdvances), 0),
      Expenses: pt.reduce((s, t) => s + safeNum(t.totalLaborExpenses) + safeNum(t.totalMaterialExpenses), 0),
    };
  });

  // Monthly flow data for area chart
  const flowData = useMemo(() => {
    const months = new Map<string, { month: string; income: number; expense: number }>();
    filteredPayments.forEach(p => {
      if (!p.date) return;
      const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(key)) months.set(key, { month: key, income: 0, expense: 0 });
      const m = months.get(key)!;
      if (p.type === 'client_advance' || p.type === 'advance' || p.type === 'income') m.income += safeNum(p.amount);
      else m.expense += safeNum(p.amount);
    });
    return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredPayments]);

  const periodLabel = PERIOD_OPTIONS.find(o => o.key === period)?.[lang === 'fr' ? 'labelFr' : 'labelEn'] || 'All';

  const kpiCards = [
    { label: t('dash_kpi_projects'), value: totalProjects, sub: `${activeProjects} ${t('dash_kpi_active')}`, subColor: 'var(--elite-gold)', icon: <Building size={16} style={{ color: 'var(--elite-gold)' }} />, valueColor: 'var(--foreground)' },
    { label: t('dash_kpi_advances'), value: `€${fmt(filteredAdvances)}`, sub: t('dash_kpi_allocated'), subColor: 'var(--elite-gold)', icon: <DollarSign size={16} style={{ color: 'var(--elite-gold)' }} />, valueColor: 'var(--foreground)' },
    { label: t('dash_kpi_expenses'), value: `€${fmt(filteredExpenses)}`, sub: `€${fmt(globalBudget)} ${t('dash_kpi_budget')}`, subColor: '#f87171', icon: <TrendingUp size={16} style={{ color: '#f87171' }} />, valueColor: 'var(--foreground)' },
    { label: t('dash_kpi_balance'), value: `€${fmt(filteredBalance)}`, sub: tradesWithWarnings.length === 0 ? t('dash_kpi_no_risk') : `${tradesWithWarnings.length} ${t('dash_kpi_risk')}`, subColor: filteredBalance < 0 ? '#f87171' : '#34d399', icon: <AlertCircle size={16} style={{ color: filteredBalance < 0 ? '#f87171' : '#34d399' }} />, valueColor: filteredBalance < 0 ? '#f87171' : '#34d399' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header + Period */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] text-foreground uppercase mb-2">{t('dash_title')}</h1>
          <p className="elite-text-silver">{t('dash_welcome')}, {user?.displayName?.split(' ')[0] || 'User'}. {t('dash_summary')}</p>
        </div>
        {/* Period Selector */}
        <div className="relative">
          <button onClick={() => setShowPeriod(!showPeriod)} className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-200" style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)', color: 'var(--elite-gold)' }}>
            <Calendar size={13} /> {periodLabel} <ChevronDown size={12} className={`transition-transform ${showPeriod ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showPeriod && (
              <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden min-w-[200px]"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)', backdropFilter: 'blur(40px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                {PERIOD_OPTIONS.map(o => (
                  <button key={o.key} onClick={() => { setPeriod(o.key); if (o.key !== 'custom') setShowPeriod(false); }}
                    className="w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-150"
                    style={{ color: period === o.key ? 'var(--elite-gold)' : 'var(--text-silver)', background: period === o.key ? 'rgba(212,175,55,0.08)' : 'transparent', borderBottom: '1px solid var(--card-border)' }}>
                    {lang === 'fr' ? o.labelFr : o.labelEn}
                  </button>
                ))}
                {period === 'custom' && (
                  <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                    <div>
                      <label className="block text-[8px] font-bold uppercase tracking-[0.2em] mb-1 text-muted-foreground">{t('dash_custom_from') || 'From'}</label>
                      <input type="date" className="elite-input [color-scheme:dark] text-[11px] w-full" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold uppercase tracking-[0.2em] mb-1 text-muted-foreground">{t('dash_custom_to') || 'To'}</label>
                      <input type="date" className="elite-input [color-scheme:dark] text-[11px] w-full" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                    </div>
                    <button onClick={() => setShowPeriod(false)} className="elite-button w-full py-2 text-[10px] uppercase tracking-[0.1em]">OK</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={container} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiCards.map((card, i) => (
          <motion.div variants={item} key={i}>
            <Card className="elite-card group h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10 mb-3" style={{ borderBottom: '1px solid var(--card-border)', padding: '16px 16px 10px' }}>
                <CardTitle className="text-[8px] font-bold uppercase tracking-[0.2em] leading-tight" style={{ color: 'var(--text-silver)' }}>{card.label}</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0" style={{ border: '1px solid var(--card-border)' }}>{card.icon}</div>
              </CardHeader>
              <CardContent className="relative z-10" style={{ padding: '0 16px 16px' }}>
                <div className="text-xl md:text-2xl lg:text-3xl font-playfair font-black tracking-tight leading-none" style={{ color: card.valueColor }}>{card.value}</div>
                <p className="text-[9px] font-bold tracking-wide mt-2 uppercase leading-tight" style={{ color: card.subColor }}>{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Area Chart */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid var(--card-border)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black text-foreground uppercase tracking-[0.1em]">{t('dash_flow_title') || 'Cash Flow'}</CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase text-muted-foreground">{t('dash_flow_sub') || 'Income vs Expenses over time'}</CardDescription>
            </CardHeader>
            <CardContent className="chart-responsive" style={{ padding: '20px 8px 8px' }}>
              {flowData.length === 0 ? (
                <div className="h-full flex items-center justify-center"><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{t('dash_no_data')}</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flowData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="month" fontSize={8} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-silver)' }} />
                    <YAxis fontSize={8} tickLine={false} axisLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--text-silver)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '10px', border: '1px solid var(--card-border)', padding: '10px', color: 'var(--foreground)', fontSize: '10px' }} formatter={(v: number) => [`€${fmt(v)}`]} />
                    <defs>
                      <linearGradient id="fI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--elite-gold)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--elite-gold)" stopOpacity={0} /></linearGradient>
                      <linearGradient id="fE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.3} /><stop offset="100%" stopColor="#f87171" stopOpacity={0} /></linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="income" stroke="var(--elite-gold)" fill="url(#fI)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" stroke="#f87171" fill="url(#fE)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Project Bar Chart */}
        <motion.div variants={item}>
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid var(--card-border)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black text-foreground uppercase tracking-[0.1em]">{t('dash_chart_title')}</CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase text-muted-foreground">{t('dash_chart_sub')}</CardDescription>
            </CardHeader>
            <CardContent className="chart-responsive" style={{ padding: '20px 8px 8px' }}>
              {projectChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center"><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{t('dash_no_data')}</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-silver)' }} dy={14} />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--text-silver)' }} />
                    <Tooltip cursor={{ fill: 'var(--body-bg-start)' }} contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '10px', border: '1px solid var(--card-border)', padding: '10px 14px', color: 'var(--foreground)', fontSize: '10px', textTransform: 'uppercase' as any, letterSpacing: '0.1em' }} formatter={(v: number) => [`€${fmt(v)}`]} />
                    <Bar dataKey="Advances" fill="var(--elite-gold)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="Expenses" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Critical Ledger (Risks) */}
      <motion.div variants={item}>
        <Card className="elite-card overflow-hidden">
          <CardHeader style={{ borderBottom: '1px solid var(--card-border)', padding: '24px 24px 20px' }}>
            <CardTitle className="text-lg font-playfair font-black text-foreground uppercase tracking-[0.1em]">{t('dash_ledger_title') || 'Critical Ledger'}</CardTitle>
            <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase text-muted-foreground">{t('dash_ledger_sub') || 'Trades Exceeding Budget'}</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            {tradesWithWarnings.length === 0 ? (
              <div className="py-20 text-center"><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{t('dash_ledger_clear') || 'No critical warnings detected'}</p></div>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['Project', 'Trade', 'Budget', 'Expenses', 'Overbudget'].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] ${i >= 2 ? 'text-right' : ''}`} style={{ color: 'var(--elite-gold)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tradesWithWarnings.map(t => {
                    const project = projects.find(p => p.id === t.projectId);
                    const expenses = safeNum(t.totalLaborExpenses) + safeNum(t.totalMaterialExpenses);
                    const budget = safeNum(t.budget || t.amount);
                    const over = expenses - budget;
                    return (
                      <tr key={t.id} className="transition-colors duration-200" style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td className="px-6 py-4">
                          <Link to={`/projects/${t.projectId}`} className="hover:text-[var(--elite-gold)] transition-colors">
                            <p className="font-playfair font-black text-foreground uppercase tracking-[0.04em]">{project?.name || 'Unknown'}</p>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase">{t.designation}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-foreground">€{fmt(budget)}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: '#f87171' }}>€{fmt(expenses)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-lg font-playfair font-black" style={{ color: '#f87171', textShadow: `0 0 12px rgba(248,113,113,0.3)` }}>
                            +€{fmt(over)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
