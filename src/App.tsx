/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import Suppliers from './pages/Suppliers';
import { motion } from 'motion/react';

const Login = () => {
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-black">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Ambient gold orbs */}
      <div className="absolute top-1/4 -left-1/4 w-[900px] h-[900px] rounded-full pointer-events-none" style={{ background: 'rgba(212,175,55,0.04)', filter: 'blur(180px)' }} />
      <div className="absolute -bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'rgba(212,175,55,0.025)', filter: 'blur(140px)' }} />

      {/* Language toggle */}
      <div className="absolute top-5 right-5 flex items-center gap-1 z-20">
        {(['fr', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-200"
            style={{
              background: lang === l ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${lang === l ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.07)'}`,
              color: lang === l ? '#D4AF37' : 'rgba(255,255,255,0.25)',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm w-full"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-10 animate-float"
        >
          <div
            className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center"
            style={{
              border: '1px solid rgba(212,175,55,0.22)',
              boxShadow: '0 0 60px rgba(212,175,55,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <span className="font-playfair font-black text-4xl elite-text-gold">V</span>
          </div>
          <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]/50" />
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]/50" />
          <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]/50" />
          <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]/50" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.6 }}
          className="w-full"
        >
          <h1 className="text-[2.75rem] font-playfair font-black tracking-[0.04em] text-white uppercase leading-none mb-2">
            Elite<span className="elite-text-gold">Finance</span>
          </h1>
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] mb-8" style={{ color: 'rgba(212,175,55,0.45)' }}>
            {t('auth_subtitle')}
          </p>
          <span className="gold-divider block w-16 mx-auto mb-8" />
          <p className="text-[13px] leading-relaxed tracking-wide mb-10 font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {t('auth_desc')}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          onClick={login}
          className="w-full elite-button py-4 flex items-center justify-center gap-3 text-[11px] tracking-[0.18em] uppercase font-bold"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t('auth_cta')}
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-6 text-[9px] uppercase tracking-[0.22em] font-medium"
          style={{ color: 'rgba(255,255,255,0.14)' }}
        >
          {t('auth_secure')}
        </motion.p>
      </motion.div>
    </div>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-5">
          <div className="w-10 h-10 border-t-2 border-r-2 border-[#D4AF37] rounded-full animate-spin" />
          <span className="font-playfair text-[10px] uppercase tracking-[0.35em] animate-pulse-soft" style={{ color: 'rgba(212,175,55,0.5)' }}>
            {t('auth_initializing')}
          </span>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;
  return <>{children}</>;
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="suppliers" element={<Suppliers />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
