import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Loader2, X, ExternalLink, Edit2, Trash2 } from 'lucide-react';
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

type EventData = {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  location: string;
  description: string;
  maps_link: string;
};

const Scheduler = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'Dahira',
    event_date: '',
    location: '',
    description: '',
    maps_link: ''
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;

      // Format for react-big-calendar
      const formattedEvents = (data || []).map((evt: EventData) => {
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
      }).filter(Boolean);

      setEvents(formattedEvents);
    } catch (err: any) {
      console.error("Erreur lors du chargement des événements", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date) {
      alert("Veuillez remplir les champs obligatoires.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const eventDate = new Date(formData.event_date).toISOString();
      
      const eventPayload = {
        title: formData.title,
        event_type: formData.event_type,
        event_date: eventDate,
        location: formData.location || null,
        description: formData.description || null,
        maps_link: formData.maps_link || null
      };

      if (editingEventId) {
        const { error } = await supabase.from('events').update(eventPayload).eq('id', editingEventId);
        if (error) throw error;
        await logActivity('MODIFICATION', 'ÉVÉNEMENT', `Modification de l'événement: ${formData.title}`);
      } else {
        const { error } = await supabase.from('events').insert([eventPayload]);
        if (error) throw error;
        await logActivity('CRÉATION', 'ÉVÉNEMENT', `Création d'un nouvel événement: ${formData.title}`);
      }

      setIsModalOpen(false);
      setEditingEventId(null);
      setFormData({
        title: '', event_type: 'Dahira', event_date: '', location: '', description: '', maps_link: ''
      });
      fetchEvents();
      
    } catch (err: any) {
      console.error("Erreur de sauvegarde:", err.message);
      alert("Une erreur est survenue lors de l'enregistrement de l'événement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (evt: any) => {
    setEditingEventId(evt.id);
    setFormData({
      title: evt.title,
      event_type: evt.resource.event_type,
      // Format the date for the datetime-local input (YYYY-MM-DDThh:mm)
      event_date: new Date(evt.resource.event_date).toISOString().slice(0, 16),
      location: evt.resource.location || '',
      description: evt.resource.description || '',
      maps_link: evt.resource.maps_link || ''
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
    } catch (err) {
      alert("Erreur lors de la suppression de l'événement.");
    }
  };

  // Custom styling for events
  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3b82f6'; // blue default
    if (event.resource.event_type === 'Bureau') backgroundColor = '#9333ea'; // purple
    if (event.resource.event_type === 'AG') backgroundColor = '#ef4444'; // red
    
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden gap-4">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Planificateur</h1>
          <p className="text-muted-foreground mt-1 font-medium">Calendrier interactif des réunions et Dahiras</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground px-5 py-2.5 rounded-xl flex items-center font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 w-full md:w-auto justify-center"
        >
          <Plus size={20} className="mr-2" />
          Nouvel Événement
        </button>
      </div>

      {/* --- Add/Edit Event Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[90vh] flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-600"></div>
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/10 shrink-0">
              <h2 className="text-xl font-bold text-foreground">
                {editingEventId ? "Modifier l'Événement" : "Nouvel Événement"}
              </h2>
              <button type="button" onClick={() => {
                setIsModalOpen(false);
                setEditingEventId(null);
                setFormData({ title: '', event_type: 'Dahira', event_date: '', location: '', description: '', maps_link: '' });
              }} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Titre de l'événement *</label>
                <input required name="title" value={formData.title} onChange={handleInputChange} type="text" placeholder="Ex: Grande Dahira de Juin" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Type *</label>
                  <select name="event_type" value={formData.event_type} onChange={handleInputChange} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none">
                    <option>Dahira</option>
                    <option>Bureau</option>
                    <option>AG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date et Heure *</label>
                  <input required name="event_date" value={formData.event_date} onChange={handleInputChange} type="datetime-local" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Lieu</label>
                <input name="location" value={formData.location} onChange={handleInputChange} type="text" placeholder="Lieu de la rencontre" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Lien Google Maps (Optionnel)</label>
                <input name="maps_link" value={formData.maps_link} onChange={handleInputChange} type="url" placeholder="https://maps.app.goo.gl/..." className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
              </div>

              <div className="pt-6 border-t border-border/50 mt-6 flex justify-end space-x-3 shrink-0">
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setEditingEventId(null);
                  setFormData({ title: '', event_type: 'Dahira', event_date: '', location: '', description: '', maps_link: '' });
                }} className="px-5 py-2.5 font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl flex items-center shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl shadow-sm min-h-[500px] p-6 relative overflow-hidden">
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="h-[500px] bg-background rounded-xl p-3 border border-border/50 relative z-10 shadow-inner">
             {/* Note: react-big-calendar CSS needs adjustments for full dark mode support, using a wrapper here */}
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              culture="fr"
              eventPropGetter={eventStyleGetter}
              messages={{
                next: "Suivant",
                previous: "Précédent",
                today: "Aujourd'hui",
                month: "Mois",
                week: "Semaine",
                day: "Jour",
                agenda: "Agenda",
              }}
            />
          </div>
        </div>

        <div className="space-y-4 bg-card border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <h2 className="text-xl font-bold text-foreground flex items-center relative z-10 mb-6">
            {loading && <Loader2 size={18} className="animate-spin mr-3 text-primary" />}
            Prochains Événements
          </h2>
          
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 relative z-10 custom-scrollbar">
            {events.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center bg-secondary/20 rounded-xl border border-dashed border-border">
                <CalendarIcon className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucun événement prévu.</p>
              </div>
            )}
            
            {events.map((evt) => (
              <div key={evt.id} className="group relative bg-background/50 border border-border/50 p-5 rounded-xl hover:bg-secondary/50 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    evt.resource.event_type === 'Bureau' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' :
                    evt.resource.event_type === 'AG' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  }`}>
                    {evt.resource.event_type}
                  </span>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditClick(evt)} className="text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors p-1.5 rounded-md">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteEvent(evt.id, evt.title)} className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors p-1.5 rounded-md">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-extrabold text-foreground mb-3 text-lg line-clamp-2 group-hover:text-primary transition-colors">{evt.title}</h3>
                <div className="space-y-2.5 text-sm font-medium text-muted-foreground">
                  <div className="flex items-center">
                    <CalendarIcon size={16} className="mr-2.5 shrink-0 opacity-70" />
                    {isValid(evt.start) ? format(evt.start, "dd MMMM yyyy", { locale: fr }) : "Date invalide"}
                  </div>
                  <div className="flex items-center">
                    <Clock size={16} className="mr-2.5 shrink-0 opacity-70" />
                    {isValid(evt.start) ? format(evt.start, "HH:mm") : "--:--"}
                  </div>
                  {evt.resource.location && (
                    <div className="flex items-center">
                      <MapPin size={16} className="mr-2.5 min-w-[16px] opacity-70" />
                      <span className="truncate">{evt.resource.location}</span>
                    </div>
                  )}
                  {evt.resource.maps_link && (
                    <a href={evt.resource.maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mt-3 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors w-fit">
                      <ExternalLink size={14} className="mr-1.5" />
                      Ouvrir la carte
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
