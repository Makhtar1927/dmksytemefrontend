import { useEffect, useState, useRef } from 'react';
import { Search, Plus, MoreVertical, Shield, Loader2, X, Edit, Trash2, Power, CheckCircle, Copy, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../utils/logger';

type Member = {
  id: string;
  dmk_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: string;
  sector: string;
  status: string;
  birth_date?: string;
  birth_place?: string;
  address?: string;
  cni_number?: string;
  cni_issue_date?: string;
  cni_expiry_date?: string;
  blood_type?: string;
  gender?: string;
  join_date?: string;
  profession?: string;
  sass_magal?: number;
  sass_ziaar?: number;
  sass_kst?: number;
  sass_cahier?: number;
  sass_projets?: number;
  sass_autres?: number;
  password?: string;
};

const SECTORS = [
  "Vaisselle", "Café", "Restauration", "Organisation", "Sonorisation",
  "Visuelle", "Bétail", "Cuisine", "Eau & Hygiène", "Protocole",
  "Decoration", "Culturelle", "Conservatoire", "Campagne", "Jayanté Kat yi",
  "Nouveau"
];

const ROLES = [
  "Membre Simple", "Membre Bureau", "Dieuwrigne Darou", "Trésorier",
  "Secrétaire Général", "Vice-Dieuwrigne", "Dieuwrigne", "Administrateur général",
  "Sage", "Commissaire au compte"
];

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tous les rôles');
  const [sectorFilter, setSectorFilter] = useState('Tous les secteurs');
  const [sassFilter, setSassFilter] = useState('Tous les Sass');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newMemberCredentials, setNewMemberCredentials] = useState<{id: string, firstName: string, lastName: string, email: string, password: string, status: string} | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'Membre Simple',
    sector: '',
    birth_date: '',
    birth_place: '',
    address: '',
    cni_number: '',
    cni_issue_date: '',
    cni_expiry_date: '',
    blood_type: '',
    gender: '',
    join_date: '',
    profession: '',
    sass_magal: 0,
    sass_ziaar: 0,
    sass_kst: 0,
    sass_cahier: 0,
    sass_projets: 0,
    sass_autres: 0,
  });

  // Password Reveal Modal state
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [revealMemberId, setRevealMemberId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [revealError, setRevealError] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});

  // Reset Password Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMemberId, setResetMemberId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Action Menu State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLTableElement>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('members')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,dmk_id.ilike.%${searchQuery}%`);
      }
      if (roleFilter !== 'Tous les rôles') {
        query = query.eq('role', roleFilter);
      }
      if (sectorFilter !== 'Tous les secteurs') {
        query = query.eq('sector', sectorFilter);
      }
      if (sassFilter !== 'Tous les Sass') {
        if (sassFilter === 'Magal/Gamou') query = query.gt('sass_magal', 0);
        if (sassFilter === 'Ziaar') query = query.gt('sass_ziaar', 0);
        if (sassFilter === 'Keur S. Touba') query = query.gt('sass_kst', 0);
        if (sassFilter === 'Cahier') query = query.gt('sass_cahier', 0);
        if (sassFilter === 'Projets') query = query.gt('sass_projets', 0);
        if (sassFilter === 'Autres') query = query.gt('sass_autres', 0);
      }

      // Apply pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setMembers(data || []);
      setTotalPages(count ? Math.ceil(count / ITEMS_PER_PAGE) : 1);
    } catch (err: any) {
      console.error('Erreur lors du chargement des membres:', err.message);
      setError('Impossible de charger la liste des membres. Avez-vous exécuté le script SQL dans Supabase ?');
    } finally {
      setLoading(false);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, sectorFilter, sassFilter]);

  // Fetch when page or filters change
  useEffect(() => {
    fetchMembers();
  }, [page, searchQuery, roleFilter, sectorFilter, sassFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateDmkId = async () => {
    const year = new Date().getFullYear();
    let isUnique = false;
    let formattedNumber = '';
    
    while (!isUnique) {
      // Generate a random number between 1000 and 9999
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      formattedNumber = randomNum.toString();
      
      // Check if it already exists (using limit instead of single to avoid 406 error)
      const { data } = await supabase
        .from('members')
        .select('id')
        .eq('dmk_id', `DMK-${year}-${formattedNumber}`)
        .limit(1);
        
      if (!data || data.length === 0) {
        isUnique = true;
      }
    }
    
    return `DMK-${year}-${formattedNumber}`;
  };

  const generatePassword = () => {
    // Caractères non ambigus (pas de l, 1, I, 0, O)
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#*';
    let pass = 'DMK-';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormData({
      first_name: '', last_name: '', email: '', phone: '', role: 'Membre Simple', sector: '',
      birth_date: '', birth_place: '', address: '', cni_number: '', cni_issue_date: '', cni_expiry_date: '', blood_type: '', gender: '', join_date: '', profession: '',
      sass_magal: 0, sass_ziaar: 0, sass_kst: 0, sass_cahier: 0, sass_projets: 0, sass_autres: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: Member) => {
    setActiveDropdown(null);
    setEditingMember(member);
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role,
      sector: member.sector || '',
      birth_date: member.birth_date || '',
      birth_place: member.birth_place || '',
      address: member.address || '',
      cni_number: member.cni_number || '',
      cni_issue_date: member.cni_issue_date || '',
      cni_expiry_date: member.cni_expiry_date || '',
      blood_type: member.blood_type || '',
      gender: member.gender || '',
      join_date: member.join_date || '',
      profession: member.profession || '',
      sass_magal: member.sass_magal || 0,
      sass_ziaar: member.sass_ziaar || 0,
      sass_kst: member.sass_kst || 0,
      sass_cahier: member.sass_cahier || 0,
      sass_projets: member.sass_projets || 0,
      sass_autres: member.sass_autres || 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation des valeurs négatives pour les engagements
    if (
      (formData.sass_magal && formData.sass_magal < 0) ||
      (formData.sass_ziaar && formData.sass_ziaar < 0) ||
      (formData.sass_kst && formData.sass_kst < 0) ||
      (formData.sass_cahier && formData.sass_cahier < 0) ||
      (formData.sass_projets && formData.sass_projets < 0) ||
      (formData.sass_autres && formData.sass_autres < 0)
    ) {
      alert("Les engagements financiers ne peuvent pas être négatifs.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingMember) {
        // Update existing member
        // Si l'email a été modifié, on doit le mettre à jour dans Supabase Auth
        const oldEmail = editingMember.email;
        const newEmail = formData.email ? formData.email.trim().toLowerCase() : null;
        
        if (oldEmail && newEmail && oldEmail !== newEmail) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const updateEmailResponse = await fetch(`${API_URL}/api/users/update-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldEmail, newEmail })
          });
          
          if (!updateEmailResponse.ok) {
            const errorData = await updateEmailResponse.json();
            if (updateEmailResponse.status === 409) {
              alert(errorData.message);
              setIsSubmitting(false);
              return;
            }
            throw new Error(errorData.message || 'Erreur lors de la mise à jour de l\'email dans Auth');
          }
        }

        const { error } = await supabase
          .from('members')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: newEmail,
            phone: formData.phone || null,
            role: formData.role,
            sector: formData.sector || null,
            birth_date: formData.birth_date || null,
            birth_place: formData.birth_place || null,
            address: formData.address || null,
            cni_number: formData.cni_number || null,
            cni_issue_date: formData.cni_issue_date || null,
            cni_expiry_date: formData.cni_expiry_date || null,
            blood_type: formData.blood_type || null,
            gender: formData.gender || null,
            join_date: formData.join_date || null,
            profession: formData.profession || null,
            sass_magal: formData.sass_magal,
            sass_ziaar: formData.sass_ziaar,
            sass_kst: formData.sass_kst,
            sass_cahier: formData.sass_cahier,
            sass_projets: formData.sass_projets,
            sass_autres: formData.sass_autres,
          })
          .eq('id', editingMember.id);

        if (error) throw error;
        
        await logActivity('MODIFICATION', 'MEMBRE', `Modification des informations de ${formData.first_name} ${formData.last_name}`, formData.sector || 'N/A');
      } else {
        // Insert new member
        const dmk_id = await generateDmkId();
        
        // 1. Generate auth credentials
        const generatedPassword = generatePassword();
        const loginEmail = formData.email ? formData.email.trim().toLowerCase() : `${dmk_id.toLowerCase()}@dmk.sn`;

        // 2. Préparation des données du membre
        const newMemberData = {
          dmk_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          role: formData.role,
          sector: formData.sector || null,
          birth_date: formData.birth_date || null,
          birth_place: formData.birth_place || null,
          address: formData.address || null,
          cni_number: formData.cni_number || null,
          cni_issue_date: formData.cni_issue_date || null,
          cni_expiry_date: formData.cni_expiry_date || null,
          blood_type: formData.blood_type || null,
          gender: formData.gender || null,
          join_date: formData.join_date || null,
          profession: formData.profession || null,
          sass_magal: formData.sass_magal,
          sass_ziaar: formData.sass_ziaar,
          sass_kst: formData.sass_kst,
          sass_cahier: formData.sass_cahier,
          sass_projets: formData.sass_projets,
          sass_autres: formData.sass_autres,
          status: 'Actif'
        };

        // 3. Appel de l'API Backend pour créer le compte et insérer en DB simultanément
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/users/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loginEmail,
            password: generatedPassword,
            userData: newMemberData
          })
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            alert(`Impossible de créer le membre : L'adresse email "${loginEmail}" est déjà utilisée par un autre compte.`);
            setIsSubmitting(false);
            return;
          }
          throw new Error(data.message || 'Erreur lors de la création du membre');
        }
        
        await logActivity('CRÉATION', 'MEMBRE', `Création du membre ${formData.first_name} ${formData.last_name} (${dmk_id})`, formData.sector || 'N/A');
        
        // 5. Alert the admin with credentials
        setNewMemberCredentials({
          id: dmk_id,
          firstName: formData.first_name,
          lastName: formData.last_name,
          email: loginEmail,
          password: generatedPassword,
          status: `✅ Compte activé avec succès`
        });
      }

      setIsModalOpen(false);
      setEditingMember(null);
      setFormData({
        first_name: '', last_name: '', email: '', phone: '', role: 'Membre Simple', sector: '',
        birth_date: '', birth_place: '', address: '', cni_number: '', cni_issue_date: '', cni_expiry_date: '', blood_type: '', gender: '', join_date: '', profession: '',
        sass_magal: 0, sass_ziaar: 0, sass_kst: 0, sass_cahier: 0, sass_projets: 0, sass_autres: 0
      });
      fetchMembers();
      
    } catch (err: any) {
      console.error("Erreur d'enregistrement:", err.message);
      alert("Une erreur est survenue lors de l'enregistrement du membre.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setActiveDropdown(null);
    const newStatus = currentStatus === 'Actif' ? 'Inactif' : 'Actif';
    
    try {
      const { error } = await supabase
        .from('members')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      setMembers(members.map(m => m.id === id ? { ...m, status: newStatus } : m));
      
      const member = members.find(m => m.id === id);
      if (member) {
        await logActivity('MODIFICATION', 'MEMBRE', `Changement de statut en ${newStatus} pour ${member.first_name} ${member.last_name}`, member.sector || 'N/A');
      }
    } catch (err: any) {
      alert("Erreur lors de la modification du statut.");
    }
  };

  const handleDeleteMember = async (id: string) => {
    setActiveDropdown(null);
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce membre définitivement ?")) return;
    
    try {
      const member = members.find(m => m.id === id);
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setMembers(members.filter(m => m.id !== id));
      
      if (member) {
        await logActivity('SUPPRESSION', 'MEMBRE', `Suppression du membre ${member.first_name} ${member.last_name}`, member.sector || 'N/A');
      }
    } catch (err: any) {
      alert("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden gap-4">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Gestion des Membres</h1>
          <p className="text-muted-foreground mt-1 font-medium">Annuaire complet et gestion des rôles de l'association</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="relative z-10 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground px-5 py-2.5 rounded-xl flex items-center font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 w-full md:w-auto justify-center"
        >
          <Plus size={20} className="mr-2" />
          Ajouter un Membre
        </button>
      </div>

      {/* --- Add/Edit Member Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-600"></div>
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/10">
              <h2 className="text-xl font-bold text-foreground">
                {editingMember ? 'Modifier le Membre' : 'Nouveau Membre'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveMember} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Prénom *</label>
                  <input required name="first_name" value={formData.first_name} onChange={handleInputChange} type="text" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nom *</label>
                  <input required name="last_name" value={formData.last_name} onChange={handleInputChange} type="text" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Téléphone</label>
                  <input name="phone" value={formData.phone} onChange={handleInputChange} type="tel" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Rôle *</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Secteur</label>
                  <select name="sector" value={formData.sector} onChange={handleInputChange} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none">
                    <option value="">Aucun secteur</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Informations Personnelles & Administratives</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Date de naissance</label>
                    <input name="birth_date" value={formData.birth_date || ''} onChange={handleInputChange} type="date" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Lieu de naissance</label>
                    <input name="birth_place" value={formData.birth_place || ''} onChange={handleInputChange} type="text" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Profession</label>
                    <input name="profession" value={formData.profession || ''} onChange={handleInputChange} type="text" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Adresse complète</label>
                    <input name="address" value={formData.address || ''} onChange={handleInputChange} type="text" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Numéro CNI</label>
                    <input name="cni_number" value={formData.cni_number || ''} onChange={handleInputChange} type="text" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Délivrance CNI</label>
                    <input name="cni_issue_date" value={formData.cni_issue_date || ''} onChange={handleInputChange} type="date" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Expiration CNI</label>
                    <input name="cni_expiry_date" value={formData.cni_expiry_date || ''} onChange={handleInputChange} type="date" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Groupe Sanguin</label>
                    <select name="blood_type" value={formData.blood_type || ''} onChange={handleInputChange} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm">
                      <option value="">Non spécifié</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Date d'adhésion</label>
                    <input name="join_date" value={formData.join_date || ''} onChange={handleInputChange} type="date" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Sexe</label>
                    <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm">
                      <option value="">Non spécifié</option>
                      <option value="Masculin">Masculin</option>
                      <option value="Féminin">Féminin</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Engagements Financiers (Prévisions en FCFA)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Magal/Gamou</label>
                    <input name="sass_magal" value={formData.sass_magal || ''} onChange={handleInputChange} type="number" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Ziaar</label>
                    <input name="sass_ziaar" value={formData.sass_ziaar || ''} onChange={handleInputChange} type="number" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Keur Serigne Touba</label>
                    <input name="sass_kst" value={formData.sass_kst || ''} onChange={handleInputChange} type="number" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Cahier S. Mountakha</label>
                    <input name="sass_cahier" value={formData.sass_cahier || ''} onChange={handleInputChange} type="number" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Projets</label>
                    <input name="sass_projets" value={formData.sass_projets || ''} onChange={handleInputChange} type="number" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Autres</label>
                    <input name="sass_autres" value={formData.sass_autres || ''} onChange={handleInputChange} type="number" className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border/50 mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors">
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

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/10">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-70" size={18} />
            <input 
              type="search" 
              name="dmk_members_search"
              id="dmk_members_search"
              autoComplete="new-password"
              placeholder="Rechercher par nom ou DMK-ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-foreground placeholder:text-muted-foreground transition-all shadow-sm"
            />
          </div>
          <div className="flex space-x-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-background text-foreground text-sm font-medium rounded-xl px-4 py-2.5 border border-border/50 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary flex-none shadow-sm transition-all cursor-pointer"
            >
              <option value="Tous les rôles">Tous les rôles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select 
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-background text-foreground text-sm font-medium rounded-xl px-4 py-2.5 border border-border/50 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary flex-none shadow-sm transition-all cursor-pointer"
            >
              <option value="Tous les secteurs">Tous les secteurs</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={sassFilter}
              onChange={(e) => setSassFilter(e.target.value)}
              className="bg-background text-foreground text-sm font-medium rounded-xl px-4 py-2.5 border border-border/50 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary flex-none whitespace-nowrap shadow-sm transition-all cursor-pointer"
            >
              <option value="Tous les Sass">Tous les Sass</option>
              <option value="Magal/Gamou">Sass Magal/Gamou</option>
              <option value="Ziaar">Sass Ziaar</option>
              <option value="Keur S. Touba">Sass Keur S. Touba</option>
              <option value="Cahier">Sass Cahier S. Mountakha</option>
              <option value="Projets">Sass Projets</option>
              <option value="Autres">Sass Autres</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Loader2 className="animate-spin mb-4 text-primary" size={32} />
              <p>Chargement des membres depuis Supabase...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-red-500">
              <p>{error}</p>
              <button 
                onClick={fetchMembers}
                className="mt-4 bg-secondary text-foreground px-4 py-2 rounded-md hover:bg-muted"
              >
                Réessayer
              </button>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <p>Aucun membre trouvé dans la base de données.</p>
              <p className="text-sm">Cliquez sur "Ajouter un Membre" pour commencer.</p>
            </div>
          ) : (
            (() => {
              const filteredMembers = members; // Filtre côté serveur via Supabase

              return (
                <div className="flex flex-col">
                <table className="w-full text-left text-sm" ref={dropdownRef}>
              <thead className="bg-muted/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">ID Numérique</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Nom Complet</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Rôle</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Secteur</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px] text-right">Total Engagé</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Mot de Passe</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Statut</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                        {member.dmk_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">{member.first_name} {member.last_name}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center font-medium">
                        {['Dieuwrigne Darou', 'Trésorier', 'Secrétaire Général', 'Vice-Dieuwrigne', 'Dieuwrigne', 'Administrateur général', 'Membre Bureau'].includes(member.role) ? (
                          <Shield size={14} className="mr-1.5 text-indigo-500" />
                        ) : null}
                        <span className={['Dieuwrigne Darou', 'Trésorier', 'Secrétaire Général', 'Vice-Dieuwrigne', 'Dieuwrigne', 'Administrateur général', 'Membre Bureau'].includes(member.role) ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-muted-foreground"}>{member.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{member.sector || '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">
                      {((member.sass_magal || 0) + (member.sass_ziaar || 0) + (member.sass_kst || 0) + (member.sass_cahier || 0) + (member.sass_projets || 0) + (member.sass_autres || 0)).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-medium">
                          {revealedPasswords[member.id] || '••••••••'}
                        </span>
                        {!revealedPasswords[member.id] && (
                          <button 
                            onClick={() => {
                              setRevealMemberId(member.id);
                              setAdminEmail('');
                              setAdminPassword('');
                              setRevealError('');
                              setRevealModalOpen(true);
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Afficher le mot de passe"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        member.status === 'Actif' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
                      }`}>
                        {member.status === 'Actif' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>}
                        {member.status === 'Inactif' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>}
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {activeDropdown === member.id && (
                        <div className="absolute right-6 top-10 w-48 bg-card border border-border/50 rounded-xl shadow-xl z-10 py-1.5 overflow-hidden backdrop-blur-xl">
                          <button 
                            className="w-full text-left px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 flex items-center transition-colors"
                            onClick={() => handleOpenEditModal(member)}
                          >
                            <Edit size={14} className="mr-2.5 text-muted-foreground" /> Modifier
                          </button>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 flex items-center transition-colors"
                            onClick={() => handleToggleStatus(member.id, member.status)}
                          >
                            <Power size={14} className={`mr-2.5 ${member.status === 'Actif' ? 'text-red-500' : 'text-emerald-500'}`} />
                            {member.status === 'Actif' ? 'Désactiver' : 'Activer'}
                          </button>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 flex items-center transition-colors"
                            onClick={() => {
                              setActiveDropdown(null);
                              setResetMemberId(member.id);
                              setAdminEmail('');
                              setAdminPassword('');
                              setResetNewPassword('');
                              setResetError('');
                              setResetModalOpen(true);
                            }}
                          >
                            <Key size={14} className="mr-2.5 text-indigo-500" /> Modifier Mot de passe
                          </button>
                          <div className="border-t border-border/50 my-1.5"></div>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 flex items-center transition-colors"
                            onClick={() => handleDeleteMember(member.id)}
                          >
                            <Trash2 size={14} className="mr-2.5" /> Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      Aucun membre ne correspond à vos filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
                <p className="text-sm text-muted-foreground font-medium">
                  Page <span className="font-bold text-foreground">{page}</span> sur <span className="font-bold text-foreground">{totalPages}</span>
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-background border border-border/50 text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-background border border-border/50 text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
            </div>
            );
          })()
          )}
        </div>
      </div>
      {/* Success Modal for New Member Credentials */}
      {newMemberCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-card/90 w-full max-w-md rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 overflow-hidden relative animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 z-10"></div>
            
            <div className="p-8 text-center max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner border border-emerald-500/20">
                <CheckCircle size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground mb-2">Membre Enregistré !</h2>
              <p className="text-sm font-medium text-muted-foreground mb-6">Transmettez ces identifiants sécurisés au nouveau membre.</p>
              
              <div className="bg-background/60 rounded-2xl p-5 text-left space-y-4 mb-8 border border-border/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                
                <div className="relative z-10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Membre</span>
                  <p className="text-foreground font-semibold text-lg">{newMemberCredentials.firstName} {newMemberCredentials.lastName}</p>
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID DMK</span>
                  <p className="text-foreground font-mono font-bold text-primary">{newMemberCredentials.id}</p>
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email (Identifiant)</span>
                  <p className="text-foreground font-medium">{newMemberCredentials.email}</p>
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mot de passe provisoire</span>
                  <p className="text-foreground font-mono font-medium">{newMemberCredentials.password}</p>
                </div>
                
                <div className="pt-3 mt-2 border-t border-border/50 relative z-10">
                   <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest flex items-center">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></div>
                     {newMemberCredentials.status}
                   </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    const text = `🎉 Bienvenue dans le portail DMK !\n\n👤 Membre : ${newMemberCredentials.firstName} ${newMemberCredentials.lastName}\n🔖 ID DMK : ${newMemberCredentials.id}\n\nVoici vos identifiants de connexion :\n📧 Email : ${newMemberCredentials.email}\n🔑 Mot de passe : ${newMemberCredentials.password}`;
                    navigator.clipboard.writeText(text);
                    alert("Message copié avec succès ! Vous pouvez le coller.");
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-blue-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center active:scale-[0.98]"
                >
                  <Copy size={18} className="mr-2" strokeWidth={2.5} />
                  Copier le message
                </button>
                <button 
                  onClick={() => setNewMemberCredentials(null)}
                  className="flex-1 bg-secondary text-foreground font-bold py-3.5 rounded-xl hover:bg-secondary/80 border border-border/50 transition-colors active:scale-[0.98]"
                >
                  Terminer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reveal Password Modal */}
      {revealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border/50 relative animate-in zoom-in-95 duration-200 hide-scrollbar">
            <div className="sticky top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500 z-10"></div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2 text-foreground">Vérification de sécurité</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Pour afficher ce mot de passe, veuillez entrer vos identifiants administrateur.
              </p>
              
              {revealError && (
                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-5 border border-red-100 dark:border-red-500/20 font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {revealError}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!adminEmail || !adminPassword) {
                  setRevealError('Veuillez remplir tous les champs');
                  return;
                }

                setIsRevealing(true);
                setRevealError('');
                try {
                  // Utilisation de fetch brut pour vérifier le mot de passe sans polluer l'état Supabase global
                  const authResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({
                      email: adminEmail,
                      password: adminPassword,
                    }),
                  });
                  
                  if (!authResponse.ok) {
                    throw new Error('Identifiants incorrects ou accès refusé');
                  }

                  const { data, error: fetchError } = await supabase
                    .from('members')
                    .select('password')
                    .eq('id', revealMemberId)
                    .single();
                  
                  if (fetchError) throw new Error("Impossible de récupérer le mot de passe");
                  
                  const memberPass = data.password || 'Aucun mot de passe (Ancien membre)';
                  
                  setRevealedPasswords(prev => ({ ...prev, [revealMemberId!]: memberPass }));
                  setRevealModalOpen(false);
                } catch (err: any) {
                  setRevealError(err.message);
                } finally {
                  setIsRevealing(false);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-foreground">Email Administrateur</label>
                    <input 
                      type="email" 
                      id="admin_verify_email"
                      name="admin_verify_email"
                      autoComplete="username"
                      value={adminEmail} 
                      onChange={e => setAdminEmail(e.target.value)} 
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                      placeholder="admin@dmk.sn"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-foreground">Mot de passe Administrateur</label>
                    <input 
                      type="password" 
                      id="admin_verify_password"
                      name="admin_verify_password"
                      autoComplete="current-password"
                      value={adminPassword} 
                      onChange={e => setAdminPassword(e.target.value)} 
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-6 mt-2 border-t border-border/50">
                    <button 
                      type="button"
                      onClick={() => setRevealModalOpen(false)}
                      className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground rounded-xl transition-colors"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isRevealing}
                      className="bg-gradient-to-r from-red-500 to-orange-600 text-white px-5 py-2.5 text-sm font-semibold rounded-xl flex items-center hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {isRevealing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Shield size={16} className="mr-2" />}
                      Vérifier et Afficher
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border/50 relative animate-in zoom-in-95 duration-200 hide-scrollbar">
            <div className="sticky top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-500 z-10"></div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2 text-foreground flex items-center">
                <Key size={20} className="mr-2 text-indigo-500" />
                Modifier le Mot de Passe
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Cela modifiera le mot de passe du membre et le déconnectera automatiquement de tous ses appareils actuels.
              </p>
              
              {resetError && (
                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-5 border border-red-100 dark:border-red-500/20 font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {resetError}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!adminEmail || !adminPassword || !resetNewPassword) {
                  setResetError('Veuillez remplir tous les champs');
                  return;
                }

                setIsResetting(true);
                setResetError('');
                try {
                  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                  const response = await fetch(`${API_URL}/api/users/reset-password`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      adminEmail,
                      adminPassword,
                      targetUserId: resetMemberId,
                      newPassword: resetNewPassword
                    })
                  });

                  if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || errData.message || 'Erreur lors de la réinitialisation');
                  }

                  setRevealedPasswords(prev => {
                    if (prev[resetMemberId!]) {
                      return { ...prev, [resetMemberId!]: resetNewPassword };
                    }
                    return prev;
                  });

                  alert("Mot de passe modifié avec succès ! L'utilisateur a été déconnecté de tous ses appareils.");
                  setResetModalOpen(false);
                } catch (err: any) {
                  setResetError(err.message);
                } finally {
                  setIsResetting(false);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-foreground">Nouveau Mot de Passe (pour le membre)</label>
                    <input 
                      type="text" 
                      id="new_member_password"
                      name="new_member_password"
                      autoComplete="new-password"
                      value={resetNewPassword} 
                      onChange={e => setResetNewPassword(e.target.value)} 
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                      placeholder="Ex: DMK-12345"
                    />
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Vérification Administrateur</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-foreground">Votre Email Admin</label>
                        <input 
                          type="email" 
                          id="admin_reset_email"
                          name="admin_reset_email"
                          autoComplete="username"
                          value={adminEmail} 
                          onChange={e => setAdminEmail(e.target.value)} 
                          className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                          placeholder="admin@dmk.sn"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-foreground">Votre Mot de Passe Admin</label>
                        <input 
                          type="password" 
                          id="admin_reset_password"
                          name="admin_reset_password"
                          autoComplete="current-password"
                          value={adminPassword} 
                          onChange={e => setAdminPassword(e.target.value)} 
                          className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-6 mt-2 border-t border-border/50">
                    <button 
                      type="button"
                      onClick={() => setResetModalOpen(false)}
                      className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground rounded-xl transition-colors"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isResetting}
                      className="bg-gradient-to-r from-primary to-indigo-600 text-white px-5 py-2.5 text-sm font-semibold rounded-xl flex items-center hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {isResetting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Shield size={16} className="mr-2" />}
                      Modifier et Déconnecter
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Members;
