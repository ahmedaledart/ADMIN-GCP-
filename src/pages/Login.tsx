import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { checkAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      await checkAuth(); // this will evaluate admin_users and populate authStore
      
      // If checkAuth finds error, it sets it in store. We will look at store in a moment.
      // But for now, just navigate to dashboard and let protected route handle it.
      navigate('/dashboard');
      
    } catch (err: any) {
      setErrorMsg(err.message === 'Invalid login credentials' ? 'بيانات الدخول غير صحيحة' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <img 
          src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
          alt="LTN Logo" 
          className="h-20 w-auto mb-4"
        />
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          لوحة تحكم المنصة
        </h2>
        <p className="mt-2 text-center text-base text-slate-600 dark:text-slate-400">
          تسجيل الدخول للإدارة الموحدة
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-dark-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border dark:border-dark-border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border dark:border-dark-border border-red-100">
                {errorMsg}
              </div>
            )}
            
            {useAuthStore.getState().error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border dark:border-dark-border border-red-100">
                {useAuthStore.getState().error}
              </div>
            )}

            <div>
              <label className="block text-base font-medium text-slate-700 dark:text-slate-300">البريد الإلكتروني</label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-slate-300 dark:border-dark-border dark:border-dark-border pr-10 pl-3 py-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base border dark:border-dark-border outline-none dark:bg-dark-card dark:text-white"
                  placeholder="admin@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-medium text-slate-700 dark:text-slate-300">كلمة المرور</label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-slate-300 dark:border-dark-border dark:border-dark-border pr-10 pl-3 py-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base border dark:border-dark-border outline-none dark:bg-dark-card dark:text-white"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-3 px-4 text-base font-bold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-slate-400 disabled:dark:bg-slate-600 transition-colors"
              >
                {loading ? 'جاري التحقق...' : 'دخول'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
