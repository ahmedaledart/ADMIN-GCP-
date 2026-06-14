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
  Users
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useState, ReactNode } from 'react';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: ReactNode }) {
  const { adminUser, signOut } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'الأسعار', href: '/prices', icon: Tag, show: adminUser?.role === 'super_admin' || adminUser?.can_manage_prices },
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b p-4">
        <img 
          src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
          alt="Logo" 
          className="h-10 w-auto"
        />
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-500 hover:text-slate-700"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "bg-white w-full md:w-72 border-l flex-col transition-all duration-300 z-10",
        isMobileMenuOpen ? "flex fixed inset-0 top-[73px]" : "hidden md:flex sticky top-0 h-screen"
      )}>
        <div className="hidden md:flex h-24 items-center justify-center border-b px-4">
          <img 
            src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
            alt="Logo" 
            className="h-14 w-auto drop-shadow-sm"
          />
        </div>
        
        <div className="p-5 border-b">
          <p className="text-base font-bold text-slate-800">{adminUser?.full_name || adminUser?.email}</p>
          <p className="text-sm font-medium text-slate-500 mt-1">{adminUser?.role === 'super_admin' ? 'Super Admin' : adminUser?.role}</p>
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
                        ? "bg-primary-50 text-primary-700 shadow-sm border border-primary-100" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon size={22} className={isActive ? "text-primary-600" : "text-slate-500"} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-4 px-4 py-3 rounded-lg text-base font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={22} />
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
