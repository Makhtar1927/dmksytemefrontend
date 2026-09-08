import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Mail, Lock, User, Phone, FileText, Coins, ArrowRight, ArrowLeft, CheckCircle, Clock, ShieldCheck, FileCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../utils/apiUrl';

const SECTORS = [
  "Vaisselle", "Café", "Restauration", "Organisation", "Sonorisation",
  "Visuelle", "Bétail", "Cuisine", "Eau & Hygiène", "Protocole",
  "Decoration", "Culturelle", "Conservatoire", "Campagne", "Jayanté Kat yi",
  "Nouveau"
];

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ dmk_id: string } | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    sector: '',
    gender: 'Masculin',
    birth_date: '',
    birth_place: '',
    address: '',
    profession: '',
    cni_number: '',
    cni_issue_date: '',
    cni_expiry_date: '',
    blood_type: '',
    join_date: new Date().toISOString().split('T')[0],
    sass_magal: '',
    sass_ziaar: '',
    sass_kst: '',
    sass_cahier: '',
    sass_projets: '',
    sass_autres: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (!acceptedTerms) {
      setError('Vous devez accepter la politique de confidentialité et les conditions d\'utilisation avant de soumettre le formulaire.');
      return;
    }

    setLoading(true);

    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          sector: formData.sector,
          gender: formData.gender,
          birth_date: formData.birth_date,
          birth_place: formData.birth_place,
          address: formData.address,
          profession: formData.profession,
          cni_number: formData.cni_number,
          cni_issue_date: formData.cni_issue_date,
          cni_expiry_date: formData.cni_expiry_date,
          blood_type: formData.blood_type,
          join_date: formData.join_date,
          sass_magal: formData.sass_magal,
          sass_ziaar: formData.sass_ziaar,
          sass_kst: formData.sass_kst,
          sass_cahier: formData.sass_cahier,
          sass_projets: formData.sass_projets,
          sass_autres: formData.sass_autres
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Une erreur est survenue lors de l\'inscription.');
      }

      setSuccessData({ dmk_id: data.dmk_id });

    } catch (err: unknown) {
      // Direct client fallback via Supabase if backend fails
      try {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const generatedDmkId = `DMK-${year}-${randomNum}`;

        const { error: authErr } = await supabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              dmk_id: generatedDmkId
            }
          }
        });

        if (authErr) throw authErr;

        const { error: dbErr } = await supabase.from('members').insert([{
          dmk_id: generatedDmkId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone || null,
          sector: formData.sector || 'Non attribué',
          role: 'Membre Simple',
          status: 'En attente',
          gender: formData.gender || 'Masculin',
          birth_date: formData.birth_date || null,
          birth_place: formData.birth_place || null,
          address: formData.address || null,
          profession: formData.profession || null,
          cni_number: formData.cni_number || null,
          cni_issue_date: formData.cni_issue_date || null,
          cni_expiry_date: formData.cni_expiry_date || null,
          blood_type: formData.blood_type || null,
          join_date: formData.join_date || new Date().toISOString().split('T')[0],
          sass_magal: Number(formData.sass_magal) || 0,
          sass_ziaar: Number(formData.sass_ziaar) || 0,
          sass_kst: Number(formData.sass_kst) || 0,
          sass_cahier: Number(formData.sass_cahier) || 0,
          sass_projets: Number(formData.sass_projets) || 0,
          sass_autres: Number(formData.sass_autres) || 0,
          password: formData.password
        }]);

        if (dbErr) throw dbErr;

        setSuccessData({ dmk_id: generatedDmkId });

      } catch (fallbackErr: unknown) {
        const primaryMsg = err instanceof Error ? err.message : null;
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : null;
        setError(primaryMsg || fallbackMsg || 'Échec de l\'inscription.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-y-auto py-12 px-4 font-sans">
      {/* Background decoration Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-primary/20 to-blue-600/10 blur-[130px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-purple-600/20 to-primary/10 blur-[130px] animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-3xl bg-card/80 dark:bg-card/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">

        {/* Back link */}
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={16} className="mr-1.5" />
            Retour à la connexion
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <img 
              src="/icon.png" 
              alt="DMK Logo" 
              className="w-full h-full object-cover rounded-2xl relative z-10 shadow-md bg-white"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/2563eb/white?text=DMK'; }}
            />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Inscription Membre DMK</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Remplissez votre fiche d'inscription au registre</p>
        </div>

        {/* SUCCESS SCREEN */}
        {successData ? (
          <div className="py-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Clock size={44} className="animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">Demande d'inscription enregistrée</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Votre fiche a été transmise avec l'identifiant membre provisoire :
              </p>
              <div className="inline-block bg-primary/10 border border-primary/20 text-primary font-mono font-extrabold text-xl px-5 py-2 rounded-xl mt-2 shadow-inner">
                {successData.dmk_id}
              </div>
            </div>

            {/* Warning / Status Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-left text-sm space-y-3 text-foreground max-w-lg mx-auto shadow-sm">
              <div className="font-bold flex items-center text-base border-b border-primary/10 pb-2.5 text-primary">
                <ShieldCheck size={20} className="mr-2 shrink-0 text-primary" />
                Compte en attente de validation
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Votre compte est actuellement <span className="font-bold text-foreground">en attente d'activation</span>. Votre dossier sera examiné et <span className="font-bold text-foreground">validé par l'administrateur d'ici 48h</span> après vérification des informations fournies.
              </p>
              
              {/* Timeline Steps - Professional Unicolor Vector Icons */}
              <div className="pt-2 grid grid-cols-3 gap-2.5 text-center text-xs font-semibold">
                <div className="bg-primary/10 text-primary p-3 rounded-xl border border-primary/20 flex flex-col items-center justify-center">
                  <CheckCircle size={18} className="mb-1 text-primary" />
                  <span className="block text-[10px] uppercase text-primary/70 font-extrabold">Étape 1</span>
                  <span className="text-[11px] font-bold">Soumise</span>
                </div>
                <div className="bg-primary/10 text-primary p-3 rounded-xl border border-primary/20 flex flex-col items-center justify-center">
                  <Clock size={18} className="mb-1 text-primary animate-pulse" />
                  <span className="block text-[10px] uppercase text-primary/70 font-extrabold">Étape 2</span>
                  <span className="text-[11px] font-bold">Examen (48h max)</span>
                </div>
                <div className="bg-muted/40 text-muted-foreground p-3 rounded-xl border border-border/50 flex flex-col items-center justify-center">
                  <Lock size={18} className="mb-1 text-muted-foreground/60" />
                  <span className="block text-[10px] uppercase text-muted-foreground/60 font-extrabold">Étape 3</span>
                  <span className="text-[11px] font-bold">Activation</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full max-w-xs bg-gradient-to-r from-primary to-blue-600 text-white font-extrabold py-3.5 rounded-2xl hover:shadow-lg transition-all active:scale-[0.98] inline-flex items-center justify-center"
              >
                Retour à la page de connexion
                <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        ) : (
          /* FORM CONTENT */
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm border border-red-500/20 font-medium flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-3 shrink-0"></div>
                {error}
              </div>
            )}

            {/* SECTION 1: Informations Principales & Connexion */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary font-extrabold text-base border-b border-border/50 pb-2">
                <User size={18} />
                <span>1. Informations de Connexion & Identité</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Prénom *</label>
                  <input required name="first_name" value={formData.first_name} onChange={handleChange} placeholder="Moustapha" type="text" className="w-full px-4 py-3 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Nom *</label>
                  <input required name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Diop" type="text" className="w-full px-4 py-3 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Adresse Email *</label>
                  <div className="relative">
                    <input required name="email" value={formData.email} onChange={handleChange} placeholder="exemple@dmk.com" type="email" className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-sm" />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Numéro de Téléphone</label>
                  <div className="relative">
                    <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+221 77 000 00 00" type="tel" className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-sm" />
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Mot de passe *</label>
                  <div className="relative">
                    <input required name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" type="password" className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-sm" />
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Confirmer le mot de passe *</label>
                  <div className="relative">
                    <input required name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" type="password" className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-sm" />
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Secteur / Dahira</label>
                  <select name="sector" value={formData.sector} onChange={handleChange} className="w-full px-4 py-3 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-sm">
                    <option value="">Sélectionner un secteur</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Sexe / Genre</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none transition-all text-sm">
                    <option value="Masculin">Masculin</option>
                    <option value="Féminin">Féminin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Informations Personnelles & Administratives */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2 text-primary font-extrabold text-base border-b border-border/50 pb-2">
                <FileText size={18} />
                <span>2. Informations Personnelles & Administratives</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Date de naissance</label>
                  <input name="birth_date" value={formData.birth_date} onChange={handleChange} type="date" className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Lieu de naissance</label>
                  <input name="birth_place" value={formData.birth_place} onChange={handleChange} placeholder="Ex: Dakar" type="text" className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Profession</label>
                  <input name="profession" value={formData.profession} onChange={handleChange} placeholder="Ex: Ingénieur" type="text" className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/80 mb-1">Adresse complète</label>
                <input name="address" value={formData.address} onChange={handleChange} placeholder="Ex: Cité Keur Gorgui, Villa 123" type="text" className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Numéro CNI</label>
                  <input name="cni_number" value={formData.cni_number} onChange={handleChange} placeholder="1 234 5678 90123" type="text" className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Délivrance CNI</label>
                  <input name="cni_issue_date" value={formData.cni_issue_date} onChange={handleChange} type="date" className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Expiration CNI</label>
                  <input name="cni_expiry_date" value={formData.cni_expiry_date} onChange={handleChange} type="date" className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Groupe Sanguin</label>
                  <select name="blood_type" value={formData.blood_type} onChange={handleChange} className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm">
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
                  <label className="block text-xs font-bold text-foreground/80 mb-1">Date d'adhésion</label>
                  <input name="join_date" value={formData.join_date} onChange={handleChange} type="date" className="w-full px-3 py-2.5 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
              </div>
            </div>

            {/* SECTION 3: Engagements Financiers (Sass) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2 text-primary font-extrabold text-base border-b border-border/50 pb-2">
                <Coins size={18} />
                <span>3. Engagements Financiers (Prévisions Sass en FCFA)</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Magal/Gamou</label>
                  <input name="sass_magal" value={formData.sass_magal} onChange={handleChange} placeholder="0" type="number" className="w-full px-3 py-2 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Ziaar</label>
                  <input name="sass_ziaar" value={formData.sass_ziaar} onChange={handleChange} placeholder="0" type="number" className="w-full px-3 py-2 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Keur Serigne Touba</label>
                  <input name="sass_kst" value={formData.sass_kst} onChange={handleChange} placeholder="0" type="number" className="w-full px-3 py-2 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Cahier S. Mountakha</label>
                  <input name="sass_cahier" value={formData.sass_cahier} onChange={handleChange} placeholder="0" type="number" className="w-full px-3 py-2 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Projets</label>
                  <input name="sass_projets" value={formData.sass_projets} onChange={handleChange} placeholder="0" type="number" className="w-full px-3 py-2 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Autres</label>
                  <input name="sass_autres" value={formData.sass_autres} onChange={handleChange} placeholder="0" type="number" className="w-full px-3 py-2 bg-background/50 border border-border/60 rounded-xl text-foreground font-medium focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
              </div>
            </div>

            {/* SECTION 4: POLITIQUE DE CONFIDENTIALITÉ ET CONDITIONS */}
            <div className="pt-4 border-t border-border/60 space-y-3">
              <div className="flex items-start space-x-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
                <input
                  type="checkbox"
                  id="terms_checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-primary rounded-lg cursor-pointer"
                />
                <label htmlFor="terms_checkbox" className="text-xs text-foreground/90 leading-relaxed cursor-pointer font-medium">
                  J'accepte la <button type="button" onClick={() => setShowTermsModal(true)} className="text-primary font-bold underline hover:opacity-80">Politique de Confidentialité</button> et les <button type="button" onClick={() => setShowTermsModal(true)} className="text-primary font-bold underline hover:opacity-80">Conditions d'Utilisation</button> du système DMK. Mes données personnelles seront traitées de manière sécurisée et confidentielle pour la gestion interne de l'organisation. *
                </label>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                >
                  <FileCheck size={14} className="mr-1.5" />
                  Consulter les Conditions & Politique de Confidentialité
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !acceptedTerms}
                className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-4 rounded-2xl font-extrabold flex items-center justify-center hover:shadow-xl hover:shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <>
                    Envoyer ma demande d'inscription
                    <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MODAL POLITIQUE DE CONFIDENTIALITÉ ET CONDITIONS */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 md:p-8 border border-border shadow-2xl relative">
            <button
              onClick={() => setShowTermsModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground">Politique & Conditions DMK</h3>
                <p className="text-xs text-muted-foreground font-medium">Système d'Information DMK • Engagement & Confidentialité</p>
              </div>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-muted-foreground pr-1 custom-scrollbar">
              <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                <h4 className="font-extrabold text-foreground mb-1 text-sm">1. Protection des données personnelles</h4>
                <p>
                  Les informations recueillies (nom, prénom, CNI, téléphone, adresse, engagements financiers) font l'objet d'un traitement sécurisé. Elles sont exclusivement destinées à la gestion interne des membres et des activités de l'organisation DMK.
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                <h4 className="font-extrabold text-foreground mb-1 text-sm">2. Confidentialité & Sécurité</h4>
                <p>
                  Vos informations ne seront en aucun cas transmises ni vendues à des tiers. Les mots de passe et données sensibles sont stockés selon les standards de sécurité actuels pour empêcher tout accès non autorisé.
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                <h4 className="font-extrabold text-foreground mb-1 text-sm">3. Processus de validation des comptes (48h)</h4>
                <p>
                  Toute nouvelle demande d'inscription est soumise avec le statut <strong>"En attente"</strong>. Le bureau administrateur étudie chaque dossier et procède à sa validation dans un délai maximum de <strong>48 heures</strong>.
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                <h4 className="font-extrabold text-foreground mb-1 text-sm">4. Engagements des membres</h4>
                <p>
                  En soumettant cette demande, le membre s'engage à fournir des informations exactes et à respecter le règlement intérieur et les valeurs morales de l'organisation DMK.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className="bg-primary text-primary-foreground text-xs font-extrabold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                J'accepte les conditions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
