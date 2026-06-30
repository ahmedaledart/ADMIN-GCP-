import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { NewsArticle } from '../types';
import { useAuthStore } from '../store/authStore';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function News() {
  const { adminUser } = useAuthStore();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsArticle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Partial<NewsArticle>>({
    title_ar: '', title_en: '', summary_ar: '', summary_en: '',
    content_ar: '', content_en: '', source: '', image_url: '', is_published: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (err) throw err;
      setNews(data || []);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب الأخبار');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      title_ar: '', title_en: '', summary_ar: '', summary_en: '',
      content_ar: '', content_en: '', source: '', image_url: '', is_published: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: NewsArticle) => {
    setEditingItem(item);
    setForm({ 
      title_ar: item.title_ar, title_en: item.title_en,
      summary_ar: item.summary_ar || '', summary_en: item.summary_en || '',
      content_ar: item.content_ar, content_en: item.content_en,
      source: item.source || '', image_url: item.image_url || '',
      is_published: item.is_published 
    });
    setIsModalOpen(true);
  };

  const checkPermission = () => {
    if (adminUser?.role !== 'super_admin' && !adminUser?.can_manage_news) {
      alert("ليس لديك صلاحية لتنفيذ هذه العملية");
      return false;
    }
    return true;
  };

  const saveNews = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkPermission()) return;

    if (!form.title_ar || !form.title_en || !form.content_ar || !form.content_en) {
       alert("العناوين والمحتويات مطلوبة باللغتين");
       return;
    }
    
    try {
      setSaving(true);
      
      const payload = {
        title_ar: form.title_ar,
        title_en: form.title_en,
        summary_ar: form.summary_ar || null,
        summary_en: form.summary_en || null,
        content_ar: form.content_ar,
        content_en: form.content_en,
        source: form.source || null,
        image_url: form.image_url || null,
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
        ...(form.is_published && (!editingItem || !editingItem.published_at) 
            ? { published_at: new Date().toISOString() } 
            : {})
      };

      if (editingItem) {
        const { error: err } = await supabase
          .from('news')
          .update(payload)
          .eq('id', editingItem.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('news')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (err) throw err;
      }
      
      setIsModalOpen(false);
      fetchNews();
      
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const deleteNews = async (id: string, title: string) => {
    if (!checkPermission()) return;
    
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }
    
    try {
      setLoading(true);
      const { error: err } = await supabase.from('news').delete().eq('id', id);
      if (err) throw err;
      setNews(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الحذف");
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  }

  const togglePublish = async (item: NewsArticle) => {
    if (!checkPermission()) return;
    try {
      const newStatus = !item.is_published;
      const { error: err } = await supabase
        .from('news')
        .update({ 
          is_published: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
        
      if (err) throw err;
      
      setNews(prev => prev.map(n => n.id === item.id ? { ...n, is_published: newStatus } : n));
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تغيير الحالة");
    }
  }

  if (loading && news.length === 0) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة الأخبار</h1>
        
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus size={18} />
          إضافة خبر
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-dark-bg text-slate-600 dark:text-slate-400 font-medium border-b dark:border-dark-border">
              <tr>
                <th className="px-4 py-4 w-1/3">العنوان (عربي)</th>
                <th className="px-4 py-4 w-1/4">العنوان (إنجليزي)</th>
                <th className="px-4 py-4 text-center">تاريخ النشر</th>
                <th className="px-4 py-4 text-center">الحالة</th>
                <th className="px-4 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-border dark:border-dark-border">
              {news.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 dark:bg-dark-bg/50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900 dark:text-white line-clamp-1">{item.title_ar}</div>
                    {item.summary_ar && <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">{item.summary_ar}</div>}
                  </td>
                  <td className="px-4 py-4" dir="ltr">
                    <div className="font-medium text-slate-900 dark:text-white line-clamp-1">{item.title_en}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-xs">
                    {new Date(item.created_at).toLocaleString('ar-SA')}
                  </td>
                  <td className="px-4 py-3 text-center">
                     <button
                        onClick={() => togglePublish(item)}
                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                          item.is_published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {item.is_published ? 'منشور' : 'مخفي'}
                      </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 relative">
                      <button onClick={() => openEditModal(item)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md">
                        <Edit2 size={18} />
                      </button>
                      <div className="flex flex-col gap-1 items-center">
                        <button 
                          onClick={() => deleteNews(item.id, item.title_ar)} 
                          className={`p-1.5 rounded-md transition ${deletingId === item.id ? 'bg-red-600 text-white shadow min-w-[70px] text-xs font-bold' : 'text-red-600 hover:bg-red-50'}`}
                        >
                          {deletingId === item.id ? 'تأكيد الحذف' : <Trash2 size={18} />}
                        </button>
                        {deletingId === item.id && (
                          <button onClick={() => setDeletingId(null)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300">إلغاء</button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {news.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">لا توجد أخبار مضافة حتى الآن</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-dark-border">
              <h2 className="text-xl font-bold">{editingItem ? 'تعديل الخبر' : 'خبر جديد'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400"><X size={24} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <form id="news-form" onSubmit={saveNews} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b dark:border-dark-border pb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العنوان بالعربي *</label>
                    <input 
                      required 
                      type="text" 
                      value={form.title_ar} 
                      onChange={e => setForm({...form, title_ar: e.target.value})} 
                      className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العنوان بالإنجليزي (Title EN) *</label>
                    <input 
                      required 
                      type="text" 
                      dir="ltr"
                      value={form.title_en} 
                      onChange={e => setForm({...form, title_en: e.target.value})} 
                      className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b dark:border-dark-border pb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملخص قصير عربي</label>
                    <textarea 
                      rows={2} 
                      value={form.summary_ar} 
                      onChange={e => setForm({...form, summary_ar: e.target.value})} 
                      className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملخص قصير إنجليزي (Summary EN)</label>
                    <textarea 
                      rows={2} 
                      dir="ltr"
                      value={form.summary_en} 
                      onChange={e => setForm({...form, summary_en: e.target.value})} 
                      className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b dark:border-dark-border pb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المحتوى العربي *</label>
                    <textarea 
                      required 
                      rows={8} 
                      value={form.content_ar} 
                      onChange={e => setForm({...form, content_ar: e.target.value})} 
                      className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white resize-y" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المحتوى الإنجليزي (Content EN) *</label>
                    <textarea 
                      required 
                      rows={8} 
                      dir="ltr"
                      value={form.content_en} 
                      onChange={e => setForm({...form, content_en: e.target.value})} 
                      className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white resize-y" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">صورة الغلاف (رابط URL)</label>
                    <input 
                      type="url" 
                      dir="ltr"
                      value={form.image_url || ''} 
                      onChange={e => setForm({...form, image_url: e.target.value})} 
                      className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المصدر (Source)</label>
                    <input 
                      type="text" 
                      dir="ltr"
                      value={form.source || ''} 
                      onChange={e => setForm({...form, source: e.target.value})} 
                      className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white" 
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is_published" 
                    checked={form.is_published} 
                    onChange={e => setForm({...form, is_published: e.target.checked})} 
                    className="w-5 h-5 rounded border-slate-300 dark:border-dark-border dark:border-dark-border text-primary-600 focus:ring-primary-500" 
                  />
                  <label htmlFor="is_published" className="text-sm font-medium text-slate-800 dark:text-slate-200">نشر الخبر فوراً وإظهاره للزوار</label>
                </div>
              </form>
            </div>
            <div className="p-4 border-t dark:border-dark-border flex justify-end gap-3 bg-slate-50 dark:bg-dark-bg rounded-b-xl">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 border dark:border-dark-border rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-dark-bg transition"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                form="news-form" 
                disabled={saving} 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>}
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
