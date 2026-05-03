import { useEffect, useState } from 'react';
import { Send, MessageSquare, AlertTriangle, Loader2, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../utils/logger';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Communication = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'Push Application',
    target_audience: 'Tous les membres',
    content: ''
  });

  const [selectedSector, setSelectedSector] = useState('');
  const [selectedMember, setSelectedMember] = useState('');

  const SECTORS = [
    "Vaisselle", "Café", "Restauration", "Organisation", "Sonorisation",
    "Visuelle", "Bétail", "Cuisine", "Eau & Hygiène", "Protocole",
    "Decoration", "Culturelle", "Conservatoire", "Campagne", "Jayanté Kat yi",
    "Nouveau"
  ];

  const fetchHistory = async () => {
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Erreur historique:", err);
    } finally {
      setFetching(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data } = await supabase.from('members').select('id, first_name, last_name, sector, expo_push_token').order('first_name');
      if (data) setMembersList(data);
    } catch (err) {
      console.error("Erreur chargement membres:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchMembers();
  }, []);

  const handleDeleteCommunication = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette notification de l'historique ?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const productionUrl = 'https://dmksytemebackend.onrender.com';
      const baseUrl = window.location.hostname === 'localhost' ? API_URL : productionUrl;

      const response = await fetch(`${baseUrl}/api/communications/delete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ communicationId: id })
      });

      const result = await response.json();
      if (!response.ok || result.status === 'error') throw new Error(result.message);

      const commToDelete = history.find(h => h.id === id);
      await logActivity('SUPPRESSION', 'SYSTÈME', `Suppression d'une communication envoyée à: ${commToDelete?.target_audience || 'inconnu'}`);

      setHistory(history.filter(h => h.id !== id));
    } catch (err: any) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression: " + err.message);
    }
  };

  const handleUpdateCommunication = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const productionUrl = 'https://dmksytemebackend.onrender.com';
      const baseUrl = window.location.hostname === 'localhost' ? API_URL : productionUrl;

      const response = await fetch(`${baseUrl}/api/communications/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ communicationId: id, content: editContent })
      });

      const result = await response.json();
      if (!response.ok || result.status === 'error') throw new Error(result.message);

      const commToUpdate = history.find(h => h.id === id);
      await logActivity('MODIFICATION', 'SYSTÈME', `Modification du message envoyé à: ${commToUpdate?.target_audience || 'inconnu'}`);

      setHistory(history.map(h => h.id === id ? { ...h, content: editContent } : h));
      setEditingId(null);
    } catch (err: any) {
      console.error("Erreur modification:", err);
      alert("Erreur lors de la modification: " + err.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    
    if (formData.target_audience === 'Secteur Spécifique' && !selectedSector) {
      return alert("Veuillez choisir un secteur.");
    }
    if (formData.target_audience === 'Membre Spécifique' && !selectedMember) {
      return alert("Veuillez choisir un membre.");
    }
    
    setLoading(true);
    
    try {
      let audienceLog = formData.target_audience;
      if (formData.target_audience === 'Secteur Spécifique') audienceLog = `Secteur: ${selectedSector}`;
      if (formData.target_audience === 'Membre Spécifique') {
        const m = membersList.find(m => m.id === selectedMember);
        audienceLog = `Membre: ${m ? m.first_name + ' ' + m.last_name : selectedMember}`;
      }

      const { error } = await supabase.from('communications').insert([
        {
          type: formData.type,
          target_audience: audienceLog,
          content: formData.content,
          status: 'Envoyé',
          created_by: user?.email || 'Admin'
        }
      ]);

      if (error) throw error;

      await logActivity('CRÉATION', 'SYSTÈME', `Envoi d'une communication (${formData.type}) à: ${audienceLog}`);

      // ---------------------------------------------------------
      // ENVOI DES NOTIFICATIONS PUSH NATIVES (SONNERIE + BANNIÈRE)
      // ---------------------------------------------------------
      if (formData.type === 'Push Application') {
        let query = supabase.from('members').select('expo_push_token').not('expo_push_token', 'is', null);
        
        if (formData.target_audience === 'Bureau Uniquement') {
          const bureauRoles = ['Membre Bureau', 'Secrétaire Général', 'Secrétaire Générale', 'Présidence (DG/SG)', 'Dieuwrigne', 'Vice-Dieuwrigne', 'Vice Dieuwrigne', 'Trésorier', 'Trésorier Général', 'Trésorière'];
          query = query.in('role', bureauRoles);
        } else if (formData.target_audience === 'Secteur Spécifique') {
          query = query.eq('sector', selectedSector);
        } else if (formData.target_audience === 'Membre Spécifique') {
          query = query.eq('id', selectedMember);
        }
        
        const { data: membersWithTokens } = await query;
        const tokens = membersWithTokens?.map(m => m.expo_push_token).filter(Boolean) || [];

        if (tokens.length > 0) {
          const CHUNK_SIZE = 100;
          for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
            const chunk = tokens.slice(i, i + CHUNK_SIZE);
            const messages = chunk.map(token => ({
              to: token,
              sound: 'default',
              title: "Nouvelle Alerte DMK",
              body: formData.content,
              priority: 'high',
              categoryId: 'message',
              channelId: 'default',
              data: { withSome: 'data' },
            }));

            // Routage de la requête via notre backend Render pour éviter le CORS
            try {
              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
              const productionUrl = 'https://dmksytemebackend.onrender.com';
              const baseUrl = window.location.hostname === 'localhost' ? API_URL : productionUrl;
              
              await fetch(`${baseUrl}/api/notifications/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
              });
            } catch (pushErr) {
              console.warn("Push notification non envoyée, mais le message est enregistré.", pushErr);
            }
          }
        }
      }
      // ---------------------------------------------------------

      setFormData({ ...formData, content: '' }); // Reset text
      fetchHistory(); // Refresh history
      
    } catch (err: any) {
      console.error("Erreur d'envoi:", err.message);
      alert("Erreur lors de l'envoi de la notification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Centre de Communication</h1>
          <p className="text-muted-foreground mt-1 font-medium">Notifications de l'Application et Système DMK</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl shadow-sm p-6 relative overflow-hidden">
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center relative z-10">
            <MessageSquare className="mr-3 text-primary" size={24} />
            Nouvelle Notification Système
          </h2>
          
          <form onSubmit={handleSendMessage} className="space-y-5 relative z-10">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Type de Message</label>
              <select 
                name="type" 
                value={formData.type} 
                onChange={handleInputChange} 
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-sm cursor-pointer"
              >
                <option value="Push Application">Push Notification (App Mobile)</option>
                <option value="SMS Urgence">Alerte SMS (Urgence)</option>
                <option value="Email Système">Email Système</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Audience Cible</label>
              <select 
                name="target_audience" 
                value={formData.target_audience} 
                onChange={handleInputChange} 
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-sm cursor-pointer"
              >
                <option value="Tous les membres">Tous les membres (AG, Dahira)</option>
                <option value="Bureau Uniquement">Membres du Bureau uniquement</option>
                <option value="Secteur Spécifique">Secteur spécifique</option>
                <option value="Membre Spécifique">Membre spécifique</option>
                <option value="Retardataires Sass">Retardataires (Sass)</option>
              </select>
            </div>

            {formData.target_audience === 'Secteur Spécifique' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Sélectionnez le Secteur</label>
                <select 
                  value={selectedSector} 
                  onChange={(e) => setSelectedSector(e.target.value)} 
                  className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="">-- Choisir un secteur --</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {formData.target_audience === 'Membre Spécifique' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-foreground mb-1.5">Sélectionnez le Membre</label>
                <select 
                  value={selectedMember} 
                  onChange={(e) => setSelectedMember(e.target.value)} 
                  className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="">-- Choisir un membre --</option>
                  {membersList.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.sector})</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Contenu du Message</label>
              <textarea 
                required
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows={6}
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none transition-all shadow-sm"
                placeholder="Salam, le prochain dahira se tiendra..."
              ></textarea>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-6 border-t border-border/50 mt-6 gap-4 sm:gap-0">
              <div className="flex items-center space-x-3 bg-secondary/50 px-3 py-2.5 rounded-xl border border-border/50">
                <input type="checkbox" id="auto-delete" className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer" defaultChecked />
                <label htmlFor="auto-delete" className="text-sm font-medium text-foreground cursor-pointer">Notification prioritaire</label>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground font-semibold px-6 py-3 rounded-xl flex justify-center items-center shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
                Diffuser l'alerte
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-foreground mb-5 flex items-center">
              <Bell className="mr-2.5 text-primary" size={20} />
              Historique des envois
            </h2>
            
            {fetching ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border/50">
                <MessageSquare className="opacity-30 mb-2" size={32} />
                <p className="text-sm font-medium">Aucune notification envoyée.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="p-4 bg-background/50 hover:bg-secondary/50 rounded-xl border border-border/50 transition-colors shadow-sm group">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md border ${
                        item.type === 'Push Application' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400' :
                        item.type === 'SMS Urgence' ? 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400' :
                        'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {format(new Date(item.created_at), "dd MMM HH:mm", { locale: fr })}
                      </span>
                    </div>
                    
                    {editingId === item.id ? (
                      <div className="mt-2 animate-in fade-in duration-200">
                        <textarea 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-background border border-primary/50 rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 font-medium transition-colors">Annuler</button>
                          <button onClick={() => handleUpdateCommunication(item.id)} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium transition-colors">Enregistrer</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground font-medium line-clamp-2 mt-2 leading-relaxed">{item.content}</p>
                    )}
                    
                    <div className="flex flex-wrap justify-between items-center mt-3 pt-3 border-t border-border/50 gap-y-3 gap-x-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate max-w-[200px]" title={item.target_audience}>{item.target_audience}</span>
                      <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <button onClick={() => { setEditingId(item.id); setEditContent(item.content); }} className="text-[10px] text-blue-500 hover:text-blue-700 font-bold px-2 py-1 bg-blue-500/5 hover:bg-blue-500/10 rounded opacity-0 group-hover:opacity-100 transition-all">Modifier</button>
                        <button onClick={() => handleDeleteCommunication(item.id)} className="text-[10px] text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-500/5 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all">Supprimer</button>
                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-full flex items-center whitespace-nowrap">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div> Distribué
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-foreground mb-5 flex items-center">
              <AlertTriangle className="mr-2.5 text-amber-500" size={20} />
              Triggers Automatiques
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-background border border-border/50 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Relance Sass (J-3)</span>
                <div className="w-11 h-6 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full relative shadow-inner">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm transform transition-transform"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-background border border-border/50 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Rappel Événement (J-1)</span>
                <div className="w-11 h-6 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full relative shadow-inner">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm transform transition-transform"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communication;
