import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Tag, 
  Newspaper, 
  BarChart2, 
  MessageSquare, 
  Eye, 
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Users,
  History,
  Sun,
  Moon
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useState, ReactNode } from 'react';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: ReactNode }) {
  const { adminUser, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'الأسعار', href: '/prices', icon: Tag, show: adminUser?.role === 'super_admin' || adminUser?.can_manage_prices },
    { name: 'أرشيف الأسعار', href: '/history', icon: History, show: adminUser?.role === 'super_admin' || adminUser?.can_manage_prices || adminUser?.can_view_reports },
    { name: 'الأخبار', href: '/news', icon: Newspaper, show: adminUser?.role === 'super_admin' || adminUser?.can_manage_news },
    { name: 'التحليلات', href: '/analysis', icon: BarChart2, show: adminUser?.role === 'super_admin' || adminUser?.can_manage_analysis },
    { name: 'الرسائل', href: '/messages', icon: MessageSquare, show: adminUser?.role === 'super_admin' || adminUser?.can_manage_messages },
    { name: 'الزيارات', href: '/visits', icon: Eye, show: adminUser?.role === 'super_admin' || adminUser?.can_view_visits },
    { name: 'الإعدادات', href: '/settings', icon: SettingsIcon, show: adminUser?.role === 'super_admin' || adminUser?.can_manage_settings },
    { name: 'إدارة الأدمن', href: '/admins', icon: Users, show: adminUser?.role === 'super_admin' || adminUser?.can_manage_admins },
  ];

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-dark-card border-b dark:border-dark-border dark:border-dark-border p-4 transition-colors duration-200">
        <img 
          src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
          alt="Logo" 
          className="h-10 w-auto"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-300"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "bg-white dark:bg-dark-card w-full md:w-72 border-l dark:border-dark-border dark:border-dark-border flex-col transition-all duration-300 z-10",
        isMobileMenuOpen ? "flex fixed inset-0 top-[73px]" : "hidden md:flex sticky top-0 h-screen"
      )}>
        <div className="hidden md:flex h-24 items-center justify-center border-b dark:border-dark-border dark:border-dark-border px-4 relative">
          <img 
            src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
            alt="Logo" 
            className="h-14 w-auto drop-shadow-sm"
          />
          <button
            onClick={toggleTheme}
            className="absolute left-4 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={theme === 'dark' ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <div className="p-5 border-b dark:border-dark-border dark:border-dark-border">
          <p className="text-base font-bold text-slate-800 dark:text-slate-200 dark:text-white">{adminUser?.full_name || adminUser?.email}</p>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{adminUser?.role === 'super_admin' ? 'Super Admin' : adminUser?.role}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-2 px-4">
            {navigation.filter(item => item.show).map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded-lg text-base font-bold transition-all duration-200",
                      isActive 
                        ? "bg-primary-50 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 shadow-sm border dark:border-dark-border border-primary-100 dark:border-primary-800/50" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-white dark:hover:text-white"
                    )}
                  >
                    <item.icon size={22} className={isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400"} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t dark:border-dark-border dark:border-dark-border">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-4 px-4 py-3 rounded-lg text-base font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut size={22} />
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-8 text-slate-900 dark:text-white">
        {children}
      </main>
    </div>
  );
}
