import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AdminUser } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  adminUser: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  adminUser: null,
  isLoading: true,
  error: null,
  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        set({ session: null, adminUser: null, isLoading: false });
        return;
      }
      
      // We have a session, let's verify admin data
      const email = session.user.email;
      if (!email) throw new Error('No email found in session');
      
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .single();
        
      if (adminError || !adminData) {
        set({ 
          session: null, 
          adminUser: null, 
          isLoading: false, 
          error: 'ليس لديك صلاحية الدخول للوحة التحكم' 
        });
        await supabase.auth.signOut();
        return;
      }
      
      if (!adminData.is_active) {
         set({ 
          session: null, 
          adminUser: null, 
          isLoading: false, 
          error: 'تم تعطيل حسابك الإداري' 
        });
        await supabase.auth.signOut();
        return;
      }
      
      set({ session, adminUser: adminData, isLoading: false });
      
    } catch (err: any) {
      console.error('Auth check error:', err);
      set({ session: null, adminUser: null, isLoading: false, error: err.message || 'Authentication error' });
    }
  },
  
  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      set({ session: null, adminUser: null, isLoading: false, error: null });
    } catch (err) {
      console.error('Sign out error:', err);
      set({ isLoading: false });
    }
  }
}));

// Listener for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  // If signed out from another tab, handle it here
  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ session: null, adminUser: null, error: null });
  }
});
