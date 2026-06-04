import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AdminMemberCard from '../components/AdminMemberCard';
import * as htmlToImage from 'html-to-image';
import { 
  CreditCard, 
  Download, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Camera,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface CardMember {
  id: string;
  first_name: string;
  last_name: string;
  dmk_id: string;
  email?: string;
  phone?: string;
  sector?: string;
  role?: string;
  status?: string;
  gender?: string;
  marital_status?: string;
  profession?: string;
  card_status?: string;
  card_payment_date?: string;
  is_card_blocked?: boolean;
  photo_url?: string;
}

export default function CardsManagement() {
  const [activeTab, setActiveTab] = useState<'view' | 'manage'>('view');
  const [members, setMembers] = useState<CardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedMember, setSelectedMember] = useState<CardMember | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null!);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardScale, setCardScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        // Largeur de la carte = 800px. On laisse 40px de marge (20px de chaque côté)
        const newScale = Math.min(1, (containerWidth - 40) / 800);
        setCardScale(newScale);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [selectedMember, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupération de tous les membres
      const { data: membersData, error: membersErr } = await supabase
        .from('members')
        .select('*')
        .order('first_name', { ascending: true });
      
      if (membersErr) throw membersErr;

      setMembers(membersData || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des données", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  // Obtenir le statut de paiement pour un membre
  const getCardStatus = (member: CardMember) => {
    const dbCardStatus = member.card_status || 'unrequested';
    const dbCardPaymentDate = member.card_payment_date;

    if (dbCardStatus === 'active' && dbCardPaymentDate) {
      // Vérifier si la carte est expirée (valide 5 ans)
      const issueDate = new Date(dbCardPaymentDate);
      const expiryDate = new Date(issueDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 5);
      
      if (new Date() > expiryDate) {
        return { label: 'Expirée (Re-payer)', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle size={14} className="mr-1" /> };
      }
      return { label: 'Payée', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle size={14} className="mr-1" /> };
    }
    if (dbCardStatus === 'pending') {
      return { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={14} className="mr-1" /> };
    }
    return { label: 'Non demandée', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: <XCircle size={14} className="mr-1" /> };
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current || !selectedMember) return;
    
    setIsDownloading(true);
    try {
      // Force scale to 2 for high quality regardless of the CSS scale
      const dataUrl = await htmlToImage.toPng(cardRef.current, { 
        quality: 1, 
        pixelRatio: 2,
        backgroundColor: undefined
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Carte_Membre_${selectedMember.first_name}_${selectedMember.last_name}.png`;
      link.click();
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      alert("Une erreur est survenue lors de la création de l'image.");
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleCardBlock = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ is_card_blocked: !currentStatus })
        .eq('id', memberId);
        
      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('is_card_blocked')) {
          alert("Erreur: La colonne 'is_card_blocked' n'existe pas dans la base de données. Veuillez exécuter le script SQL fourni.");
        } else {
          throw error;
        }
        return;
      }
      
      setMembers(members.map(m => m.id === memberId ? { ...m, is_card_blocked: !currentStatus } : m));
    } catch (err) {
      console.error("Erreur de modification du statut:", err);
      alert("Erreur lors de la modification du statut de la carte.");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, member: CardMember) => {
    if (!e.target.files || e.target.files.length === 0 || !member?.email) return;
    const file = e.target.files[0];
    
    // Validation de la taille (5Mo max)
    if (file.size > 5 * 1024 * 1024) {
      alert("La taille de l'image ne doit pas dépasser 5Mo.");
      return;
    }

    setUploadingMemberId(member.id);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('email', member.email);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/users/upload-photo`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMembers(members.map(m => m.id === member.id ? { ...m, photo_url: data.photo_url } : m));
        if (selectedMember?.id === member.id) {
          setSelectedMember({ ...selectedMember, photo_url: data.photo_url });
        }
      } else {
        throw new Error(data.message || 'Erreur lors de l\'upload');
      }
    } catch (err) {
      console.error("Erreur d'upload de photo:", err);
      alert((err as Error).message || "Une erreur est survenue lors de l'envoi de la photo.");
    } finally {
      setUploadingMemberId(null);
      e.target.value = '';
    }
  };

  const filteredMembers = members.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    m.dmk_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-card p-6 rounded-3xl shadow-sm border border-border">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <CreditCard className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Cartes Membres</h2>
            <p className="text-muted-foreground text-sm">Gestion, visualisation et téléchargement des cartes virtuelles</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'view' 
                ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Voir & Télécharger
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'manage' 
                ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Gestion des Accès
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          type="text"
          placeholder="Rechercher par nom ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-card border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <div className="bg-white dark:bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          
          {/* TAB 1: VIEW & DOWNLOAD */}
          {activeTab === 'view' && (
            <div className="flex flex-col lg:flex-row h-[700px]">
              {/* Member List (Left Sidebar) */}
              <div className="w-full lg:w-1/3 border-r border-border flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20">
                <div className="p-4 border-b border-border bg-slate-100/50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-foreground">Sélectionner un membre</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {filteredMembers.map(member => {
                    const status = getCardStatus(member);
                    return (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                          selectedMember?.id === member.id 
                            ? 'bg-primary/10 border border-primary/20 shadow-sm' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className="flex flex-col truncate">
                          <span className={`font-bold truncate ${selectedMember?.id === member.id ? 'text-primary' : 'text-foreground'}`}>
                            {member.first_name} {member.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">{member.dmk_id || 'ID non attribué'}</span>
                        </div>
                        <div className={`flex items-center text-[10px] uppercase font-bold px-2 py-1 rounded-md ${status.color}`}>
                          {status.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card Preview (Right Area) */}
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                {selectedMember ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
                    
                    <div className="mb-6 flex justify-between w-full max-w-[800px] items-end">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Aperçu de la Carte</h3>
                        <p className="text-muted-foreground text-sm">Prête à être générée</p>
                      </div>
                      <button 
                        onClick={handleDownloadCard}
                        disabled={isDownloading}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                      >
                        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        Télécharger PNG
                      </button>
                    </div>

                    <div 
                      ref={containerRef}
                      className="w-full flex justify-center items-start overflow-visible"
                      style={{ height: `${504 * cardScale}px` }} // Hauteur dynamique pour éviter les débordements
                    >
                      <div 
                        className="origin-top transition-transform duration-300"
                        style={{ transform: `scale(${cardScale})` }}
                      >
                        <AdminMemberCard memberInfo={selectedMember} cardRef={cardRef} />
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <CreditCard size={64} className="opacity-20 mb-4" />
                    <p className="text-lg font-medium">Sélectionnez un membre dans la liste pour voir sa carte numérique.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE */}
          {activeTab === 'manage' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Membre</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Paiement</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Statut Carte</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.map((member) => {
                    const status = getCardStatus(member);
                    const isBlocked = member.is_card_blocked === true;

                    return (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-foreground">{member.first_name} {member.last_name}</div>
                              <div className="text-xs text-muted-foreground">{member.dmk_id || 'Sans ID'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center text-[10px] uppercase font-bold px-2 py-1 rounded-md ${status.color}`}>
                            {status.icon} {status.label}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isBlocked ? (
                            <div className="flex items-center text-red-600 dark:text-red-400 font-medium text-sm">
                              <ShieldAlert size={16} className="mr-1.5" /> Bloquée
                            </div>
                          ) : (
                            <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                              <ShieldCheck size={16} className="mr-1.5" /> Active
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                            <div className="relative">
                              <button
                                onClick={() => { document.getElementById(`upload-${member.id}`)?.click() }}
                                disabled={uploadingMemberId === member.id}
                                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                title="Changer la photo"
                              >
                                {uploadingMemberId === member.id ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                              </button>
                              <input 
                                id={`upload-${member.id}`}
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handlePhotoUpload(e, member)} 
                              />
                            </div>

                            <button
                              onClick={() => toggleCardBlock(member.id, isBlocked)}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                isBlocked 
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                              }`}
                            >
                              {isBlocked ? (
                                <>Débloquer</>
                              ) : (
                                <>Bloquer</>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredMembers.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Aucun membre trouvé.
                </div>
              )}
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
