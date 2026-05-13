import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getProjects, addProject, deleteProject } from '../services/api';
import { Project } from '../types';
import { Plus, Building2, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

export default function ProjectList() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', clientName: '', contractorName: '' });

  useEffect(() => {
    if (!user) return;
    const unsub = getProjects(user.uid, setProjects, console.error);
    return () => unsub();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProject.name || !newProject.clientName) return;
    try {
      await addProject({
        name: newProject.name,
        clientName: newProject.clientName,
        contractorName: newProject.contractorName,
        status: 'ongoing',
        ownerId: user.uid,
      });
      setNewProject({ name: '', clientName: '', contractorName: '' });
      setIsCreating(false);
    } catch (err: any) {
      console.error(err);
      alert('Error creating project: ' + err.message);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div>
          <h1 className="text-4xl font-playfair font-black tracking-[0.05em] text-white uppercase mb-2">{t('proj_title')}</h1>
          <p className="elite-text-silver tracking-wide">{t('proj_subtitle')}</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="elite-button px-7 py-3.5 flex items-center justify-center uppercase tracking-[0.1em] text-[11px] gap-2"
        >
          <Plus size={15} />
          {t('proj_new')}
        </button>
      </motion.div>

      {/* Create Form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35 }}
          className="elite-card p-7 md:p-10 relative overflow-hidden"
          style={{ border: '1px solid rgba(212,175,55,0.18)' }}
        >
          <div
            className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'rgba(212,175,55,0.05)', filter: 'blur(80px)' }}
          />
          <h2 className="text-xl font-playfair font-black mb-8 text-white uppercase tracking-[0.1em] relative z-10">
            {t('proj_form_title')}
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {t('proj_field_name')}
              </label>
              <input
                type="text"
                required
                className="elite-input"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g. Villa Horizon"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {t('proj_field_client')}
              </label>
              <input
                type="text"
                required
                className="elite-input"
                value={newProject.clientName}
                onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.22em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {t('proj_field_contractor')}
              </label>
              <input
                type="text"
                className="elite-input"
                value={newProject.contractorName}
                onChange={(e) => setNewProject({ ...newProject, contractorName: e.target.value })}
                placeholder="e.g. AMG Building"
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button type="submit" className="elite-button px-9 py-3 uppercase text-[11px] tracking-[0.1em]">
                {t('proj_deploy')}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-[11px] uppercase tracking-[0.1em] transition-colors duration-200 hover:text-white"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {t('proj_cancel')}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Project Grid */}
      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.map((project, index) => (
          <motion.div variants={item} key={project.id}>
            <div className="elite-card h-full flex flex-col group relative">
              <div className="p-7 flex-1 flex flex-col relative z-10">

                {/* Header row */}
                <div className="flex items-start justify-between mb-7">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-11 w-11 rounded-xl bg-black flex items-center justify-center transition-colors duration-400 shrink-0"
                      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Building2 size={18} style={{ color: '#D4AF37' }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-playfair font-black text-lg text-white uppercase tracking-[0.04em] leading-tight truncate max-w-[150px]">
                        {project.name}
                      </h3>
                      <p className="text-[9px] uppercase tracking-[0.2em] mt-1 font-bold" style={{ color: '#D4AF37' }}>
                        {project.clientName}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.06em] ml-2 mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    #{String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Footer */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {project.createdAt ? format(project.createdAt, 'MMM d, yyyy') : '—'}
                    </span>
                    <span className={project.status === 'ongoing' ? 'elite-badge-gold' : 'elite-badge-muted'}>
                      {project.status === 'ongoing' ? t('proj_status_active') : project.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <Link to={`/projects/${project.id}`} className="flex-1">
                      <button className="elite-button-outline w-full py-2.5 flex items-center justify-center uppercase text-[10px] tracking-[0.18em] gap-2">
                        {t('proj_open')}
                        <ArrowRight size={12} />
                      </button>
                    </Link>
                    <button
                      className="h-11 w-11 flex items-center justify-center rounded-xl transition-colors duration-200"
                      style={{ border: '1px solid transparent', color: 'rgba(255,255,255,0.18)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)';
                        e.currentTarget.style.color = '#f87171';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.18)';
                      }}
                      onClick={async () => {
                        if (confirm(t('proj_delete_confirm'))) {
                          try { await deleteProject(project.id); }
                          catch (err: any) { alert('Error deleting project: ' + err.message); }
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hover gold tint */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none rounded-xl"
                style={{ background: 'linear-gradient(160deg, transparent 60%, rgba(212,175,55,0.04) 100%)' }}
              />
            </div>
          </motion.div>
        ))}

        {/* Empty state */}
        {projects.length === 0 && !isCreating && (
          <motion.div variants={item} className="col-span-full">
            <div
              className="elite-card flex flex-col items-center justify-center py-32 px-6 group relative overflow-hidden"
              style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
            >
              <div
                className="h-18 w-18 rounded-full flex items-center justify-center mb-6 transition-all duration-600 group-hover:scale-110"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', width: 72, height: 72 }}
              >
                <Building2 size={28} className="transition-colors duration-600 group-hover:text-[#D4AF37]" style={{ color: 'rgba(255,255,255,0.18)' }} />
              </div>
              <h3 className="text-xl font-playfair font-black text-white uppercase tracking-[0.1em] relative z-10">
                {t('proj_empty_title')}
              </h3>
              <p className="mt-3 max-w-xs text-center relative z-10 text-[12px] tracking-wide font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {t('proj_empty_sub')}
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="elite-button mt-10 px-10 py-4 uppercase text-[11px] tracking-[0.1em]"
              >
                {t('proj_init')}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
