import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getProject, getTravauxByProject, getPaymentsByTravaux } from '../services/api';
import { Project, Travaux, Payment, PaymentType, PERIOD_OPTIONS, PeriodKey, getPeriodDates } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronDown, Plus, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } } };

export default function ProjectDetail() {
  const { uid } = useAuth();
  const { t, lang } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [travauxList, setTravauxList] = useState<Travaux[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTravaux, setActiveTravaux] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentType>('client_advance');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ amount: '', date: '', ref: '', worker: '', method: 'especes', bl: '' });

  // fetch data
  useEffect(() => {
    if (!uid || !projectId) return;
    let cancelled = false;
    const load = async () => {
      const p = await getProject(uid, projectId);
      const tlist = await getTravauxByProject(uid, projectId);
      const payList: Payment[] = [];
      for (const t of tlist) {
        const pp = await getPaymentsByTravaux(uid, t.id);
        payList.push(...pp);
      }
      if (!cancelled) {
        setProject(p);
        setTravauxList(tlist);
        setPayments(payList);
        setLoading(false);
        if (tlist.length) setActiveTravaux(tlist[0].id);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [uid, projectId]);

  const currentTravaux = useMemo(() => travauxList.find(t => t.id === activeTravaux) || null, [travauxList, activeTravaux]);
  const filteredPayments = useMemo(() => payments.filter(p => p.tradeId === activeTravaux && p.type === activeTab), [payments, activeTravaux, activeTab]);

  const fmt = (n: number) => n.toLocaleString('fr-MA');

  const handleAdd = async () => {
    if (!uid || !activeTravaux) return;
    const newPay: Omit<Payment, 'id' | 'createdAt'> = {
      projectId: projectId!,
      tradeId: activeTravaux,
      date: new Date(form.date),
      amount: Number(form.amount),
      type: activeTab,
      designation: form.ref,
      workerName: activeTab === 'main_doeuvre' ? form.worker : undefined,
      paymentMethod: activeTab === 'client_advance' ? (form.method as any) : undefined,
      blReference: activeTab === 'fourniture' ? form.bl : undefined,
      receiptUrl: undefined,
      ownerId: uid,
    };
    // API call placeholder
    // await addPayment(uid, newPay);
    setShowAdd(false);
    // optimistic update
    setPayments(prev => [...prev, { ...newPay, id: 'temp-' + Date.now(), createdAt: new Date() } as Payment]);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><span className="elite-text-silver">{t('detail_travaux_saving')}</span></div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 p-4 lg:p-8">
      {/* Project Header */}
      <Card className="elite-card">
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="text-2xl font-playfair font-black text-white">{project?.name}</CardTitle>
          <p className="text-sm text-gray-300">{project?.clientName}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 elite-card border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs uppercase text-gray-400">{t('detail_budget_card')}</p>
            <p className="text-xl font-bold" style={{ color: '#D4AF37' }}>{fmt(currentTravaux?.budget || 0)} MAD</p>
          </div>
          <div className="p-3 elite-card border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs uppercase text-gray-400">{t('detail_advances_card')}</p>
            <p className="text-xl font-bold" style={{ color: '#34d399' }}>{fmt(currentTravaux?.totalClientAdvances || 0)} MAD</p>
          </div>
          <div className="p-3 elite-card border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs uppercase text-gray-400">{t('detail_spending_card')}</p>
            <p className="text-xl font-bold" style={{ color: '#f87171' }}>{fmt(currentTravaux ? currentTravaux.totalMainDoeuvre + currentTravaux.totalFourniture : 0)} MAD</p>
          </div>
          <div className="p-3 elite-card border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs uppercase text-gray-400">{t('detail_balance_card')}</p>
            <p className="text-xl font-bold" style={{ color: (currentTravaux?.totalClientAdvances || 0) - (currentTravaux?.totalMainDoeuvre || 0) - (currentTravaux?.totalFourniture || 0) >= 0 ? '#34d399' : '#f87171' }}>
              {(currentTravaux?.totalClientAdvances || 0) - (currentTravaux?.totalMainDoeuvre || 0) - (currentTravaux?.totalFourniture || 0) >= 0 ? '+' : ''}{fmt((currentTravaux?.totalClientAdvances || 0) - (currentTravaux?.totalMainDoeuvre || 0) - (currentTravaux?.totalFourniture || 0))} MAD
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Travaux selector */}
      <div className="flex flex-wrap gap-3">
        {travauxList.map(t => (
          <button key={t.id} onClick={() => setActiveTravaux(t.id)} className={`px-4 py-2 rounded-xl elite-button ${activeTravaux === t.id ? 'bg-black/70 border border-[#D4AF37]' : 'bg-black/40'}`}>
            {t.designation}
          </button>
        ))}
        <button onClick={() => {/* TODO: open add travaux modal */}} className="elite-button-outline px-4 py-2 rounded-xl">
          <Plus size={14} className="inline-block mr-1" /> {t('detail_add_travaux')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[rgba(255,255,255,0.08)] mb-4">
        {(['client_advance', 'main_doeuvre', 'fourniture'] as PaymentType[]).map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-semibold uppercase tracking-wide ${activeTab === tab ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-gray-400'}`}
          >
            {t(`detail_tab_${tab.replace('_', '')}`)}
          </button>
        ))}
        <button onClick={() => setShowAdd(true)} className="ml-auto elite-button-outline px-3 py-1 rounded-lg">
          <Plus size={12} className="inline-block mr-1" /> {t('detail_record_' + (activeTab === 'client_advance' ? 'advance' : activeTab === 'main_doeuvre' ? 'labour' : 'material'))}
        </button>
      </div>

      {/* Payment list */}
      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <p className="text-center elite-text-silver">{t('detail_no_payments')}</p>
        ) : (
          filteredPayments.map(p => (
            <Card key={p.id} className="elite-card p-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium" style={{ color: '#D4AF37' }}>{fmt(p.amount)} MAD</p>
                <p className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString(lang)}</p>
                {p.designation && <p className="text-xs text-gray-300">{p.designation}</p>}
              </div>
              {p.receiptUrl && (
                <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs elite-text-gold underline">{t('img_receipt')}</a>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Add payment modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="elite-card w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-playfair font-black text-white">{t('detail_record_' + (activeTab === 'client_advance' ? 'advance' : activeTab === 'main_doeuvre' ? 'labour' : 'material'))}</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <input type="date" className="elite-input" placeholder={t('detail_field_date')} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                <input type="number" className="elite-input" placeholder={t('detail_field_amount')} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                <input type="text" className="elite-input" placeholder={t('detail_field_ref')} value={form.ref} onChange={e => setForm({ ...form, ref: e.target.value })} />
                {activeTab === 'main_doeuvre' && (
                  <input type="text" className="elite-input" placeholder={t('detail_field_worker')} value={form.worker} onChange={e => setForm({ ...form, worker: e.target.value })} />
                )}
                {activeTab === 'client_advance' && (
                  <select className="elite-input" value={form.method} onChange={e => setForm({ ...form, method: e.target.value as any })}>
                    <option value="especes">{t('detail_method_especes')}</option>
                    <option value="virement">{t('detail_method_virement')}</option>
                    <option value="cheque">{t('detail_method_cheque')}</option>
                  </select>
                )}
                {activeTab === 'fourniture' && (
                  <input type="text" className="elite-input" placeholder={t('detail_field_bl')} value={form.bl} onChange={e => setForm({ ...form, bl: e.target.value })} />
                )}
                <button onClick={handleAdd} className="elite-button w-full py-2 uppercase tracking-[0.12em]">{t('detail_confirm')}</button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
