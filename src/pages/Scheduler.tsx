// DMK Web Admin - Scheduler Module
import React, { useEffect, useState, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Loader2, X, Edit2, Trash2, Video, Users, Link2, Sparkles, Settings, UserCheck, Radio, CheckCircle } from 'lucide-react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../lib/supabase';
import { logActivity } from '../utils/logger';

const locales = {
  'fr': fr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const SECTORS = [
  "Vaisselle", "Café", "Restauration", "Organisation", "Sonorisation",
  "Visuelle", "Bétail", "Cuisine", "Eau & Hygiène", "Protocole",
  "Decoration", "Culturelle", "Conservatoire", "Campagne", "Jayanté Kat yi",
  "Nouveau"
];

type EventData = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  location: string | null;
  description: string | null;
  maps_link: string | null;
  meet_url?: string | null;
  is_online?: boolean;
  target_audience?: string;
  target_sector?: string | null;
  target_member_id?: string | null;
};

type FormattedEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: EventData;
};

type MemberItem = {
  id: string;
  first_name: string;
  last_name: string;
  sector: string;
};

interface MeetingParticipant {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  role: string;
  avatar_url?: string;
  photo_url?: string;
}

const Scheduler = () => {
  const [events, setEvents] = useState<FormattedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersList, setMembersList] = useState<MemberItem[]>([]);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Modal Gestion Réunion
  const [managedMeeting, setManagedMeeting] = useState<EventData | null>(null);
  const [manageTab, setManageTab] = useState<'membres' | 'presences' | 'suivi'>('presences');
  const [bureauMembers, setBureauMembers] = useState<MeetingParticipant[]>([]);
  const [confirmedAttendees, setConfirmedAttendees] = useState<MeetingParticipant[]>([]);
  const [liveViewers, setLiveViewers] = useState<MeetingParticipant[]>([]);
  const [loadingManage, setLoadingManage] = useState(false);

  const openManageMeeting = async (meeting: EventData) => {
    setManagedMeeting(meeting);
    setManageTab('presences');
    setLoadingManage(true);
    setBureauMembers([]);
    setConfirmedAttendees([]);
    setLiveViewers([]);

    try {
      const bureauRoles = ['Membre Bureau', 'Secrétaire Général', 'Secrétaire Générale', 'Présidence (DG/SG)', 'Dieuwrigne', 'Vice-Dieuwrigne', 'Vice Dieuwrigne', 'Trésorier', 'Trésorier Général', 'Trésorière', 'Sage', 'Commissaire au compte'];

      const mapParticipant = (m: any): MeetingParticipant => ({
        ...m,
        full_name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email,
        avatar_url: m.photo_url || ''
      });

      // 1. Membres du Bureau
      const { data: bm } = await supabase
        .from('members')
        .select('id, first_name, last_name, email, role, photo_url')
        .in('role', bureauRoles)
        .order('first_name');
      if (bm) setBureauMembers(bm.map(mapParticipant));

      // 2. Présences confirmées
      const { data: att } = await supabase
        .from('attendances')
        .select('member_email')
        .eq('meeting_id', meeting.id.toString());

      if (att && att.length > 0) {
        const emails = att.map((a: { member_email: string }) => a.member_email);
        const { data: attendeeProfiles } = await supabase
          .from('members')
          .select('id, first_name, last_name, email, role, photo_url')
          .in('email', emails);
        if (attendeeProfiles) setConfirmedAttendees(attendeeProfiles.map(mapParticipant));
      }

      // 3. Suivi en direct (meeting_viewers)
      const { data: viewers } = await supabase
        .from('meeting_viewers')
        .select('member_email, joined_at')
        .eq('meeting_id', meeting.id.toString())
        .order('joined_at', { ascending: false });

      if (viewers && viewers.length > 0) {
        const vEmails = viewers.map((v: { member_email: string }) => v.member_email);
        const { data: viewerProfiles } = await supabase
          .from('members')
          .select('id, first_name, last_name, email, role, photo_url')
          .in('email', vEmails);
        if (viewerProfiles) setLiveViewers(viewerProfiles.map(mapParticipant));
      }
    } catch (err) {
      console.warn("Erreur chargement gestion:", err);
    } finally {
      setLoadingManage(false);
    }
  };
  
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'Dahira',
    event_date: '',
    location: '',
    description: '',
    maps_link: '',
    meet_url: '',
    is_online: false,
    target_audience: 'Tous les membres',
    target_sector: '',
    target_member_id: ''
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;

      const formattedEvents: FormattedEvent[] = (data || []).map((evt: EventData) => {
        const startDate = new Date(evt.event_date);
        
        if (!isValid(startDate)) return null;

        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
        return {
          id: evt.id,
          title: evt.title,
          start: startDate,
          end: endDate,
          resource: evt
        };
      }).filter((evt): evt is FormattedEvent => evt !== null);

      setEvents(formattedEvents);
    } catch (err: unknown) {
      console.error("Erreur lors du chargement des événements", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await supabase.from('members').select('id, first_name, last_name, sector').order('first_name');
      if (data) setMembersList(data as MemberItem[]);
    } catch (err: unknown) {
      console.error("Erreur chargement membres:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted) {
        await fetchEvents();
        await fetchMembers();
      }
    };
    init();

    const channel = supabase
      .channel('scheduler_admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        if (isMounted) fetchEvents();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchEvents, fetchMembers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  const generateJitsiRoom = () => {
    const randomRoomId = Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
    const generatedUrl = `https://meet.jit.si/DMK-${randomRoomId}`;
    setFormData((prev) => ({
      ...prev,
      meet_url: generatedUrl,
      is_online: true,
      location: prev.location || 'Visioconférence Jitsi Meet (En Ligne)'
    }));
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date) {
      alert("Veuillez remplir les champs obligatoires (*).");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const eventDate = new Date(formData.event_date).toISOString();
      
      const eventPayload: Partial<EventData> = {
        title: formData.title,
        event_type: formData.event_type,
        event_date: eventDate,
        location: formData.location || null,
        description: formData.description || null,
        maps_link: formData.maps_link || null,
        meet_url: formData.meet_url || null,
        is_online: formData.is_online || Boolean(formData.meet_url),
        target_audience: formData.target_audience,
        target_sector: formData.target_audience === 'Secteur Spécifique' ? formData.target_sector : null,
        target_member_id: formData.target_audience === 'Membre Spécifique' ? formData.target_member_id : null
      };

      if (editingEventId) {
        const { error } = await supabase.from('events').update(eventPayload).eq('id', editingEventId);
        if (error) {
          const fallbackPayload = {
            title: formData.title,
            event_type: formData.event_type,
            event_date: eventDate,
            location: formData.location || null,
            description: formData.description || null,
            maps_link: formData.maps_link || null
          };
          const { error: err2 } = await supabase.from('events').update(fallbackPayload).eq('id', editingEventId);
          if (err2) throw err2;
        }
        await logActivity('MODIFICATION', 'ÉVÉNEMENT', `Modification de l'événement: ${formData.title}`);
      } else {
        const { error } = await supabase.from('events').insert([eventPayload]);
        if (error) {
          const fallbackPayload = {
            title: formData.title,
            event_type: formData.event_type,
            event_date: eventDate,
            location: formData.location || null,
            description: formData.description || null,
            maps_link: formData.maps_link || null
          };
          const { error: err2 } = await supabase.from('events').insert([fallbackPayload]);
          if (err2) throw err2;
        }
        await logActivity('CRÉATION', 'ÉVÉNEMENT', `Création d'un nouvel événement: ${formData.title}`);

        try {
          const visioInfo = formData.meet_url ? ` 🎥 Lien Visio: ${formData.meet_url}` : '';
          const notifTitle = `📅 Nouvelle Réunion/Événement: ${formData.title}`;
          const notifBody = `Vous êtes invité(e) à la réunion "${formData.title}" prévue le ${format(new Date(eventDate), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}.${visioInfo}`;

          await supabase.from('communications').insert([{
            title: notifTitle,
            content: notifBody,
            type: 'Push Application',
            target_audience: formData.target_audience
          }]);

          // Déclencher l'envoi Push FCM (Mobile Flutter) et Web Push (PWA Member-Web)
          const API_URL = import.meta.env.VITE_API_URL;
          const baseUrl = API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://dmksytemebackend-dfjz.onrender.com');

          let targetMemberIds: string[] | null = null;
          if (formData.target_audience === 'Bureau Uniquement') {
            const bureauRoles = ['Membre Bureau', 'Secrétaire Général', 'Secrétaire Générale', 'Présidence (DG/SG)', 'Dieuwrigne', 'Vice-Dieuwrigne', 'Vice Dieuwrigne', 'Trésorier', 'Trésorier Général', 'Trésorière', 'Sage', 'Commissaire au compte'];
            const { data: bMembers } = await supabase.from('members').select('id').in('role', bureauRoles);
            targetMemberIds = bMembers?.map(m => m.id) || [];
          } else if (formData.target_audience === 'Secteur Spécifique' && formData.target_sector) {
            const { data: sMembers } = await supabase.from('members').select('id').eq('sector', formData.target_sector);
            targetMemberIds = sMembers?.map(m => m.id) || [];
          } else if (formData.target_audience === 'Membre Spécifique' && formData.target_member_id) {
            targetMemberIds = [formData.target_member_id];
          }

          // A. Push FCM vers smartphones Flutter
          try {
            let fcmQuery = supabase.from('members').select('id, fcm_token').not('fcm_token', 'is', null);
            if (targetMemberIds) fcmQuery = fcmQuery.in('id', targetMemberIds);
            const { data: fcmMembers } = await fcmQuery;
            const fcmTokens = fcmMembers?.map(m => m.fcm_token).filter(Boolean) || [];

            if (fcmTokens.length > 0) {
              await fetch(`${baseUrl}/api/notifications/fcm-send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tokens: fcmTokens,
                  payload: {
                    title: notifTitle,
                    body: notifBody,
                    data: {
                      channel: 'alerts',
                      timestamp: Date.now().toString(),
                      type: 'new_event',
                    }
                  }
                }),
              });
            }
          } catch (fcmErr) {
            console.warn("Erreur envoi FCM événement:", fcmErr);
          }

          // B. Push Web vers PWA
          try {
            let pushQuery = supabase.from('push_subscriptions').select('member_id, subscription');
            if (targetMemberIds) pushQuery = pushQuery.in('member_id', targetMemberIds);
            const { data: webPushSubs } = await pushQuery;
            const subscriptions = webPushSubs?.map(s => s.subscription) || [];

            if (subscriptions.length > 0) {
              await fetch(`${baseUrl}/api/notifications/web-push-send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subscriptions,
                  payload: {
                    title: notifTitle,
                    body: notifBody,
                    data: {
                      channelId: 'dmk_alerts',
                    }
                  }
                }),
              });
            }
          } catch (wpErr) {
            console.warn("Erreur envoi Web Push événement:", wpErr);
          }

        } catch (notifErr) {
          console.warn("Notification non envoyée mais événement créé", notifErr);
        }
      }

      setIsModalOpen(false);
      setEditingEventId(null);
      resetForm();
      fetchEvents();
      
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      console.error("Erreur de sauvegarde:", errMsg);
      alert("Une erreur est survenue lors de l'enregistrement de l'événement: " + errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      event_type: 'Dahira',
      event_date: '',
      location: '',
      description: '',
      maps_link: '',
      meet_url: '',
      is_online: false,
      target_audience: 'Tous les membres',
      target_sector: '',
      target_member_id: ''
    });
  };

  const handleEditClick = (evt: FormattedEvent) => {
    const res = evt.resource;
    setEditingEventId(evt.id);
    setFormData({
      title: evt.title,
      event_type: res.event_type,
      event_date: new Date(res.event_date).toISOString().slice(0, 16),
      location: res.location || '',
      description: res.description || '',
      maps_link: res.maps_link || '',
      meet_url: res.meet_url || '',
      is_online: res.is_online || false,
      target_audience: res.target_audience || 'Tous les membres',
      target_sector: res.target_sector || '',
      target_member_id: res.target_member_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      await logActivity('SUPPRESSION', 'ÉVÉNEMENT', `Suppression de l'événement: ${title}`);
      fetchEvents();
    } catch (err: unknown) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression de l'événement.");
    }
  };

  const eventStyleGetter = (event: FormattedEvent) => {
    let backgroundColor = '#3b82f6';
    if (event.resource.event_type === 'Bureau') backgroundColor = '#9333ea';
    if (event.resource.event_type === 'AG') backgroundColor = '#ef4444';
    if (event.resource.is_online || event.resource.meet_url) backgroundColor = '#059669';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        fontWeight: 'bold',
        padding: '2px 6px'
      }
    };
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden gap-4">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Planificateur &amp; Visioconférences</h1>
          <p className="text-muted-foreground mt-1 font-medium">Gestion des réunions Bureau, Dahiras et Visioconférences ciblées</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="relative z-10 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground px-5 py-2.5 rounded-xl flex items-center font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 w-full md:w-auto justify-center"
        >
          <Plus size={20} className="mr-2" />
          Nouvelle Réunion / Événement
        </button>
      </div>

      {/* --- Add/Edit Event Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[92vh] flex flex-col relative animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-indigo-600"></div>
            
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/10 shrink-0">
              <h2 className="text-xl font-bold text-foreground flex items-center">
                <Video size={20} className="mr-2 text-primary" />
                {editingEventId ? "Modifier l'Événement" : "Programmer une Réunion / Événement"}
              </h2>
              <button 
                type="button" 
                onClick={() => { setIsModalOpen(false); setEditingEventId(null); resetForm(); }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Titre de la Réunion / Événement *</label>
                <input required name="title" value={formData.title} onChange={handleInputChange} type="text" placeholder="Ex: Réunion Bureau Mensuelle" className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Type *</label>
                  <select name="event_type" value={formData.event_type} onChange={handleInputChange} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none">
                    <option value="Bureau">Réunion Bureau</option>
                    <option value="Dahira">Dahira Mensuel</option>
                    <option value="AG">Assemblée Générale</option>
                    <option value="Magal">Magal / Gamou</option>
                    <option value="Autre">Autre Événement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Date et Heure *</label>
                  <input required name="event_date" value={formData.event_date} onChange={handleInputChange} type="datetime-local" className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground font-semibold focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>

              {/* SECTION AUDIENCE CIBLE & INVITÉS */}
              <div className="p-4 bg-muted/20 rounded-xl border border-border/50 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground flex items-center">
                  <Users size={16} className="mr-2 text-primary" />
                  Membres invités (Audience Cible)
                </label>
                <select name="target_audience" value={formData.target_audience} onChange={handleInputChange} className="w-full bg-background border border-border/50 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none">
                  <option value="Tous les membres">Tous les membres (AG, Dahira)</option>
                  <option value="Bureau Uniquement">Membres du Bureau uniquement</option>
                  <option value="Secteur Spécifique">Secteur spécifique</option>
                  <option value="Membre Spécifique">Membre spécifique</option>
                </select>

                {formData.target_audience === 'Secteur Spécifique' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Choisir le Secteur</label>
                    <select name="target_sector" value={formData.target_sector} onChange={handleInputChange} className="w-full bg-background border border-border/50 rounded-xl px-3.5 py-2 text-sm font-semibold text-foreground outline-none">
                      <option value="">-- Choisir un secteur --</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {formData.target_audience === 'Membre Spécifique' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Choisir le Membre</label>
                    <select name="target_member_id" value={formData.target_member_id} onChange={handleInputChange} className="w-full bg-background border border-border/50 rounded-xl px-3.5 py-2 text-sm font-semibold text-foreground outline-none">
                      <option value="">-- Choisir un membre --</option>
                      {membersList.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.sector})</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* SECTION VISIOCONFÉRENCE JITSI MEET */}
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center">
                    <Video size={16} className="mr-2 text-emerald-600" />
                    Format Visioconférence (Jitsi Meet)
                  </label>
                  <button 
                    type="button" 
                    onClick={generateJitsiRoom}
                    className="inline-flex items-center text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow transition-all active:scale-95"
                  >
                    <Sparkles size={13} className="mr-1.5" />
                    Générer la Visio Jitsi
                  </button>
                </div>

                <div>
                  <input 
                    name="meet_url" 
                    value={formData.meet_url} 
                    onChange={handleInputChange} 
                    type="url" 
                    placeholder="https://meet.jit.si/DMK-salon-visio" 
                    className="w-full bg-background border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                  {formData.meet_url && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center">
                      <Link2 size={12} className="mr-1" />
                      Lien visioconférence actif ! Accessible directement depuis l'application membre.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Lieu physique (si présentiel)</label>
                  <input name="location" value={formData.location} onChange={handleInputChange} type="text" placeholder="Ex: Siège DMK / Touba" className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Google Maps (Optionnel)</label>
                  <input name="maps_link" value={formData.maps_link} onChange={handleInputChange} type="url" placeholder="https://maps.app.goo.gl/..." className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Ordre du jour / Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Saisir les points à l'ordre du jour..." className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-border/50 flex justify-end space-x-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingEventId(null); resetForm(); }}
                  className="px-5 py-2.5 font-bold text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground font-extrabold text-xs px-6 py-2.5 rounded-xl flex items-center shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Enregistrer &amp; Programmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Big Calendar & List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl shadow-sm p-6">
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="h-[550px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                messages={{
                  next: "Suivant",
                  previous: "Précédent",
                  today: "Aujourd'hui",
                  month: "Mois",
                  week: "Semaine",
                  day: "Jour",
                  agenda: "Agenda"
                }}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar List */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center">
            <CalendarIcon className="mr-2 text-primary" size={20} />
            Prochaines Réunions &amp; Visios
          </h2>

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune réunion programmée.</p>
            ) : (
              events.map((evt) => {
                const res = evt.resource;
                const isOnline = res.is_online || Boolean(res.meet_url);
                return (
                  <div key={evt.id} className="p-4 bg-secondary/30 rounded-xl border border-border/50 space-y-2 hover:bg-secondary/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isOnline ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary'
                      }`}>
                        {isOnline ? 'Visioconférence' : res.event_type}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => openManageMeeting(res)} 
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Gérer les présences et le suivi en direct"
                        >
                          <Settings size={14} />
                        </button>
                        <button 
                          onClick={() => handleEditClick(evt)} 
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(evt.id, evt.title)} 
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-foreground line-clamp-1">{evt.title}</h3>
                    
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock size={12} className="mr-1.5 text-primary" />
                      {format(new Date(res.event_date), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </div>

                    {isOnline && res.meet_url && (
                      <a 
                        href={res.meet_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
                      >
                        <Video size={13} className="mr-1" />
                        Rejoindre la visio
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- Management Modal (Présences, Bureau, En Direct) --- */}
      {managedMeeting && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[92vh] flex flex-col relative animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border/50 bg-muted/10 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Gestion Réunion &amp; Suivi</span>
                </div>
                <h3 className="text-lg font-bold text-foreground truncate">{managedMeeting.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(managedMeeting.event_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setManagedMeeting(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-4 shrink-0">
              {([
                { key: 'presences', label: 'Présences', icon: <UserCheck size={14} />, count: confirmedAttendees.length },
                { key: 'membres', label: 'Bureau', icon: <Users size={14} />, count: bureauMembers.length },
                { key: 'suivi', label: 'En Direct', icon: <Radio size={14} />, count: liveViewers.length },
              ] as { key: 'presences' | 'membres' | 'suivi'; label: string; icon: React.ReactNode; count: number }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setManageTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    manageTab === tab.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span className="ml-0.5 text-[10px] bg-background/30 rounded-full px-1.5 py-0.2 font-extrabold">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
              {loadingManage ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* TAB PRÉSENCES */}
                  {manageTab === 'presences' && (
                    confirmedAttendees.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm font-medium">
                        Aucune présence confirmée pour le moment.
                      </div>
                    ) : (
                      confirmedAttendees.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center overflow-hidden">
                              {m.avatar_url || m.photo_url ? (
                                <img src={m.avatar_url || m.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (m.first_name || m.full_name || '?').charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-foreground">{m.full_name || `${m.first_name} ${m.last_name}`}</p>
                              <p className="text-[10px] text-muted-foreground">{m.role || 'Membre'}</p>
                            </div>
                          </div>
                          <CheckCircle size={16} className="text-emerald-500" />
                        </div>
                      ))
                    )
                  )}

                  {/* TAB BUREAU */}
                  {manageTab === 'membres' && (
                    bureauMembers.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm font-medium">
                        Aucun membre du bureau trouvé.
                      </div>
                    ) : (
                      bureauMembers.map(m => {
                        const hasConfirmed = confirmedAttendees.some(a => a.email === m.email);
                        return (
                          <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center overflow-hidden">
                                {m.avatar_url || m.photo_url ? (
                                  <img src={m.avatar_url || m.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (m.first_name || m.full_name || '?').charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-xs text-foreground">{m.full_name || `${m.first_name} ${m.last_name}`}</p>
                                <p className="text-[10px] text-muted-foreground">{m.role}</p>
                              </div>
                            </div>
                            {hasConfirmed ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Confirmé</span>
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">En attente</span>
                            )}
                          </div>
                        );
                      })
                    )
                  )}

                  {/* TAB EN DIRECT */}
                  {manageTab === 'suivi' && (
                    liveViewers.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm font-medium">
                        Aucun membre n'est actuellement en train de regarder la visio en direct.
                      </div>
                    ) : (
                      liveViewers.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center overflow-hidden">
                              {m.avatar_url || m.photo_url ? (
                                <img src={m.avatar_url || m.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (m.first_name || m.full_name || '?').charAt(0)
                              )}
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500 border border-background animate-pulse"></span>
                            </div>
                            <div>
                              <p className="font-bold text-xs text-foreground">{m.full_name || `${m.first_name} ${m.last_name}`}</p>
                              <p className="text-[10px] text-muted-foreground">{m.role || 'Membre'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                            Live
                          </span>
                        </div>
                      ))
                    )
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-muted/10 shrink-0">
              <button
                type="button"
                onClick={() => setManagedMeeting(null)}
                className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs py-2.5 rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
