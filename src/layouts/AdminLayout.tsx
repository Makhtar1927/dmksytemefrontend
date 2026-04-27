import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Moon, 
  Sun,
  Menu,
  LogOut,
  ChevronLeft,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminLayout = () => {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const navigation = [
    { name: 'Vue d\'ensemble', href: '/', icon: LayoutDashboard },
    { name: 'Membres', href: '/membres', icon: Users },
    { name: 'Planificateur', href: '/planificateur', icon: Calendar },
    { name: 'Communication', href: '/communication', icon: MessageSquare },
    { name: 'Journal d\'Activité', href: '/journal', icon: Activity },
    { name: 'Paramètres', href: '/parametres', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Obtenir le titre de la page courante pour le header
  const getPageTitle = () => {
    const currentNavItem = navigation.find(item => {
      if (item.href === '/' && location.pathname === '/') return true;
      if (item.href !== '/' && location.pathname.startsWith(item.href)) return true;
      return false;
    });
    return currentNavItem ? currentNavItem.name : 'Tableau de bord';
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      
      {/* 
        ========================================
        SIDEBAR PREMIUM (GLASSMORPHISM & GRADIENTS)
        ========================================
      */}
      <aside 
        className={`${
          sidebarOpen ? 'w-72' : 'w-24'
        } transition-all duration-500 ease-in-out relative z-30 flex flex-col m-4 rounded-3xl border border-black/5 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden`}
      >
        {/* Animated Background Gradients inside Sidebar */}
        <div className="absolute top-0 left-0 w-full h-full bg-white/80 dark:bg-card/40 backdrop-blur-3xl -z-10"></div>
        <div className="absolute top-0 -left-1/2 w-full h-1/2 bg-primary/10 blur-[100px] rounded-full -z-10"></div>
        <div className="absolute bottom-0 -right-1/2 w-full h-1/2 bg-blue-500/10 blur-[100px] rounded-full -z-10"></div>

        {/* Logo Area (Fixed at top) */}
        <div className="h-24 flex-shrink-0 flex items-center justify-between px-6">
            <div className={`flex items-center transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg mr-3">
                <ShieldCheck size={22} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 tracking-tight leading-tight">
                  DMK Admin
                </span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Workspace</span>
              </div>
            </div>
            
            {!sidebarOpen && (
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg">
                <ShieldCheck size={24} strokeWidth={2.5} />
              </div>
            )}
          </div>
          
          {/* Navigation Links (Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <nav className="px-4 py-2 space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group relative flex items-center p-3.5 rounded-2xl transition-all duration-300 overflow-hidden ${
                      isActive 
                        ? 'text-primary font-bold shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground font-medium'
                    } ${!sidebarOpen && 'justify-center'}`
                  }
                  title={!sidebarOpen ? item.name : ''}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active State Background Indicator */}
                      {isActive && (
                        <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 -z-10"></div>
                      )}
                      
                      {/* Active Left Bar */}
                      {isActive && sidebarOpen && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full"></div>
                      )}

                      {/* Icon */}
                      <Icon 
                        size={22} 
                        className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${sidebarOpen ? 'mr-4 ml-1' : ''}`} 
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      
                      {/* Text */}
                      {sidebarOpen && (
                        <span className="tracking-wide">{item.name}</span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
            </nav>
          </div>

        {/* User & Logout Section (Fixed at bottom) */}
        <div className="px-4 py-4 flex-shrink-0">
          <div className={`rounded-2xl transition-all duration-300 ${sidebarOpen ? 'p-4 bg-background/50 border border-black/5 dark:border-white/5 mb-2' : ''}`}>
            {sidebarOpen && (
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm uppercase relative">
                  {user?.email?.charAt(0) || 'A'}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
                </div>
                <div className="flex flex-col ml-3 overflow-hidden">
                  <span className="text-sm font-bold text-foreground truncate">Super Admin</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email || 'admin@dmk.com'}</span>
                </div>
              </div>
            )}
            
            <button 
              onClick={handleSignOut}
              className={`flex items-center w-full rounded-2xl text-red-500/80 font-bold hover:bg-red-500 hover:text-white dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all duration-300 group ${sidebarOpen ? 'p-3' : 'p-3.5 justify-center'}`}
              title={!sidebarOpen ? "Déconnexion" : ""}
            >
              <LogOut size={22} className={`${sidebarOpen ? 'mr-4 ml-1' : ''} group-hover:scale-110 transition-transform`} strokeWidth={2} />
              {sidebarOpen && <span className="tracking-wide">Déconnexion</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* 
        ========================================
        MAIN CONTENT AREA & HEADER
        ========================================
      */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Toggle Sidebar Button (Floating between sidebar and main content) */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-10 left-2 z-40 p-1.5 rounded-full bg-card border border-border shadow-md hover:scale-110 transition-transform text-muted-foreground"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
        </button>

        {/* Header Premium Glassmorphism */}
        <header className="h-24 flex items-center justify-between px-10 pt-4 z-20">
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{getPageTitle()}</h1>
            <p className="text-sm font-medium text-muted-foreground">{format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
          </div>
          
          <div className="flex items-center space-x-5">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-3 rounded-full bg-card border border-white/20 dark:border-white/10 shadow-sm hover:shadow-md transition-all text-muted-foreground hover:text-foreground"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto px-10 pb-10 pt-2 relative z-10 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
