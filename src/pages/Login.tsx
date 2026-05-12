import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Redirect to the page they tried to visit, or dashboard
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect.' 
        : 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-sans">
      {/* Background decoration - Premium Gradient Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-primary/30 to-blue-500/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-purple-500/20 to-primary/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-[420px] max-h-[95vh] overflow-y-auto custom-scrollbar p-10 bg-card/70 dark:bg-card/40 border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-600 rounded-[1.5rem] blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
            <img 
              src="/icon.png" 
              alt="DMK Logo" 
              className="w-full h-full object-cover rounded-[1.5rem] relative z-10 shadow-lg ring-1 ring-white/20 dark:ring-white/10 bg-white"
              onError={(e) => {
                // Fallback si l'image ne charge pas
                (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/2563eb/white?text=DMK';
              }}
            />
          </div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2">DMK</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Portail Administrateur</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm mb-6 border border-red-500/20 font-medium flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2.5"></div>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground/80 ml-1">Adresse Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <Mail size={18} strokeWidth={2.5} />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dmk.com"
                className="w-full pl-11 pr-4 py-3.5 bg-background/50 border border-border/50 rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50 hover:bg-background/80"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-bold text-foreground/80">Mot de Passe</label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <Lock size={18} strokeWidth={2.5} />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-background/50 border border-border/50 rounded-2xl text-foreground font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50 hover:bg-background/80"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-4 rounded-2xl font-extrabold flex items-center justify-center hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-70 mt-6 group"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                Se connecter
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">
            &copy; {new Date().getFullYear()} DMK • Accès Restreint
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
