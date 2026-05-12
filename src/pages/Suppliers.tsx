import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAllTrades, getProjects, addPayment, updateTrade, getPayments } from '../services/api';
import { Trade, Project, Payment, PaymentType } from '../types';
import { Building2, Search, Wallet, Plus, AlertCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '../components/ui/ImageUpload';
import { LazyImage } from '../components/ui/LazyImage';
import ImageLightbox from '../components/ui/ImageLightbox';
import { checkAndSendAlert } from '../services/email';
import { motion, AnimatePresence } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

export default function Suppliers() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    date: new Date().toISOString().substring(0, 10),
    designation: '',
    type: 'material_expense' as PaymentType,
    workerNames: ''
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;
    let tradesLoaded = false;
    let projectsLoaded = false;
    const check = () => { if (tradesLoaded && projectsLoaded) setLoading(false); };

    const unsubTrades = getAllTrades(user.uid, (data) => { setTrades(data); tradesLoaded = true; check(); }, (e) => { console.error(e); setLoading(false); });
    const unsubProjects = getProjects(user.uid, (data) => { setProjects(data); projectsLoaded = true; check(); }, (e) => { console.error(e); setLoading(false); });
    return () => { unsubTrades(); unsubProjects(); };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedTrade) return;
    const unsub = getPayments(selectedTrade.projectId, selectedTrade.id, user.uid, setPayments, console.error);
    return () => unsub();
  }, [user, selectedTrade]);

  // Keep selectedTrade in sync when trades update (e.g. after a payment)
  useEffect(() => {
    if (selectedTrade) {
      const fresh = trades.find((t) => t.id === selectedTrade.id);
      if (fresh) setSelectedTrade({ ...fresh, projectName: (selectedTrade as any).projectName });
    }
  }, [trades]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTrade) return;
    setIsSavingPayment(true);
    try {
      const amount = Number(newPayment.amount);
      await addPayment(selectedTrade.projectId, selectedTrade.id, {
        amount,
        date: new Date(newPayment.date),
        type: newPayment.type,
        designation: newPayment.designation,
        workerNames: newPayment.type === 'labor_expense' ? newPayment.workerNames : undefined,
        ownerId: user.uid,
      }, receiptFile);

      if (newPayment.type !== 'client_advance') {
        await checkAndSendAlert(selectedTrade, amount);
      }

      setAddingPayment(false);
      setNewPayment({
        amount: 0,
        date: new Date().toISOString().substring(0, 10),
        designation: '',
        type: 'material_expense',
        workerNames: ''
      });
      setReceiptFile(null);
    } catch (err: any) {
      console.error(err);
      alert('Error recording transaction. Details: ' + err.message);
    } finally {
      setIsSavingPayment(false);
    }
  };

  const suppliers = useMemo(() => {
    const grouped = new Map<string, { name: string; totalBudget: number; totalExpenses: number; trades: (Trade & { projectName: string })[] }>();
    trades.forEach((trade) => {
      const name = trade.supplierName?.trim() || 'Unknown Entity';
      const project = projects.find((p) => p.id === trade.projectId);
      if (!grouped.has(name)) grouped.set(name, { name, totalBudget: 0, totalExpenses: 0, trades: [] });
      const entry = grouped.get(name)!;
      entry.totalBudget += trade.budget || trade.amount || 0;
      entry.totalExpenses += (trade.totalLaborExpenses || 0) + (trade.totalMaterialExpenses || 0);
      entry.trades.push({ ...trade, projectName: project?.name || 'Unknown Project' });
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [trades, projects]);

  const filteredSuppliers = useMemo(() => {
    if (!search) return suppliers;
    const s = search.toLowerCase();
    return suppliers.filter((sup) => sup.name.toLowerCase().includes(s));
  }, [suppliers, search]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-48 gap-5">
        <div className="w-10 h-10 border-t-2 border-r-2 border-[#D4AF37] rounded-full animate-spin" />
        <span className="font-playfair text-[10px] uppercase tracking-[0.3em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>
          {t('auth_loading')}
        </span>
      </div>
    );
  }

  const PaymentPanel = ({ trade }: { trade: Trade & { projectName: string } }) => {
    const isExpanded = selectedTrade?.id === trade.id;
    return (
      <>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div
              className="p-7 md:p-10 relative overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(212,175,55,0.2)', borderBottom: '1px solid rgba(212,175,55,0.2)' }}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-8 relative z-10">
                <div>
                  <h4 className="font-playfair font-black text-white text-2xl uppercase tracking-[0.04em]">
                    {trade.designation} <span style={{ color: '#D4AF37' }}>/</span> {t('sup_transfers')}
                  </h4>
                  <p className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {t('sup_from')} {trade.projectName}
                  </p>
                </div>
                <button
                  onClick={() => setAddingPayment(!addingPayment)}
                  className="flex items-center gap-2.5 px-6 py-3 font-bold text-[10px] uppercase tracking-[0.12em] rounded-xl transition-all duration-200 shrink-0"
                  style={{ background: 'white', color: '#000' }}
                >
                  <Plus size={13} /> {t('detail_record_payment')}
                </button>
              </div>

              {addingPayment && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleAddPayment}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mb-10 p-7 rounded-xl relative z-10"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}
                >
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_field_date')}</label>
                    <input type="date" required className="elite-input [color-scheme:dark]"
                      value={newPayment.date} onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_field_type')}</label>
                    <select className="elite-input" value={newPayment.type} onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value as PaymentType })}>
                      <option value="material_expense">{t('detail_expense_material_label')}</option>
                      <option value="labor_expense">{t('detail_expense_labor_label')}</option>
                      <option value="client_advance">{t('detail_advance_label')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_field_amount')}</label>
                    <input type="number" required placeholder="0" className="elite-input"
                      value={newPayment.amount || ''} onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })} />
                  </div>
                  <div className={newPayment.type === 'labor_expense' ? 'md:col-span-1' : 'md:col-span-2'}>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_field_ref')}</label>
                    <input placeholder="e.g. Invoice #123" className="elite-input"
                      value={newPayment.designation} onChange={(e) => setNewPayment({ ...newPayment, designation: e.target.value })} />
                  </div>
                  {newPayment.type === 'labor_expense' && (
                    <div className="md:col-span-1">
                      <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_field_workers')}</label>
                      <input placeholder="e.g. Jean, Marc" className="elite-input"
                        value={newPayment.workerNames} onChange={(e) => setNewPayment({ ...newPayment, workerNames: e.target.value })} />
                    </div>
                  )}
                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_field_receipt')}</label>
                    <ImageUpload onImageSelected={(f) => setReceiptFile(f)} onClear={() => setReceiptFile(null)} isLoading={isSavingPayment} />
                  </div>
                  <div className="md:col-span-3 flex items-center gap-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button type="submit" disabled={isSavingPayment}
                      className="flex items-center gap-2 px-8 py-3.5 font-bold text-[10px] uppercase tracking-[0.12em] rounded-xl transition-all disabled:opacity-50"
                      style={{ background: 'white', color: '#000' }}
                    >
                      {isSavingPayment ? t('detail_processing') : t('detail_confirm')}
                    </button>
                    <button type="button" onClick={() => { setAddingPayment(false); setReceiptFile(null); }} disabled={isSavingPayment}
                      className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {t('detail_trade_cancel')}
                    </button>
                  </div>
                </motion.form>
              )}

              <div className="space-y-3 relative z-10">
                {payments.length === 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-center py-12 rounded-xl"
                    style={{ color: 'rgba(255,255,255,0.28)', border: '1px dashed rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
                    {t('detail_no_payments')}
                  </p>
                ) : (
                  payments.map((payment) => {
                    const isInc = payment.type === 'client_advance' || payment.type === 'advance' || payment.type === 'income';
                    return (
                      <div key={payment.id} className="flex flex-col p-6 rounded-xl transition-colors duration-200"
                        style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center shrink-0"
                              style={{ border: '1px solid rgba(255,255,255,0.08)', color: isInc ? '#D4AF37' : '#f87171' }}>
                              {payment.type === 'labor_expense' ? <User size={16} /> : <Wallet size={16} />}
                            </div>
                            <div>
                              <p className="font-playfair font-black text-white uppercase tracking-[0.04em]">
                                {payment.type === 'labor_expense' ? t('detail_expense_labor_label') :
                                 payment.type === 'material_expense' || payment.type === 'expense' ? t('detail_expense_material_label') :
                                 t('detail_advance_label')}
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: isInc ? '#D4AF37' : '#f87171' }}>
                                {format(payment.date, 'MMM d, yyyy')}
                                {payment.designation && <span style={{ color: 'rgba(255,255,255,0.4)' }}> · {payment.designation}</span>}
                                {payment.workerNames && <span style={{ color: 'rgba(255,255,255,0.4)' }}> · Workers: {payment.workerNames}</span>}
                              </p>
                            </div>
                          </div>
                          <span className="font-playfair font-black text-2xl text-white">€ {payment.amount.toLocaleString()}</span>
                        </div>
                        {payment.receiptUrl && (
                          <button
                            className="mt-4 w-32 h-32 rounded-xl overflow-hidden group relative text-left"
                            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                            onClick={() => setLightboxSrc(payment.receiptUrl!)}
                          >
                            <LazyImage src={payment.receiptUrl} alt={t('img_receipt')} className="w-full h-full" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </>
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10">

      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div>
          <h1 className="text-4xl font-playfair font-black uppercase tracking-[0.05em] text-white mb-2">{t('sup_title')}</h1>
          <p className="elite-text-silver tracking-wide">{t('sup_subtitle')}</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <input
            type="text"
            placeholder={t('sup_search')}
            className="elite-input pl-7 uppercase tracking-[0.08em]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      <motion.div variants={container} className="space-y-6">
        <AnimatePresence>
          {filteredSuppliers.map((supplier) => {
            return (
              <motion.div variants={item} key={supplier.name} layout>
                <div className="elite-card overflow-hidden group">

                  {/* Supplier Header */}
                  <div
                    className="p-7 md:p-9 relative z-10"
                    style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div
                          className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500"
                          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <Building2 size={22} className="transition-colors duration-500 group-hover:text-[#D4AF37]" style={{ color: 'rgba(255,255,255,0.2)' }} />
                        </div>
                        <div>
                          <h2 className="text-2xl md:text-3xl font-playfair font-black text-white uppercase tracking-[0.04em]">
                            {supplier.name}
                          </h2>
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5" style={{ color: '#D4AF37' }}>
                            {supplier.trades.length} {t('sup_allocations')}
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex gap-8 items-center p-5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-[0.2em] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                            {t('sup_global_budget')}
                          </p>
                          <p className="text-2xl font-playfair font-black text-white">€ {supplier.totalBudget.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-[0.2em] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                            {t('detail_expenses_card')}
                          </p>
                          <p className="text-2xl font-playfair font-black text-[#f87171]">
                            € {supplier.totalExpenses.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trades — Mobile Cards */}
                  <div className="lg:hidden divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {supplier.trades.map((trade) => {
                      const budget = trade.budget || trade.amount || 0;
                      const advances = trade.totalClientAdvances || trade.totalAdvances || 0;
                      const expenses = (trade.totalLaborExpenses || 0) + (trade.totalMaterialExpenses || 0);
                      const balance = advances - expenses;
                      const isExpanded = selectedTrade?.id === trade.id;

                      return (
                        <div key={trade.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="p-5 flex flex-col gap-4" style={isExpanded ? { background: 'rgba(212,175,55,0.03)' } : {}}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-playfair font-black text-white text-[1rem] uppercase tracking-[0.03em]">{trade.designation}</p>
                                <p className="text-[9px] uppercase tracking-[0.18em] mt-1 font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{trade.projectName}</p>
                              </div>
                              <button
                                className="px-3.5 py-1.5 text-[9px] uppercase tracking-[0.1em] font-bold rounded-lg transition-all duration-200 shrink-0 ml-3"
                                style={isExpanded
                                  ? { background: '#D4AF37', color: '#000', border: '1px solid #D4AF37' }
                                  : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                                }
                                onClick={() => { setSelectedTrade(isExpanded ? null : trade); setAddingPayment(false); }}
                              >
                                {isExpanded ? t('detail_close') : t('detail_manage')}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('sup_th_budget')}</p>
                                <p className="font-bold text-white text-sm">€ {budget.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('detail_th_advances')}</p>
                                <p className="font-bold text-sm" style={{ color: '#D4AF37' }}>€ {advances.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('detail_th_expenses')}</p>
                                <p className="font-bold text-sm" style={{ color: '#f87171' }}>€ {expenses.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('detail_th_balance')}</p>
                                <p className="font-bold text-sm" style={{ color: balance < 0 ? '#f87171' : '#34d399' }}>€ {balance.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          <PaymentPanel trade={trade} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Trades — Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                      <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <tr>
                          {[t('sup_th_project'), t('sup_th_designation'), t('sup_th_budget'), t('detail_th_advances'), t('detail_th_expenses'), t('detail_th_balance'), t('sup_th_actions')].map((h, i) => (
                            <th
                              key={h}
                              className={`px-7 py-5 text-[9px] font-bold uppercase tracking-[0.22em] ${i >= 2 && i <= 5 ? 'text-right' : ''}`}
                              style={{ color: '#D4AF37' }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.trades.map((trade) => {
                          const budget = trade.budget || trade.amount || 0;
                          const advances = trade.totalClientAdvances || trade.totalAdvances || 0;
                          const expenses = (trade.totalLaborExpenses || 0) + (trade.totalMaterialExpenses || 0);
                          const balance = advances - expenses;
                          const isExpanded = selectedTrade?.id === trade.id;

                          return (
                            <React.Fragment key={trade.id}>
                              <tr
                                className="transition-colors duration-200"
                                style={{
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                  background: isExpanded ? 'rgba(212,175,55,0.04)' : 'transparent',
                                }}
                              >
                                <td className="px-7 py-5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                                  {trade.projectName}
                                </td>
                                <td className="px-7 py-5 whitespace-nowrap font-playfair font-black text-[1rem] text-white uppercase tracking-[0.04em]">
                                  {trade.designation}
                                </td>
                                <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-white text-right">€ {budget.toLocaleString()}</td>
                                <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-right" style={{ color: '#D4AF37' }}>
                                  € {advances.toLocaleString()}
                                </td>
                                <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-right" style={{ color: '#f87171' }}>
                                  € {expenses.toLocaleString()}
                                </td>
                                <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-right" style={{ color: balance < 0 ? '#f87171' : '#34d399' }}>
                                  € {balance.toLocaleString()}
                                </td>
                                <td className="px-7 py-5 whitespace-nowrap text-right">
                                  <button
                                    className="px-5 py-2 text-[9px] uppercase tracking-[0.1em] font-bold transition-all duration-200 rounded-lg"
                                    style={isExpanded
                                      ? { background: '#D4AF37', color: '#000', border: '1px solid #D4AF37' }
                                      : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                                    }
                                    onClick={() => { setSelectedTrade(isExpanded ? null : trade); setAddingPayment(false); }}
                                  >
                                    {isExpanded ? t('detail_close') : t('detail_manage')}
                                  </button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={7} className="p-0">
                                    <PaymentPanel trade={trade} />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </motion.div>
  );
}
