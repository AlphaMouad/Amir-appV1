import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getProjects, getAllTravaux, getAllPayments } from '../services/api';
import { Project, Travaux, Payment, PeriodKey, PERIOD_OPTIONS, getPeriodDates, travauxBalance, travauxSpending } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, TrendingDown, Building, DollarSign, Wallet, Package, Calendar, ChevronDown } from 'lucide-react';
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
  const [travaux, setTravaux] = useState<Travaux[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showPeriod, setShowPeriod] = useState(false);

  useEffect(() => {
    if (!user) return;
    let a = false, b = false, c = false;
    const check = () => { if (a && b && c) setLoading(false); };
    const u1 = getProjects(user.uid, d => { setProjects(d); a = true; check(); }, () => { setLoading(false); });
    const u2 = getAllTravaux(user.uid, d => { setTravaux(d); b = true; check(); }, () => { setLoading(false); });
    const u3 = getAllPayments(user.uid, d => { setPayments(d); c = true; check(); }, () => { setLoading(false); });
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
        <span className="font-playfair text-[10px] uppercase tracking-[0.3em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>Initializing...</span>
      </div>
    );
  }

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'ongoing').length;
  const totalBudget = travaux.reduce((s, t) => s + t.budget, 0);
  const totalClientAdv = travaux.reduce((s, t) => s + t.totalClientAdvances, 0);
  const totalSpending = travaux.reduce((s, t) => s + travauxSpending(t), 0);
  const netPosition = totalClientAdv - totalSpending;

  const periodClientAdv = filteredPayments.filter(p => p.type === 'client_advance').reduce((s, p) => s + p.amount, 0);
  const periodMainDoeuvre = filteredPayments.filter(p => p.type === 'main_doeuvre').reduce((s, p) => s + p.amount, 0);
  const periodFourniture = filteredPayments.filter(p => p.type === 'fourniture').reduce((s, p) => s + p.amount, 0);

  const projectChartData = projects.map(p => {
    const pt = travaux.filter(t => t.projectId === p.id);
    return {
      name: p.name.length > 10 ? p.name.substring(0, 10) + '…' : p.name,
      Budget: pt.reduce((s, t) => s + t.budget, 0),
      Advances: pt.reduce((s, t) => s + t.totalClientAdvances, 0),
      Spending: pt.reduce((s, t) => s + travauxSpending(t), 0),
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
      if (p.type === 'client_advance') m.income += p.amount;
      else m.expense += p.amount;
    });
    return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredPayments]);

  const projectPnL = projects.map(p => {
    const pt = travaux.filter(t => t.projectId === p.id);
    const budget = pt.reduce((s, t) => s + t.budget, 0);
    const adv = pt.reduce((s, t) => s + t.totalClientAdvances, 0);
    const spend = pt.reduce((s, t) => s + travauxSpending(t), 0);
    const bal = adv - spend;
    return { ...p, budget, advances: adv, spending: spend, balance: bal, travauxCount: pt.length };
  });

  const periodLabel = PERIOD_OPTIONS.find(o => o.key === period)?.[lang === 'fr' ? 'labelFr' : 'labelEn'] || 'All';

  const kpiCards = [
    { label: t('dash_kpi_projects'), value: totalProjects, sub: `${activeProjects} ${t('dash_kpi_active')}`, subColor: '#D4AF37', icon: <Building size={16} style={{ color: '#D4AF37' }} /> },
    { label: t('dash_kpi_budget'), value: `${fmt(totalBudget)} MAD`, sub: t('dash_kpi_allocated'), subColor: 'rgba(255,255,255,0.35)', icon: <DollarSign size={16} style={{ color: '#34d399' }} /> },
    { label: t('dash_kpi_client_advances'), value: `${fmt(totalClientAdv)} MAD`, sub: t('dash_kpi_received'), subColor: '#34d399', icon: <Wallet size={16} style={{ color: '#D4AF37' }} /> },
    { label: t('dash_kpi_spending'), value: `${fmt(totalSpending)} MAD`, sub: t('dash_kpi_spent'), subColor: '#f87171', icon: <Package size={16} style={{ color: '#f87171' }} /> },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header + Period */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] text-white uppercase mb-2">{t('dash_title')}</h1>
          <p className="elite-text-silver">{t('dash_welcome')}, {user?.displayName?.split(' ')[0] || 'User'}. {t('dash_summary')}</p>
        </div>
        {/* Period Selector */}
        <div className="relative">
          <button onClick={() => setShowPeriod(!showPeriod)} className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-200" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37' }}>
            <Calendar size={13} /> {periodLabel} <ChevronDown size={12} className={`transition-transform ${showPeriod ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showPeriod && (
              <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden min-w-[200px]"
                style={{ background: 'rgba(10,10,10,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(40px)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
                {PERIOD_OPTIONS.map(o => (
                  <button key={o.key} onClick={() => { setPeriod(o.key); if (o.key !== 'custom') setShowPeriod(false); }}
                    className="w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-150"
                    style={{ color: period === o.key ? '#D4AF37' : 'rgba(255,255,255,0.4)', background: period === o.key ? 'rgba(212,175,55,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {lang === 'fr' ? o.labelFr : o.labelEn}
                  </button>
                ))}
                {period === 'custom' && (
                  <div className="p-4 space-y-3" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
                    <div>
                      <label className="block text-[8px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dash_custom_from')}</label>
                      <input type="date" className="elite-input [color-scheme:dark] text-[11px]" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dash_custom_to')}</label>
                      <input type="date" className="elite-input [color-scheme:dark] text-[11px]" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                    </div>
                    <button onClick={() => setShowPeriod(false)} className="elite-button w-full py-2 text-[10px] uppercase tracking-[0.1em]">OK</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Net Position Banner */}
      <motion.div variants={item}>
        <div className="elite-card relative overflow-hidden" style={{ border: `1px solid ${netPosition >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: netPosition >= 0 ? 'linear-gradient(135deg, rgba(52,211,153,0.04) 0%, transparent 60%)' : 'linear-gradient(135deg, rgba(248,113,113,0.04) 0%, transparent 60%)' }} />
          <div className="px-7 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${netPosition >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                {netPosition >= 0 ? <TrendingUp size={24} style={{ color: '#34d399' }} /> : <TrendingDown size={24} style={{ color: '#f87171' }} />}
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('dash_kpi_net')}</p>
                <p className="text-3xl md:text-4xl font-playfair font-black tracking-tight" style={{ color: netPosition >= 0 ? '#34d399' : '#f87171', textShadow: `0 0 30px ${netPosition >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
                  {netPosition >= 0 ? '+' : ''}{fmt(netPosition)} MAD
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-right"><p className="text-[9px] uppercase tracking-[0.15em] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dash_kpi_client_advances')}</p><p className="text-lg font-bold" style={{ color: '#34d399' }}>{fmt(periodClientAdv)}</p></div>
              <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="text-right"><p className="text-[9px] uppercase tracking-[0.15em] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dash_main_doeuvre')}</p><p className="text-lg font-bold" style={{ color: '#f87171' }}>{fmt(periodMainDoeuvre)}</p></div>
              <div className="w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="text-right"><p className="text-[9px] uppercase tracking-[0.15em] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dash_fourniture')}</p><p className="text-lg font-bold" style={{ color: '#fb923c' }}>{fmt(periodFourniture)}</p></div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={container} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiCards.map((card, i) => (
          <motion.div variants={item} key={i}>
            <Card className="elite-card group h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10 mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 16px 10px' }}>
                <CardTitle className="text-[8px] font-bold uppercase tracking-[0.2em] leading-tight" style={{ color: 'rgba(255,255,255,0.38)' }}>{card.label}</CardTitle>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-black flex items-center justify-center shrink-0" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>{card.icon}</div>
              </CardHeader>
              <CardContent className="relative z-10" style={{ padding: '0 16px 16px' }}>
                <div className="text-xl md:text-2xl lg:text-3xl font-playfair font-black tracking-tight leading-none text-white">{card.value}</div>
                <p className="text-[9px] font-bold tracking-wide mt-2 uppercase leading-tight" style={{ color: card.subColor }}>{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black text-white uppercase tracking-[0.1em]">{t('dash_chart_title')}</CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('dash_chart_sub')}</CardDescription>
            </CardHeader>
            <CardContent className="chart-responsive" style={{ padding: '20px 8px 8px' }}>
              {projectChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center"><p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>{t('dash_no_data')}</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.025)" />
                    <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', fontWeight: 600 }} dy={14} />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat', fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.015)' }} contentStyle={{ backgroundColor: 'rgba(5,5,5,0.96)', backdropFilter: 'blur(20px)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px', color: 'white', fontSize: '10px', textTransform: 'uppercase' as any, letterSpacing: '0.1em', fontFamily: 'Montserrat' }} formatter={(v: number) => [`${fmt(v)} MAD`]} />
                    <defs>
                      <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a3a3a" /><stop offset="100%" stopColor="#181818" /></linearGradient>
                      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#065f46" /></linearGradient>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#7f1d1d" /></linearGradient>
                    </defs>
                    <Bar dataKey="Budget" fill="url(#gB)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="Advances" fill="url(#gA)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="Spending" fill="url(#gS)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cash Flow Area Chart */}
        <motion.div variants={item}>
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black text-white uppercase tracking-[0.1em]">{t('dash_flow_title')}</CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('dash_flow_sub')}</CardDescription>
            </CardHeader>
            <CardContent className="chart-responsive" style={{ padding: '20px 8px 8px' }}>
              {flowData.length === 0 ? (
                <div className="h-full flex items-center justify-center"><p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>{t('dash_no_data')}</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flowData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.025)" />
                    <XAxis dataKey="month" fontSize={8} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontWeight: 600 }} />
                    <YAxis fontSize={8} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(5,5,5,0.96)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', padding: '10px', color: 'white', fontSize: '10px', fontFamily: 'Montserrat' }} formatter={(v: number) => [`${fmt(v)} MAD`]} />
                    <defs>
                      <linearGradient id="fI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.3} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                      <linearGradient id="fE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.3} /><stop offset="100%" stopColor="#f87171" stopOpacity={0} /></linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="income" stroke="#34d399" fill="url(#fI)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" stroke="#f87171" fill="url(#fE)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Project P&L Table */}
      <motion.div variants={item}>
        <Card className="elite-card overflow-hidden">
          <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '24px 24px 20px' }}>
            <CardTitle className="text-lg font-playfair font-black text-white uppercase tracking-[0.1em]">{t('dash_pnl_title')}</CardTitle>
            <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('dash_pnl_sub')}</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            {projectPnL.length === 0 ? (
              <div className="py-20 text-center"><p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>{t('dash_no_data')}</p></div>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['Project', t('proj_travaux_count'), t('detail_th_budget'), t('dash_kpi_client_advances'), t('dash_kpi_spending'), t('dash_balance')].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] ${i >= 2 ? 'text-right' : ''}`} style={{ color: '#D4AF37' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectPnL.map(p => (
                    <tr key={p.id} className="transition-colors duration-200" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <td className="px-6 py-4">
                        <Link to={`/projects/${p.id}`} className="hover:text-[#D4AF37] transition-colors">
                          <p className="font-playfair font-black text-white uppercase tracking-[0.04em]">{p.name}</p>
                          <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color: '#D4AF37' }}>{p.clientName}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{p.travauxCount}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-white">{fmt(p.budget)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: '#34d399' }}>{fmt(p.advances)}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold" style={{ color: '#f87171' }}>{fmt(p.spending)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-playfair font-black" style={{ color: p.balance >= 0 ? '#34d399' : '#f87171', textShadow: `0 0 12px ${p.balance >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
                          {p.balance >= 0 ? '+' : ''}{fmt(p.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
