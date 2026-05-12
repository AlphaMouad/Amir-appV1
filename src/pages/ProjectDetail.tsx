import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getProjects, getTrades, addTrade, updateTrade, getPayments, addPayment } from '../services/api';
import { Project, Trade, Payment, PaymentType } from '../types';
import { ArrowLeft, Plus, AlertCircle, Wallet, Building2, User } from 'lucide-react';
import { format } from 'date-fns';
import { ImageUpload } from '../components/ui/ImageUpload';
import { LazyImage } from '../components/ui/LazyImage';
import ImageLightbox from '../components/ui/ImageLightbox';
import { checkAndSendAlert } from '../services/email';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [project, setProject] = useState<Project | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [addingTrade, setAddingTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({ designation: '', amount: 0, supplierName: '', quantity: 1 });
  const [isSavingTrade, setIsSavingTrade] = useState(false);

  const [addingPayment, setAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    date: new Date().toISOString().substring(0, 10),
    designation: '',
    type: 'client_advance' as PaymentType,
    workerNames: ''
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const unsubP = getProjects(user.uid, (projs) => {
      const p = projs.find((x) => x.id === id);
      if (p) setProject(p);
    }, console.error);
    const unsubT = getTrades(id, user.uid, setTrades, console.error);
    return () => { unsubP(); unsubT(); };
  }, [user, id]);

  // Keep selectedTrade in sync when trades update (e.g. after a payment)
  useEffect(() => {
    if (selectedTrade) {
      const fresh = trades.find((t) => t.id === selectedTrade.id);
      if (fresh) setSelectedTrade(fresh);
    }
  }, [trades]);

  useEffect(() => {
    if (!user || !id || !selectedTrade) return;
    const unsub = getPayments(id, selectedTrade.id, user.uid, setPayments, console.error);
    return () => unsub();
  }, [user, id, selectedTrade]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-t-2 border-r-2 border-[#D4AF37] rounded-full animate-spin" />
          <span className="font-playfair text-[10px] uppercase tracking-[0.3em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>
            {t('auth_loading')}
          </span>
        </div>
      </div>
    );
  }

  const totalBudget = trades.reduce((sum, t) => sum + (t.budget || t.amount || 0), 0);
  const totalClientAdvances = trades.reduce((sum, t) => sum + (t.totalClientAdvances || t.totalAdvances || 0), 0);
  const totalExpenses = trades.reduce((sum, t) => sum + (t.totalLaborExpenses || 0) + (t.totalMaterialExpenses || 0), 0);
  const projectBalance = totalClientAdvances - totalExpenses;

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newTrade.designation) return;
    setIsSavingTrade(true);
    try {
      await addTrade(id, {
        designation: newTrade.designation,
        budget: Number(newTrade.amount),
        amount: Number(newTrade.amount),
        quantity: Number(newTrade.quantity),
        supplierName: newTrade.supplierName,
        totalClientAdvances: 0,
        totalAdvances: 0,
        totalLaborExpenses: 0,
        totalMaterialExpenses: 0,
        ownerId: user.uid,
      });
      setAddingTrade(false);
      setNewTrade({ designation: '', amount: 0, supplierName: '', quantity: 1 });
    } catch (err: any) {
      console.error(err);
      alert('Error creating trade: ' + err.message);
    } finally {
      setIsSavingTrade(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !selectedTrade) return;
    setIsSavingPayment(true);
    try {
      const amount = Number(newPayment.amount);
      await addPayment(id, selectedTrade.id, {
        amount,
        date: new Date(newPayment.date),
        type: newPayment.type,
        designation: newPayment.designation,
        workerNames: newPayment.type === 'labor_expense' ? newPayment.workerNames : undefined,
        ownerId: user.uid,
      }, receiptFile);

      // If it's an expense, check for budget alerts
      if (newPayment.type !== 'client_advance') {
        await checkAndSendAlert(selectedTrade, amount);
      }

      setAddingPayment(false);
      setNewPayment({
        amount: 0,
        date: new Date().toISOString().substring(0, 10),
        designation: '',
        type: 'client_advance',
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

  const incomePayments = payments.filter(p => p.type === 'client_advance' || p.type === 'advance' || p.type === 'income');
  const expensePayments = payments.filter(p => p.type === 'labor_expense' || p.type === 'material_expense' || p.type === 'expense');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10">

      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-5">
          <Link to="/projects">
            <button
              className="h-11 w-11 rounded-full flex items-center justify-center transition-colors duration-200"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.35)'; e.currentTarget.style.color = '#D4AF37'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
            >
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-playfair font-black text-white uppercase tracking-[0.05em]">
              {project.name}
            </h1>
            <p className="text-[10px] font-medium mt-2 uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {t('detail_client')}: <span style={{ color: '#D4AF37' }}>{project.clientName}</span>
              {project.contractorName && (
                <span style={{ color: 'rgba(255,255,255,0.35)' }}> &nbsp;·&nbsp; {t('detail_contractor')}: {project.contractorName}</span>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div variants={item}>
          <div className="elite-card p-7 relative overflow-hidden group">
            <div className="pb-3 mb-5 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {t('detail_budget_card')}
              </h3>
            </div>
            <div className="relative z-10">
              <div className="text-3xl font-playfair font-black text-white tracking-tight">
                € {totalBudget.toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <div className="elite-card p-7 relative overflow-hidden group">
            <div className="pb-3 mb-5 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {t('detail_advances_card')}
              </h3>
            </div>
            <div className="relative z-10">
              <div className="text-3xl font-playfair font-black tracking-tight" style={{ color: '#D4AF37' }}>
                € {totalClientAdvances.toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <div className="elite-card p-7 relative overflow-hidden group">
            <div className="pb-3 mb-5 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {t('detail_expenses_card')}
              </h3>
            </div>
            <div className="relative z-10">
              <div className="text-3xl font-playfair font-black tracking-tight" style={{ color: '#f87171' }}>
                € {totalExpenses.toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <div className="elite-card p-7 relative overflow-hidden group">
            <div className="pb-3 mb-5 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {t('detail_balance_card')}
              </h3>
            </div>
            <div className="relative z-10">
              <div
                className="text-3xl font-playfair font-black tracking-tight"
                style={{ color: projectBalance < 0 ? '#f87171' : '#34d399' }}
              >
                € {projectBalance.toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Trades Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-playfair font-black text-white uppercase tracking-[0.1em]">{t('detail_ledger_title')}</h2>
        <button
          onClick={() => setAddingTrade(!addingTrade)}
          className="elite-button px-7 py-3 flex items-center gap-2 uppercase tracking-[0.1em] text-[10px]"
        >
          <Plus size={14} /> {t('detail_add_trade')}
        </button>
      </motion.div>

      {/* Add Trade Form */}
      {addingTrade && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <div
            className="elite-card p-7 md:p-10 relative overflow-hidden mb-2"
            style={{ border: '1px solid rgba(212,175,55,0.18)' }}
          >
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(212,175,55,0.05)', filter: 'blur(80px)' }} />
            <div className="relative z-10">
              <form onSubmit={handleAddTrade} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    {t('detail_trade_designation')}
                  </label>
                  <input required placeholder="e.g. Travaux Plombier" className="elite-input"
                    value={newTrade.designation} onChange={(e) => setNewTrade({ ...newTrade, designation: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    {t('detail_trade_supplier')}
                  </label>
                  <input placeholder="e.g. AMG Building" className="elite-input"
                    value={newTrade.supplierName} onChange={(e) => setNewTrade({ ...newTrade, supplierName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    {t('detail_trade_budget')}
                  </label>
                  <input type="number" required placeholder="0" className="elite-input"
                    value={newTrade.amount || ''} onChange={(e) => setNewTrade({ ...newTrade, amount: Number(e.target.value) })} />
                </div>
                <div className="flex items-end gap-5 pb-0.5">
                  <button
                    type="submit"
                    disabled={isSavingTrade}
                    className="elite-button px-8 py-3 uppercase text-[10px] tracking-[0.1em] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingTrade ? t('detail_trade_saving') : t('detail_trade_deploy')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingTrade(false)}
                    disabled={isSavingTrade}
                    className="text-[10px] uppercase tracking-[0.1em] transition-colors hover:text-white pb-0.5 disabled:opacity-40"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    {t('detail_trade_cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Trades List */}
      <div className="lg:hidden space-y-3">
        {trades.length === 0 ? (
          <div
            className="elite-card text-center py-14 text-[10px] uppercase tracking-[0.2em] font-bold"
            style={{ border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
          >
            {t('detail_no_trades')}
          </div>
        ) : (
          trades.map((trade) => {
            const budget = trade.budget || trade.amount || 0;
            const advances = trade.totalClientAdvances || trade.totalAdvances || 0;
            const expenses = (trade.totalLaborExpenses || 0) + (trade.totalMaterialExpenses || 0);
            const balance = advances - expenses;
            const ratio = budget > 0 ? expenses / budget : 0;
            const isWarning = ratio > 0.75;
            const isSelected = selectedTrade?.id === trade.id;

            return (
              <div
                key={trade.id}
                className="elite-card p-5 flex flex-col gap-4 relative overflow-hidden"
                style={isSelected ? { border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 0 24px rgba(212,175,55,0.1)' } : {}}
              >
                {isWarning && <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: '#f43f5e' }} />}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-playfair font-black text-white text-[1.05rem] uppercase tracking-[0.04em]">{trade.designation}</h3>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: '#D4AF37' }}>
                      {trade.supplierName || 'Unknown Entity'}
                    </p>
                  </div>
                  <button
                    className="px-3.5 py-1.5 text-[9px] uppercase tracking-[0.1em] font-bold rounded-lg transition-all duration-200"
                    style={isSelected
                      ? { background: '#D4AF37', color: '#000', border: '1px solid #D4AF37' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                    onClick={() => setSelectedTrade(isSelected ? null : trade)}
                  >
                    {isSelected ? t('detail_close') : t('detail_manage')}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg p-4" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_th_budget')}</p>
                    <p className="font-bold text-white text-sm">€ {budget.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_th_advances')}</p>
                    <p className="font-bold text-sm" style={{ color: '#D4AF37' }}>€ {advances.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_th_expenses')}</p>
                    <p className="font-bold text-sm" style={{ color: '#f87171' }}>€ {expenses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{t('detail_th_balance')}</p>
                    <p className="font-bold text-sm" style={{ color: balance < 0 ? '#f87171' : '#34d399' }}>€ {balance.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 elite-progress-track">
                    <div
                      className={isWarning ? 'elite-progress-fill-danger' : 'elite-progress-fill-gold'}
                      style={{ width: `${Math.min(100, ratio * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-black w-10 text-right tracking-widest" style={{ color: isWarning ? '#f87171' : '#D4AF37' }}>
                    {Math.round(ratio * 100)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Trades Table */}
      <motion.div variants={item} className="elite-card overflow-hidden flex-col hidden lg:flex">
        <div className="px-8 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.3)' }}>
          <h3 className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('detail_ledger_title')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {[t('detail_th_designation'), t('detail_th_budget'), t('detail_th_advances'), t('detail_th_expenses'), t('detail_th_balance'), t('detail_th_risk'), t('detail_th_actions')].map((h, i) => (
                  <th
                    key={h}
                    className={`px-7 py-5 text-[9px] font-bold uppercase tracking-[0.22em] ${i >= 1 && i <= 4 ? 'text-right' : ''}`}
                    style={{ color: '#D4AF37' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {t('detail_no_trades')}
                  </td>
                </tr>
              ) : (
                trades.map((trade) => {
                  const budget = trade.budget || trade.amount || 0;
                  const advances = trade.totalClientAdvances || trade.totalAdvances || 0;
                  const expenses = (trade.totalLaborExpenses || 0) + (trade.totalMaterialExpenses || 0);
                  const balance = advances - expenses;
                  const ratio = budget > 0 ? expenses / budget : 0;
                  const isWarning = ratio > 0.75;
                  const isSelected = selectedTrade?.id === trade.id;

                  return (
                    <tr
                      key={trade.id}
                      className="transition-colors duration-300"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: isSelected ? 'rgba(212,175,55,0.04)' : 'transparent',
                      }}
                    >
                      <td className="px-7 py-5 whitespace-nowrap font-playfair font-black text-[1.05rem] text-white uppercase tracking-[0.04em]">
                        {trade.designation}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-white text-right">
                        € {budget.toLocaleString()}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-right" style={{ color: '#D4AF37' }}>
                        € {advances.toLocaleString()}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-right" style={{ color: '#f87171' }}>
                        € {expenses.toLocaleString()}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-sm font-bold text-right" style={{ color: balance < 0 ? '#f87171' : '#34d399' }}>
                        € {balance.toLocaleString()}
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-24 elite-progress-track">
                            <div
                              className={isWarning ? 'elite-progress-fill-danger' : 'elite-progress-fill-gold'}
                              style={{ width: `${Math.min(100, ratio * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-black w-9 tracking-widest" style={{ color: isWarning ? '#f87171' : '#D4AF37' }}>
                            {Math.round(ratio * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-7 py-5 whitespace-nowrap text-right">
                        <button
                          className="px-5 py-2 text-[9px] uppercase tracking-[0.1em] font-bold transition-all duration-200 rounded-lg"
                          style={isSelected
                            ? { background: '#D4AF37', color: '#000', border: '1px solid #D4AF37' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                          }
                          onClick={() => setSelectedTrade(isSelected ? null : trade)}
                        >
                          {isSelected ? t('detail_close') : t('detail_manage')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Payment Panel */}
      {selectedTrade && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div
            className="elite-card relative overflow-hidden"
            style={{ border: '1px solid rgba(212,175,55,0.25)' }}
          >
            {/* Panel header */}
            <div
              className="px-7 md:px-10 py-7 relative z-10"
              style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-5">
                  <div
                    className="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Wallet size={20} style={{ color: '#D4AF37' }} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-playfair font-black text-white uppercase tracking-[0.04em]">
                      {selectedTrade.designation}
                    </h2>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {t('detail_payment_sub')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAddingPayment(!addingPayment)}
                  className="flex items-center gap-2.5 px-7 py-3.5 font-bold text-[10px] uppercase tracking-[0.12em] rounded-xl transition-all duration-200"
                  style={{ background: 'white', color: '#000' }}
                >
                  <Plus size={14} /> {t('detail_record_payment')}
                </button>
              </div>
            </div>

            <div className="px-7 md:px-10 py-8 relative z-10">
              {/* Add Payment Form */}
              {addingPayment && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleAddPayment}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mb-10 p-7 rounded-xl"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}
                >
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      {t('detail_field_date')}
                    </label>
                    <input type="date" required className="elite-input [color-scheme:dark]"
                      value={newPayment.date} onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      {t('detail_field_type')}
                    </label>
                    <select
                      className="elite-input"
                      value={newPayment.type}
                      onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value as PaymentType })}
                    >
                      <option value="client_advance">{t('detail_advance_label')}</option>
                      <option value="labor_expense">{t('detail_expense_labor_label')}</option>
                      <option value="material_expense">{t('detail_expense_material_label')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      {t('detail_field_amount')}
                    </label>
                    <input type="number" required placeholder="0" className="elite-input"
                      value={newPayment.amount || ''} onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })} />
                  </div>
                  <div className={newPayment.type === 'labor_expense' ? 'md:col-span-1' : 'md:col-span-2'}>
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      {t('detail_field_ref')}
                    </label>
                    <input placeholder="e.g. Invoice #123" className="elite-input"
                      value={newPayment.designation} onChange={(e) => setNewPayment({ ...newPayment, designation: e.target.value })} />
                  </div>
                  {newPayment.type === 'labor_expense' && (
                    <div className="md:col-span-1">
                      <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {t('detail_field_workers')}
                      </label>
                      <input placeholder="e.g. Jean, Marc" className="elite-input"
                        value={newPayment.workerNames} onChange={(e) => setNewPayment({ ...newPayment, workerNames: e.target.value })} />
                    </div>
                  )}
                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      {t('detail_field_receipt')}
                    </label>
                    <ImageUpload onImageSelected={(f) => setReceiptFile(f)} onClear={() => setReceiptFile(null)} isLoading={isSavingPayment} />
                  </div>
                  <div className="md:col-span-3 flex items-center gap-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      type="submit"
                      disabled={isSavingPayment}
                      className="flex items-center gap-2.5 px-9 py-3.5 font-bold text-[10px] uppercase tracking-[0.12em] rounded-xl transition-all duration-200"
                      style={{ background: 'white', color: '#000' }}
                    >
                      {isSavingPayment ? t('detail_processing') : t('detail_confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingPayment(false); setReceiptFile(null); }}
                      className="text-[10px] uppercase tracking-[0.1em] style={{ color: 'rgba(255,255,255,0.35)' }}"
                    >
                      {t('detail_trade_cancel')}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Income Section */}
              <div className="mb-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] mb-6 flex items-center gap-3" style={{ color: '#D4AF37' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                  {t('detail_income_section')}
                </h3>
                <div className="space-y-4">
                  {incomePayments.length === 0 ? (
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-center py-8 rounded-xl" style={{ color: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.05)' }}>
                      {t('detail_no_payments')}
                    </p>
                  ) : (
                    incomePayments.map((payment) => (
                      <PaymentCard key={payment.id} payment={payment} t={t} onImageClick={setLightboxSrc} />
                    ))
                  )}
                </div>
              </div>

              {/* Expense Section */}
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] mb-6 flex items-center gap-3" style={{ color: '#f87171' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
                  {t('detail_expense_section')}
                </h3>
                <div className="space-y-4">
                  {expensePayments.length === 0 ? (
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-center py-8 rounded-xl" style={{ color: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.05)' }}>
                      {t('detail_no_payments')}
                    </p>
                  ) : (
                    expensePayments.map((payment) => (
                      <PaymentCard key={payment.id} payment={payment} t={t} onImageClick={setLightboxSrc} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </motion.div>
  );
}

function PaymentCard({ payment, t, onImageClick }: { payment: Payment, t: any, onImageClick: (src: string) => void }) {
  const isIncome = payment.type === 'client_advance' || payment.type === 'advance' || payment.type === 'income';
  const typeLabel = payment.type === 'labor_expense' ? t('detail_expense_labor_label') :
                   payment.type === 'material_expense' || payment.type === 'expense' ? t('detail_expense_material_label') :
                   t('detail_advance_label');

  return (
    <div
      className="flex flex-col p-6 rounded-xl transition-colors duration-200"
      style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex items-center gap-5">
          <div
            className="h-11 w-11 rounded-xl bg-black flex items-center justify-center shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: isIncome ? '#D4AF37' : '#f87171' }}
          >
            {payment.type === 'labor_expense' ? <User size={18} /> : <Wallet size={18} />}
          </div>
          <div>
            <p className="text-[1rem] font-playfair font-black text-white uppercase tracking-[0.04em]">
              {typeLabel}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5" style={{ color: isIncome ? '#D4AF37' : '#f87171' }}>
              {format(payment.date, 'MMM d, yyyy')}
              {payment.designation && <span style={{ color: 'rgba(255,255,255,0.4)' }}> · {payment.designation}</span>}
              {payment.workerNames && <span style={{ color: 'rgba(255,255,255,0.4)' }}> · Workers: {payment.workerNames}</span>}
            </p>
          </div>
        </div>
        <span className="font-playfair font-black text-2xl text-white tracking-tight">
          € {payment.amount.toLocaleString()}
        </span>
      </div>
      {payment.receiptUrl && (
        <button
          className="mt-5 w-32 h-32 rounded-xl overflow-hidden group relative text-left"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => onImageClick(payment.receiptUrl!)}
        >
          <LazyImage src={payment.receiptUrl} alt={t('img_receipt')} className="w-full h-full" />
        </button>
      )}
    </div>
  );
}
