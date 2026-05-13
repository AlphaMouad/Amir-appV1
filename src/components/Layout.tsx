import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut, BookOpen, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const location = useLocation();

  const navItems = [
    { label: t('nav_dashboard'), path: '/', icon: LayoutDashboard },
    { label: t('nav_projects'), path: '/projects', icon: FolderKanban },
    { label: t('nav_ledger'), path: '/ledger', icon: BookOpen },
  ];

  const LangToggle = ({ compact }: { compact?: boolean }) => (
    <div className={`flex items-center gap-1 ${compact ? '' : 'mb-3'}`}>
      {(['fr', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`${compact ? 'px-2.5 py-1' : 'flex-1 py-1.5'} rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-200`}
          style={{
            background: lang === l ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${lang === l ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}`,
            color: lang === l ? '#D4AF37' : 'rgba(255,255,255,0.22)',
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex font-montserrat text-white pb-nav-safe relative overflow-hidden bg-black">

      {/* Desktop Sidebar */}
      <aside className="w-72 hidden lg:flex flex-col shrink-0 sticky top-0 h-screen z-20 overflow-hidden elite-glass border-y-0 border-l-0">
        {/* Ambient top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-56 pointer-events-none"
          style={{ background: 'rgba(212,175,55,0.04)', filter: 'blur(80px)', borderRadius: '0 0 50% 50%' }}
        />

        {/* Brand */}
        <div className="p-7 pb-3 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0"
              style={{
                border: '1px solid rgba(212,175,55,0.22)',
                boxShadow: '0 0 20px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <span className="font-playfair font-black text-xl elite-text-gold">V</span>
            </div>
            <div>
              <h1 className="text-[1.1rem] font-playfair font-black tracking-[0.1em] text-white uppercase leading-none">
                Elite<span className="elite-text-gold font-medium">Finance</span>
              </h1>
              <p className="text-[8px] uppercase tracking-[0.35em] mt-1.5 font-bold" style={{ color: 'rgba(212,175,55,0.4)' }}>
                Management
              </p>
            </div>
          </div>
        </div>

        <div className="mx-7 my-1 h-px relative z-10" style={{ background: 'rgba(255,255,255,0.04)' }} />

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-5 space-y-0.5 relative z-10">
          <p className="text-[8px] font-bold uppercase tracking-[0.28em] mb-3 px-3" style={{ color: 'rgba(255,255,255,0.18)' }}>
            {t('nav_navigation')}
          </p>
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-3.5 py-3 text-[13px] font-medium rounded-xl transition-colors duration-200 relative group ${
                  isActive ? 'text-white' : 'hover:text-white/70'
                }`}
                style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.28)' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveNav"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.09) 0%, rgba(212,175,55,0.02) 100%)',
                      borderLeft: '2px solid #D4AF37',
                    }}
                    initial={false}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(255,255,255,0.02)' }} />
                )}
                <item.icon
                  className="h-4.5 w-4.5 relative z-10 shrink-0 transition-colors duration-200"
                  style={{ color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.22)' }}
                  size={18}
                />
                <span className="relative z-10 tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-7 h-px relative z-10" style={{ background: 'rgba(255,255,255,0.04)' }} />

        {/* User profile */}
        <div className="p-5 relative z-10">
          <LangToggle />
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-full bg-black flex items-center justify-center overflow-hidden shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover opacity-80" />
              ) : (
                <User size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white text-[13px] truncate tracking-wide">
                {user?.displayName || 'User'}
              </p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em' }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="elite-button-outline w-full py-2.5 flex items-center justify-center gap-2.5 text-[10px] tracking-[0.14em] uppercase font-bold"
          >
            <LogOut size={13} />
            {t('nav_logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header — safe area top for notched iPhones */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-5 elite-glass border-y-0 border-x-0 header-safe"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg bg-black flex items-center justify-center"
            style={{ border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 14px rgba(212,175,55,0.07)' }}
          >
            <span className="font-playfair font-black text-base elite-text-gold">V</span>
          </div>
          <h1 className="text-[1.05rem] font-playfair font-black tracking-[0.08em] text-white uppercase">
            Elite<span className="elite-text-gold font-medium">Finance</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle compact />
          <button
            onClick={logout}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors duration-200 hover:text-rose-400"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <LogOut size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 lg:px-10 pb-4 lg:pb-10 main-pt-mobile lg:pt-10 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation — Floating Pill with safe area */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div
          className="rounded-2xl flex items-center justify-around px-2 py-2"
          style={{
            background: 'rgba(8, 8, 8, 0.95)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            boxShadow: '0 -1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl relative min-h-[48px] justify-center"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileNavActive"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'rgba(212,175,55,0.1)',
                      border: '1px solid rgba(212,175,55,0.2)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon
                  className="relative z-10 transition-colors duration-200"
                  size={20}
                  style={{ color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.25)' }}
                />
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.1em] relative z-10 transition-colors duration-200"
                  style={{ color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.2)' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
