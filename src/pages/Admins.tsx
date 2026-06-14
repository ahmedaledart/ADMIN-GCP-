import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminUser, AdminRole } from '../types';
import { useAuthStore } from '../store/authStore';
import { Plus, Edit2, ShieldAlert, Check, X, ShieldCheck } from 'lucide-react';

export default function Admins() {
  const { adminUser: currentUser } = useAuthStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<Partial<AdminUser>>({
    email: '', full_name: '', role: 'Admin', is_active: true,
    can_manage_admins: false, can_manage_prices: false, can_import_prices: false,
    can_manage_news: false, can_manage_analysis: false, can_manage_messages: false,
    can_view_visits: false, can_manage_settings: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (err) throw err;
      setAdmins(data || []);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب بيانات الأدمن');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      email: '', full_name: '', role: 'Admin', is_active: true,
      can_manage_admins: false, can_manage_prices: false, can_import_prices: false,
      can_manage_news: false, can_manage_analysis: false, can_manage_messages: false,
      can_view_visits: false, can_manage_settings: false
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: AdminUser) => {
    setEditingItem(item);
    setForm({ ...item });
    setIsModalOpen(true);
  };

  const saveAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.email) return;

    if (currentUser?.role !== 'super_admin' && !currentUser?.can_manage_admins) {
      alert("ليس لديك صلاحية لتنفيذ هذه العملية");
      return;
    }
    
    try {
      setSaving(true);
      const payload = {
        email: form.email,
        full_name: form.full_name || null,
        role: form.role as AdminRole,
        is_active: form.is_active,
        can_manage_admins: form.can_manage_admins,
        can_manage_prices: form.can_manage_prices,
        can_import_prices: form.can_import_prices,
        can_manage_news: form.can_manage_news,
        can_manage_analysis: form.can_manage_analysis,
        can_manage_messages: form.can_manage_messages,
        can_view_visits: form.can_view_visits,
        can_manage_settings: form.can_manage_settings,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        if (editingItem.role === 'super_admin' && currentUser?.id !== editingItem.id) {
          alert("لا يمكنك تعديل بيانات سوبر أدمن آخر");
          return;
        }
        
        const { error: err } = await supabase
          .from('admin_users')
          .update(payload)
          .eq('email', editingItem.email); // using email or id
        if (err) throw err;
      } else {
        // Find if email exists
        const { data: existing } = await supabase.from('admin_users').select('id').eq('email', payload.email).single();
        if (existing) {
           const { error: err } = await supabase.from('admin_users').update(payload).eq('email', payload.email);
           if (err) throw err;
        } else {
           const { error: err } = await supabase.from('admin_users').insert([{ ...payload, created_at: new Date().toISOString() }]);
           if (err) throw err;
        }
        alert("تمت إضافة/تحديث الأدمن في قائمة الصلاحيات. يجب إنشاء حساب له بنفس البريد من Supabase Authentication أو إرسال دعوة تسجيل دخول له.");
      }
      
      setIsModalOpen(false);
      fetchAdmins();
      
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: AdminUser) => {
    if (currentUser?.role !== 'super_admin' && !currentUser?.can_manage_admins) {
      alert("ليس لديك صلاحية لتنفيذ هذه العملية");
      return;
    }
    if (item.id === currentUser?.id) {
      alert("لا يمكنك تعطيل حسابك الخاص");
      return;
    }
    if (item.role === 'super_admin') {
      alert("لا يمكن تعطيل سوبر أدمن");
      return;
    }
    
    try {
      const { error: err } = await supabase
        .from('admin_users')
        .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
        .eq('email', item.email);
        
      if (err) throw err;
      setAdmins(prev => prev.map(a => a.email === item.email ? { ...a, is_active: !a.is_active } : a));
    } catch (err) {
      alert("حدث خطأ");
    }
  }

  if (loading && admins.length === 0) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">إدارة مدراء النظام</h1>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} />
          إضافة أدمن
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3">
        <ShieldAlert className="mt-0.5 shrink-0" size={20} />
        <div>
          <p className="font-semibold text-sm mb-1">ملاحظة هامة حول إضافة الأدمن</p>
          <p className="text-xs">
            إضافة أدمن جديد هنا تمنحه الصلاحيات فقط. لكي يتمكن من الدخول للوحة التحكم، يجب التأكد من إنشاء حسابه بنفس البريد الإلكتروني في Supabase Authentication.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b">
              <tr>
                <th className="px-4 py-3">البريد الإلكتروني</th>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3 text-center">الدور</th>
                <th className="px-4 py-3 text-center">الحالة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map(item => (
                <tr key={item.email} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-slate-600" dir="ltr">{item.email}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.full_name || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.role === 'super_admin' ? 'Super Admin' : item.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                        item.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {item.is_active ? 'نشط' : 'معطل'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center">
                    <button 
                      onClick={() => openEditModal(item)} 
                      className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
                      title="تعديل"
                    >
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck size={24} className="text-primary-600" />
                {editingItem ? 'تعديل الصلاحيات' : 'إضافة أدمن جديد'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <form id="admin-form" onSubmit={saveAdmin} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني *</label>
                    <input 
                      type="email" 
                      dir="ltr"
                      required 
                      disabled={!!editingItem} // Cannot change email if editing
                      value={form.email || ''} 
                      onChange={e => setForm({...form, email: e.target.value})} 
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-slate-100 disabled:text-slate-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                    <input 
                      type="text" 
                      value={form.full_name || ''} 
                      onChange={e => setForm({...form, full_name: e.target.value})} 
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الدور (Role)</label>
                    <select
                      value={form.role}
                      onChange={e => setForm({...form, role: e.target.value as AdminRole})}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                      disabled={editingItem?.role === 'super_admin'}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Viewer">Viewer</option>
                      {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-7">
                    <input 
                      type="checkbox" 
                      id="is_active" 
                      checked={form.is_active} 
                      onChange={e => setForm({...form, is_active: e.target.checked})} 
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      disabled={editingItem?.role === 'super_admin' || editingItem?.email === currentUser?.email}
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-slate-700">تفعيل الحساب</label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-800 mb-4">الصلاحيات التفصيلية</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 bg-slate-50 p-4 rounded-lg border">
                    {[
                      { key: 'can_manage_admins', label: 'إدارة الأدمن' },
                      { key: 'can_manage_prices', label: 'إدارة الأسعار' },
                      { key: 'can_import_prices', label: 'استيراد الأسعار (CSV)' },
                      { key: 'can_manage_news', label: 'إدارة الأخبار' },
                      { key: 'can_manage_analysis', label: 'إدارة التحليلات' },
                      { key: 'can_manage_messages', label: 'إدارة الرسائل' },
                      { key: 'can_view_visits', label: 'الاطلاع على الزيارات' },
                      { key: 'can_manage_settings', label: 'إدارة الإعدادات' },
                    ].map(perm => (
                      <div key={perm.key} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={perm.key} 
                          checked={(form as any)[perm.key]} 
                          onChange={e => setForm({...form, [perm.key]: e.target.checked})} 
                          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" 
                          disabled={form.role === 'super_admin'}
                        />
                        <label htmlFor={perm.key} className="text-sm text-slate-700 cursor-pointer">
                          {perm.label} 
                          {form.role === 'super_admin' && <span className="text-xs text-slate-400 mr-2">(مفعل تلقائياً)</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 border rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                form="admin-form" 
                disabled={saving} 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>}
                حفظ البيانات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
