import { useEffect, useState } from 'react';
import { Search, Filter, Loader2, Activity, User, Calendar, MapPin, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  created_at: string;
  user_email: string;
  action_type: string;
  entity_type: string;
  details: string;
  sector: string;
}

const ACTION_TYPES = ['Tous', 'CRÉATION', 'MODIFICATION', 'SUPPRESSION', 'CONNEXION', 'AUTRE'];
const ENTITY_TYPES = ['Tous', 'MEMBRE', 'ÉVÉNEMENT', 'RÉUNION', 'TRÉSORERIE', 'SECTEUR', 'SYSTÈME'];

const Journal = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('Tous');
  const [entityFilter, setEntityFilter] = useState('Tous');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200); // Fetch last 200 logs

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement du journal:', err.message);
      setError('Impossible de charger le journal. Avez-vous exécuté le script SQL dans Supabase ?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('journal_admin_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchLogs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.sector && log.sector.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesAction = actionFilter === 'Tous' || log.action_type === actionFilter;
    const matchesEntity = entityFilter === 'Tous' || log.entity_type === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CRÉATION': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400';
      case 'MODIFICATION': return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400';
      case 'SUPPRESSION': return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400';
      case 'CONNEXION': return 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center">
            <Activity className="mr-3 text-primary" size={32} />
            Journal d'Activité
          </h1>
          <p className="text-muted-foreground mt-1.5 font-medium">Traçabilité complète des actions effectuées dans le système.</p>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row gap-4 relative overflow-hidden">
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative flex-1 z-10">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-70" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher (Utilisateur, détails, secteur)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-foreground transition-all shadow-sm"
          />
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar relative z-10">
          <div className="flex items-center bg-background border border-border/50 rounded-xl px-4 py-2.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/50">
            <Filter size={16} className="text-muted-foreground mr-2.5 opacity-70" />
            <select 
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-foreground focus:outline-none cursor-pointer w-full"
            >
              {ACTION_TYPES.map(type => (
                <option key={type} value={type}>{type === 'Tous' ? 'Toutes les Actions' : type}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-background border border-border/50 rounded-xl px-4 py-2.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/50">
            <Tag size={16} className="text-muted-foreground mr-2.5 opacity-70" />
            <select 
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-foreground focus:outline-none cursor-pointer w-full"
            >
              {ENTITY_TYPES.map(type => (
                <option key={type} value={type}>{type === 'Tous' ? 'Toutes les Entités' : type}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={fetchLogs}
            className="bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground px-4 py-2.5 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center shrink-0"
            title="Rafraîchir"
          >
            <Activity size={20} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <Loader2 className="animate-spin mb-4 text-primary" size={32} />
            <p>Chargement du journal...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-red-500">
            <p>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <Activity className="mb-4 opacity-20" size={48} />
            <p>Aucune activité enregistrée pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Date & Heure</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Utilisateur</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Action</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Entité</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Détails</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Secteur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-foreground flex items-center font-medium">
                      <Calendar size={14} className="mr-2 text-muted-foreground opacity-70 group-hover:text-primary transition-colors" />
                      {format(new Date(log.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <div className="flex items-center">
                        <User size={14} className="mr-2 text-primary opacity-80" />
                        {log.user_email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-transparent ${getActionColor(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground opacity-90">
                      {log.entity_type}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-muted-foreground font-medium group-hover:text-foreground transition-colors" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-6 py-4">
                      {log.sector && log.sector !== 'N/A' ? (
                        <div className="flex items-center text-accent-foreground font-medium">
                          <MapPin size={14} className="mr-1.5 opacity-70" />
                          {log.sector}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Aucun résultat ne correspond à vos critères de recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Journal;
