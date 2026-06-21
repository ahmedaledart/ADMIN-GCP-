import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { PlatformSettings } from '../types';
import { useAuthStore } from '../store/authStore';
import { Save, Settings2, ShieldAlert, Package, CheckSquare } from 'lucide-react';
import CommodityCatalogTab from './settings/CommodityCatalogTab';
import UnitsCatalogTab from './settings/UnitsCatalogTab';

export default function Settings() {
  const { adminUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'commodities' | 'units'>('general');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .single();
        
      if (err) throw err;
      setSettings(data);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    if (adminUser?.role !== 'super_admin' && !adminUser?.can_manage_settings) {
      alert("ليس لديك صلاحية لتنفيذ هذه العملية");
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const { error: err } = await supabase
        .from('platform_settings')
        .update({
          site_name: settings.site_name,
          logo_url: settings.logo_url,
          favicon_url: settings.favicon_url,
          announcement: settings.announcement,
          contact_email: settings.contact_email,
          contact_phone: settings.contact_phone,
          maintenance_mode: settings.maintenance_mode,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);
        
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const showAdvancedTabs = adminUser?.role === 'super_admin' || adminUser?.can_manage_settings || adminUser?.can_manage_prices;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
          <Settings2 size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">الإعدادات</h1>
      </div>

      <div className="flex gap-2 border-b">
        <button 
          onClick={() => setActiveTab('general')}
          className={`pb-3 px-1 border-b-2 font-medium text-sm transition ${
            activeTab === 'general' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          إعدادات المنصة
        </button>
        {showAdvancedTabs && (
          <>
            <button 
              onClick={() => setActiveTab('commodities')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 transition ${
                activeTab === 'commodities' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package size={16} />
              إدارة السلع
            </button>
            <button 
              onClick={() => setActiveTab('units')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 transition ${
                activeTab === 'units' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <CheckSquare size={16} />
              إدارة الوحدات
            </button>
          </>
        )}
      </div>

      <div className="pt-2">
        {activeTab === 'general' && (
          <>
            {loading && !settings ? (
              <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
            ) : !settings ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">لم يتم العثور على الإعدادات</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-8">
                {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>}
                {success && <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100">تم حفظ الإعدادات بنجاح</div>}

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 border-b bg-slate-50">
                    <h2 className="font-semibold text-slate-800">المعلومات الأساسية</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">اسم المنصة</label>
                      <input 
                        type="text" 
                        required
                        value={settings.site_name || ''} 
                        onChange={e => setSettings({...settings, site_name: e.target.value})}
                        className="w-full max-w-md border rounded-lg px-3 py-2 focus:ring-primary-500 focus:border-primary-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">رابط الشعار (Logo URL)</label>
                      <input 
                        type="url" 
                        dir="ltr"
                        value={settings.logo_url || ''} 
                        onChange={e => setSettings({...settings, logo_url: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">رابط الأيقونة (Favicon URL)</label>
                      <input 
                        type="url" 
                        dir="ltr"
                        value={settings.favicon_url || ''} 
                        onChange={e => setSettings({...settings, favicon_url: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 border-b bg-slate-50">
                    <h2 className="font-semibold text-slate-800">بيانات التواصل والتنبيهات</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني للتواصل</label>
                        <input 
                          type="email" 
                          dir="ltr"
                          value={settings.contact_email || ''} 
                          onChange={e => setSettings({...settings, contact_email: e.target.value})}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                        <input 
                          type="tel" 
                          dir="ltr"
                          value={settings.contact_phone || ''} 
                          onChange={e => setSettings({...settings, contact_phone: e.target.value})}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">الشريط الإعلاني (Announcement)</label>
                      <textarea 
                        rows={2}
                        value={settings.announcement || ''} 
                        onChange={e => setSettings({...settings, announcement: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none resize-y" 
                        placeholder="اتركه فارغاً لإخفاء الشريط"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl border border-red-200 overflow-hidden">
                  <div className="p-4 border-b border-red-200 flex items-center gap-2 text-red-700">
                    <ShieldAlert size={18} />
                    <h2 className="font-semibold">منطقة الخطر</h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="maintenance_mode"
                        checked={settings.maintenance_mode || false} 
                        onChange={e => setSettings({...settings, maintenance_mode: e.target.checked})}
                        className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500 cursor-pointer" 
                      />
                      <div>
                        <label htmlFor="maintenance_mode" className="block text-base font-medium text-red-800 cursor-pointer">
                          تفعيل وضع الصيانة
                        </label>
                        <p className="text-sm text-red-600 mt-1">عند التفعيل، لن يتمكن زوار المنصة من تصفح الموقع بالكامل.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pb-8">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    ) : (
                      <Save size={20} />
                    )}
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {showAdvancedTabs && activeTab === 'commodities' && <CommodityCatalogTab />}
        {showAdvancedTabs && activeTab === 'units' && <UnitsCatalogTab />}
      </div>
    </div>
  );
}
