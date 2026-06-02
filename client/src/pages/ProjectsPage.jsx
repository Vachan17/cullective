import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Search, Trash2, Calendar, Image, MoreVertical } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toaster';
import { formatDate, shootTypeLabels } from '@/lib/utils';
import useProjectStore from '@/store/projectStore';

const shootTypes = ['wedding','portrait','event','commercial','landscape','wildlife','sports','other'];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, fetchProjects, createProject, deleteProject, isLoading } = useProjectStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', shootType:'wedding', shootDate:'' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Project name required'); return; }
    setCreating(true);
    try {
      const project = await createProject(form);
      toast.success('Project created!');
      setShowCreate(false);
      setForm({ name:'', description:'', shootType:'wedding', shootDate:'' });
      navigate(`/dashboard/projects/${project._id}`);
    } catch (e) { toast.error('Failed to create project'); }
    setCreating(false);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its photos?')) return;
    await deleteProject(id);
    toast.success('Project deleted');
  };

  const statusBadge = (status) => {
    const map = {
      empty: 'bg-obsidian-700 text-obsidian-400',
      uploading: 'bg-blue-500/20 text-blue-400',
      analyzing: 'bg-gold-500/20 text-gold-400',
      ready: 'bg-green-500/20 text-green-400',
      archived: 'bg-obsidian-700 text-obsidian-500',
    };
    return map[status] || map.empty;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Projects</h1>
          <p className="text-obsidian-400 mt-1">{projects.length} shoot{projects.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16}/> New Project</Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Search projects…" value={search} onChange={e=>setSearch(e.target.value)} icon={<Search size={16}/>} />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_,i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl border border-obsidian-700 p-16 text-center">
          <FolderOpen size={48} className="text-obsidian-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-obsidian-300 mb-2">{search ? 'No projects match your search' : 'No projects yet'}</h3>
          <p className="text-obsidian-500 mb-6">Create your first project to start uploading and analyzing photos.</p>
          {!search && <Button onClick={() => setShowCreate(true)}><Plus size={16}/> Create First Project</Button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((p, i) => (
              <motion.div key={p._id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}}
                transition={{delay:i*0.04}}
                className="glass rounded-2xl border border-obsidian-700 overflow-hidden card-hover cursor-pointer group"
                onClick={() => navigate(`/dashboard/projects/${p._id}`)}>
                {/* Cover */}
                <div className="h-36 bg-obsidian-800 relative overflow-hidden">
                  {p.coverImage ? (
                    <img src={p.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen size={32} className="text-obsidian-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950/80 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${statusBadge(p.status)}`}>{p.status}</span>
                  </div>
                  <button onClick={e => handleDelete(e, p._id)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate mb-1">{p.name}</h3>
                  {p.description && <p className="text-xs text-obsidian-500 mb-2 truncate">{p.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-obsidian-500">
                    <span className="flex items-center gap-1"><Image size={11}/>{(p.totalPhotos||0).toLocaleString()} photos</span>
                    {p.shootDate && <span className="flex items-center gap-1"><Calendar size={11}/>{formatDate(p.shootDate)}</span>}
                  </div>
                  <div className="mt-2 text-xs text-obsidian-600">{shootTypeLabels[p.shootType] || p.shootType}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Project">
        <div className="space-y-4">
          <Input label="Project name *" placeholder="e.g. Sarah & James Wedding" value={form.name}
            onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Input label="Description" placeholder="Optional notes about this shoot" value={form.description}
            onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-obsidian-300">Shoot type</label>
            <select value={form.shootType} onChange={e=>setForm(f=>({...f,shootType:e.target.value}))}
              className="w-full bg-obsidian-800 border border-obsidian-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500/40">
              {shootTypes.map(t => <option key={t} value={t}>{shootTypeLabels[t] || t}</option>)}
            </select>
          </div>
          <Input label="Shoot date" type="date" value={form.shootDate}
            onChange={e=>setForm(f=>({...f,shootDate:e.target.value}))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} isLoading={creating}>Create Project</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
