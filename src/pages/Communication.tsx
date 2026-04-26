import { useEffect, useState } from 'react';
import { Send, MessageSquare, AlertTriangle, Loader2, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Communication = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    type: 'Push Application',
    target_audience: 'Tous les membres',
    content: ''
  });

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

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.from('communications').insert([
        {
          type: formData.type,
          target_audience: formData.target_audience,
          content: formData.content,
          status: 'Envoyé',
          created_by: user?.email || 'Admin'
        }
      ]);

      if (error) throw error;

      // ---------------------------------------------------------
      // ENVOI DES NOTIFICATIONS PUSH NATIVES (SONNERIE + BANNIÈRE)
      // ---------------------------------------------------------
      if (formData.type === 'Push Application') {
        let query = supabase.from('members').select('expo_push_token').not('expo_push_token', 'is', null);
        
        if (formData.target_audience === 'Bureau Uniquement') {
          const bureauRoles = ['Membre Bureau', 'Secrétaire Général', 'Secrétaire Générale', 'Présidence (DG/SG)', 'Dieuwrigne', 'Vice-Dieuwrigne', 'Vice Dieuwrigne', 'Trésorier', 'Trésorier Général', 'Trésorière'];
          query = query.in('role', bureauRoles);
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
              data: { withSome: 'data' },
            }));

            // Routage de la requête via notre backend Render pour éviter le CORS
            const API_URL = import.meta.env.VITE_API_URL || 'https://dmksytemebackend.onrender.com';
            await fetch(`${API_URL}/api/notifications/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(messages),
            });
          }
        }
      }
      // ---------------------------------------------------------

      alert("Notification système envoyée avec succès ! L'application mobile la recevra.");
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
                <option value="Retardataires Sass">Retardataires (Sass)</option>
              </select>
            </div>

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
                    <p className="text-sm text-foreground font-medium line-clamp-2 mt-2 leading-relaxed">{item.content}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.target_audience}</span>
                      <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></div> Distribué
                      </span>
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
