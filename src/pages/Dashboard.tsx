import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getProjects, getAllTrades } from '../services/api';
import { Project, Trade } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, TrendingUp, Building, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let projectsLoaded = false;
    let tradesLoaded = false;

    const unsubProjects = getProjects(
      user.uid,
      (data) => {
        setProjects(data);
        projectsLoaded = true;
        if (tradesLoaded) setLoading(false);
      },
      (error) => { console.error(error); setLoading(false); }
    );

    const unsubTrades = getAllTrades(
      user.uid,
      (data) => {
        setTrades(data);
        tradesLoaded = true;
        if (projectsLoaded) setLoading(false);
      },
      (error) => { console.error(error); setLoading(false); }
    );

    return () => { unsubProjects(); unsubTrades(); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-5">
        <div className="w-10 h-10 border-t-2 border-r-2 border-[#D4AF37] rounded-full animate-spin" />
        <span className="font-playfair text-[10px] uppercase tracking-[0.3em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>
          Initializing Matrix...
        </span>
      </div>
    );
  }

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'ongoing').length;
  const globalBudget = trades.reduce((sum, t) => sum + (t.budget || t.amount || 0), 0);
  const globalAdvances = trades.reduce((sum, t) => sum + (t.totalClientAdvances || t.totalAdvances || 0), 0);
  const globalExpenses = trades.reduce((sum, t) => sum + (t.totalLaborExpenses || 0) + (t.totalMaterialExpenses || 0), 0);
  const globalBalance = globalAdvances - globalExpenses;

  const tradesWithWarnings = trades.filter((t) => {
    const budget = t.budget || t.amount || 0;
    const expenses = (t.totalLaborExpenses || 0) + (t.totalMaterialExpenses || 0);
    return budget > 0 && expenses > budget;
  });

  const projectChartData = projects.map((p) => {
    const pTrades = trades.filter((t) => t.projectId === p.id);
    return {
      name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
      Advances: pTrades.reduce((sum, t) => sum + (t.totalClientAdvances || t.totalAdvances || 0), 0),
      Expenses: pTrades.reduce((sum, t) => sum + (t.totalLaborExpenses || 0) + (t.totalMaterialExpenses || 0), 0),
    };
  });

  const kpiCards = [
    {
      label: t('dash_kpi_projects'),
      value: totalProjects,
      sub: `${activeProjects} ${t('dash_kpi_active')}`,
      subColor: '#D4AF37',
      icon: <Building size={16} style={{ color: '#D4AF37' }} />,
    },
    {
      label: t('dash_kpi_advances'),
      value: `€${globalAdvances.toLocaleString()}`,
      sub: t('dash_kpi_allocated'),
      subColor: '#D4AF37',
      icon: <DollarSign size={16} style={{ color: '#D4AF37' }} />,
    },
    {
      label: t('dash_kpi_expenses'),
      value: `€${globalExpenses.toLocaleString()}`,
      sub: `€${globalBudget.toLocaleString()} ${t('dash_kpi_budget')}`,
      subColor: '#f87171',
      icon: <TrendingUp size={16} style={{ color: '#f87171' }} />,
    },
    {
      label: t('dash_kpi_balance'),
      value: `€${globalBalance.toLocaleString()}`,
      sub: tradesWithWarnings.length === 0 ? t('dash_kpi_no_risk') : `${tradesWithWarnings.length} ${t('dash_kpi_risk')}`,
      subColor: globalBalance < 0 ? '#f87171' : '#34d399',
      icon: <AlertCircle size={16} style={{ color: globalBalance < 0 ? '#f87171' : '#34d399' }} />,
      valueColor: globalBalance < 0 ? '#f87171' : '#34d399',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] text-white uppercase mb-2">{t('dash_title')}</h1>
          <p className="elite-text-silver">
            {t('dash_welcome')}, {user?.displayName?.split(' ')[0] || 'User'}. {t('dash_summary')}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={container} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiCards.map((card, i) => (
          <motion.div variants={item} key={i}>
            <Card className="elite-card group h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 16px 10px' }}>
                <CardTitle className="text-[8px] font-bold uppercase tracking-[0.2em] leading-tight" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {card.label}
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 16px' }}>
                <div className="text-2xl md:text-3xl font-playfair font-black tracking-tight" style={{ color: card.valueColor || 'white' }}>
                  {card.value}
                </div>
                <p className="text-[9px] font-bold tracking-wide mt-2 uppercase" style={{ color: card.subColor || 'rgba(255,255,255,0.4)' }}>
                  {card.sub}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart + Critical Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black text-white uppercase tracking-[0.1em]">
                {t('dash_chart_title')}
              </CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {t('dash_chart_sub')}
              </CardDescription>
            </CardHeader>
            <CardContent className="chart-responsive" style={{ padding: '20px 8px 8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.025)" />
                  <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.35)' }} dy={14} />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v / 1000}k`} tick={{ fill: 'rgba(255,255,255,0.35)' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.015)' }}
                    contentStyle={{ backgroundColor: 'rgba(5,5,5,0.96)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', fontSize: '10px' }}
                  />
                  <Bar dataKey="Advances" fill="#D4AF37" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Expenses" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="elite-card h-full">
            <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '24px 24px 20px' }}>
              <CardTitle className="text-lg font-playfair font-black uppercase tracking-[0.1em]" style={{ color: '#f87171' }}>
                {t('dash_ledger_title')}
              </CardTitle>
              <CardDescription className="text-[10px] font-medium tracking-wide mt-1 uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {t('dash_ledger_sub')}
              </CardDescription>
            </CardHeader>
            <CardContent style={{ padding: '20px' }}>
              {tradesWithWarnings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <p className="text-sm font-playfair tracking-[0.2em] text-white uppercase">{t('dash_ledger_clear')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tradesWithWarnings.map((trade) => (
                    <div key={trade.id} className="p-4 rounded-lg bg-black/50 border border-white/5 border-l-[#f87171] border-l-2">
                      <p className="text-[11px] font-bold text-white uppercase">{trade.designation}</p>
                      <p className="text-[9px] uppercase tracking-widest mt-1 text-white/30">
                        Exp: €{((trade.totalLaborExpenses || 0) + (trade.totalMaterialExpenses || 0)).toLocaleString()} / Budget: €{(trade.budget || trade.amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
