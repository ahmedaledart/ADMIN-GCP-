import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Commodity, CommodityCatalog, UnitsCatalog, SectorCatalog } from '../types';
import { useAuthStore } from '../store/authStore';
import { Search, Edit2, Check, X, Filter, Plus, Upload, AlertCircle, FileText, Trash2, Package, CheckSquare } from 'lucide-react';
import Papa from 'papaparse';

export default function Prices() {
  const { adminUser } = useAuthStore();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [catalogCommodities, setCatalogCommodities] = useState<CommodityCatalog[]>([]);
  const [catalogSectors, setCatalogSectors] = useState<SectorCatalog[]>([]);
  const [catalogUnits, setCatalogUnits] = useState<UnitsCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isQuickAddCommodityOpen, setIsQuickAddCommodityOpen] = useState(false);
  const [quickCommodityForm, setQuickCommodityForm] = useState({ symbol: '', name_ar: '', name_en: '', sector: '', default_unit: '' });
  
  const [isQuickAddUnitOpen, setIsQuickAddUnitOpen] = useState(false);
  const [quickUnitForm, setQuickUnitForm] = useState({ unit_code: '', unit_ar: '', unit_en: '' });
  
  const [savingQuick, setSavingQuick] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  
  // Edit & Add State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Commodity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Commodity>>({
    symbol: '', name_ar: '', name_en: '', sector: 'energy', price: 0, unit: '', source: '', status: 'active', is_visible: true
  });
  const [saving, setSaving] = useState(false);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{added: number, updated: number, failed: number, warnings: string[]} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [commsRes, catCommsRes, catUnitsRes, catSectorsRes] = await Promise.all([
        supabase.from('commodities').select('*').order('sector').order('symbol').limit(50),
        supabase.from('commodity_catalog').select('*').eq('is_active', true),
        supabase.from('units_catalog').select('*').eq('is_active', true),
        supabase.from('sectors_catalog').select('*').eq('is_active', true).order('sort_order', { ascending: true })
      ]);
        
      if (commsRes.error) throw commsRes.error;
      
      setCommodities(commsRes.data || []);
      setCatalogCommodities(catCommsRes.data || []);
      setCatalogUnits(catUnitsRes.data || []);
      setCatalogSectors(catSectorsRes.data || []);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب بيانات الأسعار');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      symbol: '', name_ar: '', name_en: '', sector: 'energy', price: 0, unit: '', source: '', status: 'active', is_visible: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Commodity) => {
    setEditingItem(item);
    setForm({ ...item });
    setIsModalOpen(true);
  };

  const deleteCommodity = async (id: string) => {
    if (!adminUser?.can_manage_prices && adminUser?.role !== 'super_admin') {
      alert("ليس لديك صلاحية لحذف الأسعار");
      return;
    }

    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }

    try {
      const { error: err } = await supabase.from('commodities').delete().eq('id', id);
      if (err) throw err;
      setCommodities(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحذف');
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickSaveCommodity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCommodityForm.symbol || !quickCommodityForm.name_ar || !quickCommodityForm.name_en || !quickCommodityForm.sector) return;
    setSavingQuick(true);
    const sym = quickCommodityForm.symbol.trim().toUpperCase();
    const { data: existing } = await supabase.from('commodity_catalog').select('id').eq('symbol', sym).single();
    if (existing) {
      setSavingQuick(false);
      if (!window.confirm('هذه السلعة موجودة مسبقًا، هل تريد تحديث بياناتها واستخدامها؟')) {
        return;
      }
      setSavingQuick(true);
    }
    const payload = {
      symbol: sym,
      name_ar: quickCommodityForm.name_ar,
      name_en: quickCommodityForm.name_en,
      sector: quickCommodityForm.sector.trim().toLowerCase(),
      default_unit: quickCommodityForm.default_unit,
      is_active: true,
      updated_at: new Date().toISOString()
    };
    const { data, error: err } = await supabase.from('commodity_catalog').upsert(payload, { onConflict: 'symbol' }).select().single();
    if (err) {
      console.error(err);
      if (err.code === '23505') {
        alert('السلعة موجودة مسبقًا، يمكنك تعديلها من القائمة.');
      } else {
        alert('خطأ أثناء الحفظ');
      }
    } else if (data) {
      // update list to include or update
      const existingIdx = catalogCommodities.findIndex(c => c.symbol === sym);
      if (existingIdx !== -1) {
         const newCatalog = [...catalogCommodities];
         newCatalog[existingIdx] = data;
         setCatalogCommodities(newCatalog);
      } else {
         setCatalogCommodities([...catalogCommodities, data]);
      }
      setForm({...form, symbol: sym, name_ar: payload.name_ar, name_en: payload.name_en, sector: payload.sector, unit: payload.default_unit});
      setIsQuickAddCommodityOpen(false);
      setQuickCommodityForm({ symbol: '', name_ar: '', name_en: '', sector: '', default_unit: '' });
      alert('تم حفظ السلعة بنجاح');
    }
    setSavingQuick(false);
  };

  const handleQuickSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUnitForm.unit_code) return;
    setSavingQuick(true);
    const { data: existing } = await supabase.from('units_catalog').select('id').eq('unit_code', quickUnitForm.unit_code).single();
    if (existing) {
      alert('هذه الوحدة موجودة مسبقاً');
      setSavingQuick(false);
      return;
    }
    const payload = {
      ...quickUnitForm,
      is_active: true,
      updated_at: new Date().toISOString()
    };
    const { data, error: err } = await supabase.from('units_catalog').insert([{ ...payload, created_at: new Date().toISOString() }]).select().single();
    if (err) {
      console.error(err);
      alert('خطأ أثناء حفظ الوحدة');
    } else if (data) {
      setCatalogUnits([...catalogUnits, data]);
      setForm({...form, unit: payload.unit_code});
      setIsQuickAddUnitOpen(false);
      setQuickUnitForm({ unit_code: '', unit_ar: '', unit_en: '' });
    }
    setSavingQuick(false);
  };

  const handleSaveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminUser?.can_manage_prices && adminUser?.role !== 'super_admin') {
      alert("ليس لديك صلاحية لتعديل/إضافة الأسعار");
      return;
    }

    if (!form.price || form.price <= 0) {
       alert("السعر غير صالح");
       return;
    }
    
    try {
      setSaving(true);
        const symbol = form.symbol?.trim().toUpperCase();

        if (editingItem) {
          // Edit mode
          const newPrice = Number(form.price);
          const oldPrice = editingItem.price;
          
          let previous_price = oldPrice;
          let change_value = null;
          let change_percent = null;
          let trend: 'up' | 'down' | 'neutral' = 'neutral';
          
          if (newPrice !== oldPrice) {
            change_value = newPrice - oldPrice;
            change_percent = oldPrice ? (change_value / oldPrice) * 100 : 0;
            trend = newPrice > oldPrice ? 'up' : 'down';
          } else {
            previous_price = editingItem.previous_price || previous_price;
            change_value = editingItem.change_value;
            change_percent = editingItem.change_percent;
            trend = editingItem.trend;
          }
          
          const updateData = {
            name_ar: form.name_ar,
            name_en: form.name_en,
            sector: form.sector,
            price: newPrice,
            unit: form.unit || null,
            source: form.source || null,
            previous_price,
            change_value,
            change_percent,
            trend,
            status: form.status,
            is_visible: form.is_visible,
            last_update_method: 'admin',
            updated_by: adminUser?.email || null,
            updated_at: new Date().toISOString()
          };
          
          const { error: err } = await supabase
            .from('commodities')
            .update(updateData)
            .eq('id', editingItem.id);
            
          if (err) throw err;
          
          fetchData();
          alert('تم حفظ السعر بنجاح');
        } else {
          // Add mode
          const { data: existing, error: checkError } = await supabase
            .from('commodities')
            .select('symbol, price')
            .eq('symbol', symbol)
            .maybeSingle();

          if (checkError) {
             console.error('Check Error:', checkError);
             alert(`خطأ في التحقق من السلعة: ${checkError.message}`);
             setSaving(false);
             return;
          }

          if (existing) {
            const oldPrice = Number(existing.price || 0);
            const newPrice = Number(form.price);
            const changeValue = newPrice - oldPrice;
            const changePercent = oldPrice !== 0 ? Number(((changeValue / oldPrice) * 100).toFixed(2)) : 0;
            const trend = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'neutral';

            const { error: err } = await supabase
              .from('commodities')
              .update({
                previous_price: oldPrice,
                price: newPrice,
                change_value: changeValue,
                change_percent: changePercent,
                trend,
                unit: form.unit || null,
                source: form.source || null,
                status: form.status,
                is_visible: form.is_visible,
                last_update_method: 'admin',
                updated_by: adminUser?.email || null,
                updated_at: new Date().toISOString()
              })
              .eq('symbol', symbol);
              
            if (err) {
              console.error(err);
              alert(err.message);
              setSaving(false);
              return;
            } else {
              alert('تم حفظ السعر بنجاح');
            }
          } else {
            const newPrice = Number(form.price);

            const { error: err } = await supabase.from('commodities').insert({
              symbol,
              name_ar: form.name_ar,
              name_en: form.name_en,
              sector: form.sector,
              price: newPrice,
              previous_price: newPrice,
              change_value: 0,
              change_percent: 0,
              trend: 'neutral',
              unit: form.unit || null,
              source: form.source || null,
              status: form.status,
              is_visible: form.is_visible,
              last_update_method: 'admin',
              updated_by: adminUser?.email || null,
              updated_at: new Date().toISOString()
            });

            if (err) {
              console.error(err);
              alert(err.message);
              setSaving(false);
              return;
            } else {
              alert('تم حفظ السعر بنجاح');
            }
          }
          
          fetchData();
        }

        setIsModalOpen(false);
      setForm({
        symbol: '', name_ar: '', name_en: '', sector: 'energy', price: 0, unit: '', source: '', status: 'active', is_visible: true
      });

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // CSV Import Logic
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data
          .map((row: any) => {
            const rowData: any = {};
            Object.keys(row).forEach(key => {
               const val = typeof row[key] === 'string' ? row[key].trim() : row[key];
               const cleanKey = key.toLowerCase().trim();
               rowData[cleanKey] = val;
            });
            return rowData;
          })
          .filter((row: any) => {
            if (!row.symbol) return false;
            const p = Number(row.price);
            if (isNaN(p) || row.price === undefined || row.price === null || row.price === '') return false;
            return true;
          })
          .map((row: any) => ({
             symbol: row.symbol.toUpperCase(),
             name_ar: row.name_ar || '',
             name_en: row.name_en || '',
             sector: (row.sector || '').toLowerCase(),
             price: Number(row.price),
             unit: row.unit || '',
             source: row.source || 'Manual CSV'
          }));
          
        const uniqueMap = new Map();
        data.forEach((r: any) => uniqueMap.set(r.symbol, r));
        const finalData = Array.from(uniqueMap.values());

        if (finalData.length === 0) {
           alert("لم يتم العثور على بيانات صالحة. تأكد من وجود الأعمدة المطلوبة بشكل صحيح واستبعاد الحقول الفارغة أو غير الرقمية للسعر.");
        }
        setImportData(finalData);
        setImportResult(null);
      },
      error: (error) => {
        alert("خطأ في قراءة الملف: " + error.message);
      }
    });
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const applyImport = async () => {
    if (!adminUser?.can_import_prices && adminUser?.role !== 'super_admin') {
      alert("ليس لديك صلاحية لاستيراد الأسعار");
      return;
    }

    if (importData.length === 0) return;

    setImporting(true);
    let addedCount = 0;
    let updatedCount = 0;
    const warnings: string[] = [];
    
    const importProcess = async () => {
      const now = new Date().toISOString();

      const { data: existingRecords, error: fetchErr } = await supabase
        .from('commodities')
        .select('*');

      if (fetchErr) throw fetchErr;

      const existingMap = new Map();
      existingRecords?.forEach(r => existingMap.set(r.symbol, r));

      const rowsToUpsert: any[] = [];
      const isSuperAdmin = adminUser?.role === 'super_admin';

      for (const row of importData) {
        const symbol = row.symbol;
        const price = row.price;
        
        let catalogCommodity = catalogCommodities.find(c => c.symbol === symbol);
        
        if (!catalogCommodity) {
          if (isSuperAdmin) {
            // Auto add
            const { data: newCatItem, error: newCatErr } = await supabase.from('commodity_catalog').insert([{
              symbol,
              name_ar: row.name_ar || symbol,
              name_en: row.name_en || symbol,
              sector: (row.sector || 'commodities').toLowerCase(),
              default_unit: row.unit || '',
              is_active: true,
              updated_at: now
            }]).select().single();
            if (newCatErr) {
               console.error("Failed to add to catalog", newCatErr);
            } else {
               catalogCommodity = newCatItem;
            }
          } else {
            warnings.push(`الرمز ${symbol} غير موجود في قائمة السلع. تم تجاهله.`);
            continue; // Skip
          }
        }
        
        let unit = row.unit || (catalogCommodity ? catalogCommodity.default_unit : null);
        
        // Handle Unit Catalog warning
        if (unit) {
           const unitExists = catalogUnits.find(u => u.unit_code === unit || u.unit_ar === unit || u.unit_en === unit);
           if (!unitExists) {
             if (isSuperAdmin) {
               await supabase.from('units_catalog').insert([{
                 unit_code: unit,
                 unit_ar: unit,
                 unit_en: unit,
                 is_active: true,
                 updated_at: now
               }]);
               // don't really need to fetch it back, just proceed
             } else {
               warnings.push(`الوحدة ${unit} غير موجودة في المرجع.`);
             }
           }
        }

        const existing = existingMap.get(symbol);
        
        // Default from catalog
        // Handle Sector validation
        let sectorCode = catalogCommodity?.sector || row.sector || existing?.sector || 'commodities';
        sectorCode = sectorCode.toLowerCase().replace(/\s+/g, '');

        let sectorExists = catalogSectors.find(s => s.sector_code === sectorCode);
        
        if (!sectorExists) {
          if (isSuperAdmin) {
            // Auto add sector
            await supabase.from('sectors_catalog').insert([{
              sector_code: sectorCode,
              name_ar: sectorCode,
              name_en: sectorCode,
              is_active: true,
              sort_order: catalogSectors.length * 10,
              created_at: now,
              updated_at: now
            }]);
            const newSector = { sector_code: sectorCode, name_ar: sectorCode, name_en: sectorCode, is_active: true, sort_order: catalogSectors.length * 10 } as any;
            catalogSectors.push(newSector);
          } else {
            warnings.push(`نوع السلعة غير موجود في قائمة الأنواع (${sectorCode}) للرمز ${symbol}. تم التخطي.`);
            continue; // Skip
          }
        } else if (!sectorExists.is_active) {
          if (!isSuperAdmin) {
            warnings.push(`نوع السلعة (${sectorCode}) غير مفعل للرمز ${symbol}. تم التخطي.`);
            continue;
          }
        }

        const nameAr = catalogCommodity?.name_ar || row.name_ar || existing?.name_ar || symbol;
        const nameEn = catalogCommodity?.name_en || row.name_en || existing?.name_en || symbol;
        const sector = sectorCode;

        if (existing) {
           let previous_price = existing.price;
           let change_value = existing.change_value;
           let change_percent = existing.change_percent;
           let trend = existing.trend;

           if (existing.price !== price) {
             previous_price = existing.price;
             change_value = price - existing.price;
             change_percent = previous_price ? (change_value / previous_price) * 100 : 0;
             trend = price > previous_price ? 'up' : 'down';
           }
           
           const { id, created_at, ...restExisting } = existing;
           
           rowsToUpsert.push({
             ...restExisting,
             name_ar: nameAr,
             name_en: nameEn,
             sector,
             price,
             unit,
             previous_price,
             change_value,
             change_percent,
             trend,
             source: row.source || existing.source || 'Manual CSV',
             last_update_method: 'csv',
             updated_by: adminUser?.email || null,
             updated_at: now
           });
           updatedCount++;
        } else {
           rowsToUpsert.push({
             symbol,
             name_ar: nameAr,
             name_en: nameEn,
             sector,
             price,
             unit,
             source: row.source || 'Manual CSV',
             previous_price: price,
             change_value: 0,
             change_percent: 0,
             trend: 'neutral',
             status: 'active',
             is_visible: true,
             last_update_method: 'csv',
             updated_by: adminUser?.email || null,
             updated_at: now
           });
           addedCount++;
        }
      }

      if (rowsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from('commodities')
          .upsert(rowsToUpsert, { onConflict: 'symbol' });
          
        if (upsertErr) throw upsertErr;
      }
    };

    try {
      await Promise.race([
        importProcess(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('انتهى وقت الاتصال (Timeout)')), 5000))
      ]);

      setImportResult({ added: addedCount, updated: updatedCount, failed: importData.length - addedCount - updatedCount, warnings });
      setImportData([]);
      fetchData();

    } catch (err: any) {
      console.error("Import error:", err);
      alert(err.message || "خطأ أثناء الاستيراد");
      setImportResult({ added: 0, updated: 0, failed: importData.length, warnings: ["خطأ أثناء الاستيراد"] });
    } finally {
      setImporting(false);
    }
  };

  const filtered = commodities.filter(c => {
    const matchesSearch = c.symbol.toLowerCase().includes(search.toLowerCase()) || 
                          c.name_ar.includes(search) || 
                          (c.name_en && c.name_en.toLowerCase().includes(search.toLowerCase()));
    const matchesSector = sectorFilter === 'all' || c.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const canImport = adminUser?.role === 'super_admin' || adminUser?.can_import_prices;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">إدارة الأسعار</h1>
        
        <div className="flex gap-2">
          {canImport && (
            <button 
              onClick={() => setActiveTab(activeTab === 'list' ? 'import' : 'list')}
              className="flex items-center gap-2 bg-white border text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
            >
              {activeTab === 'list' ? <Upload size={18} /> : <Search size={18} />}
              {activeTab === 'list' ? 'استيراد CSV' : 'عودة للقائمة'}
            </button>
          )}
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus size={18} />
            إضافة يدوياً
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
      <>
        <div className="flex gap-4 w-full sm:w-auto bg-white p-4 rounded-xl border">
          <div className="relative flex-1 sm:w-64 max-w-sm">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="بحث بالرمز أو الاسم..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute right-3 top-2.5 text-slate-400" size={20} />
            <select 
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none bg-white min-w-40"
            >
              <option value="all">كل القطاعات</option>
              {catalogSectors.map(s => <option key={s.sector_code} value={s.sector_code}>{s.name_ar}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
           <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
        ) : error ? (
           <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                 <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                   <tr>
                     <th className="px-4 py-3">الرمز</th>
                     <th className="px-4 py-3">الاسم</th>
                     <th className="px-4 py-3">القطاع</th>
                     <th className="px-4 py-3">السعر الحالي</th>
                     <th className="px-4 py-3 text-center">تحديث</th>
                     <th className="px-4 py-3 text-center">الحالة</th>
                     <th className="px-4 py-3 text-center">الظهور</th>
                     <th className="px-4 py-3 text-center">إجراءات</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filtered.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50/50">
                         <td className="px-4 py-3 font-medium font-mono text-slate-900" dir="ltr">{item.symbol}</td>
                         <td className="px-4 py-3 text-slate-800">{item.name_ar}</td>
                         <td className="px-4 py-3">
                           <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs">{item.sector}</span>
                         </td>
                         <td className="px-4 py-3 font-mono font-medium" dir="ltr">
                           <span className={item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : ''}>
                             {item.price}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-center text-slate-500 text-xs">
                           {new Date(item.updated_at).toLocaleString('ar-SA', { hour12: false, hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}
                         </td>
                         <td className="px-4 py-3 text-center">
                           <span className={`px-2 py-1 rounded-full text-xs ${
                             item.status === 'active' ? 'bg-green-100 text-green-700' : 
                             item.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 
                             'bg-slate-100 text-slate-700'
                           }`}>
                             {item.status === 'active' ? 'نشط' : item.status === 'suspended' ? 'معلق' : 'مغلق'}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-center">
                           {item.is_visible ? 
                             <span className="text-green-500 font-bold block text-center">✓</span> : 
                             <span className="text-slate-300 font-bold block text-center">—</span>
                           }
                         </td>
                         <td className="px-4 py-3 text-center">
                           <div className="flex items-center justify-center gap-2 relative">
                             <button onClick={() => openEditModal(item)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md">
                               <Edit2 size={16} />
                             </button>
                             <div className="flex flex-col gap-1 items-center">
                               <button 
                                 onClick={() => deleteCommodity(item.id)} 
                                 className={`p-1.5 rounded-md transition ${deletingId === item.id ? 'bg-red-600 text-white shadow min-w-[70px] text-xs font-bold' : 'text-red-500 hover:bg-red-50'}`}
                               >
                                 {deletingId === item.id ? 'تأكيد الحذف' : <Trash2 size={16} />}
                               </button>
                               {deletingId === item.id && (
                                 <button onClick={() => setDeletingId(null)} className="text-xs text-slate-500 hover:text-slate-700">إلغاء</button>
                               )}
                             </div>
                           </div>
                         </td>
                       </tr>
                     ))}
                 </tbody>
              </table>
              {filtered.length === 0 && (
                 <div className="p-8 text-center text-slate-500">لا يوجد بيانات مطابقة</div>
              )}
             </div>
          </div>
        )}
      </>
      )}

      {/* Import CSV Tab */}
      {activeTab === 'import' && canImport && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="mb-6 border-b pb-4">
            <h2 className="text-lg font-bold mb-2">استيراد الأسعار من ملف CSV</h2>
            <p className="text-sm text-slate-600">
              يجب أن يحتوي الملف على الأعمدة التالية كصف أول (Header):
              <br/>
              <code className="bg-slate-100 px-2 py-1 rounded text-primary-700 font-mono text-xs inline-block mt-2" dir="ltr">symbol, name_ar, name_en, sector, price, unit, source</code>
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileText className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">اضغط لاختيار ملف</span></p>
                        <p className="text-xs text-slate-500">CSV فقط</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".csv" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                </label>
            </div>

            {importData.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex justify-between items-center">
                  <span>تم العثور على {importData.length} صف صالح</span>
                  <button 
                    onClick={applyImport} 
                    disabled={importing}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {importing ? 'جاري الاستيراد...' : 'تأكيد الاستيراد'}
                  </button>
                </h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto bg-slate-50 p-2">
                   <table className="w-full text-xs text-right">
                     <thead>
                       <tr className="text-slate-500 border-b">
                         <th className="py-2 px-2">الرمز</th>
                         <th className="py-2 px-2">الاسم</th>
                         <th className="py-2 px-2">القطاع</th>
                         <th className="py-2 px-2">السعر الجديد</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {importData.slice(0, 10).map((row, i) => (
                           <tr key={i}>
                             <td className="py-2 px-2 font-mono" dir="ltr">{row.symbol}</td>
                             <td className="py-2 px-2">{row.name_ar}</td>
                             <td className="py-2 px-2">{row.sector}</td>
                             <td className="py-2 px-2 font-mono" dir="ltr">{row.price}</td>
                           </tr>
                        ))}
                     </tbody>
                   </table>
                   {importData.length > 10 && <div className="text-center py-2 text-slate-400">...و {importData.length - 10} حقول أخرى</div>}
                </div>
              </div>
            )}

            {importResult && (
              <div className={`p-4 rounded-lg flex gap-3 ${importResult.failed > 0 || (importResult.warnings && importResult.warnings.length > 0) ? 'bg-orange-50 border border-orange-200 text-orange-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                {importResult.failed > 0 ? <AlertCircle className="mt-0.5 shrink-0" /> : <Check className="mt-0.5 shrink-0" />}
                <div>
                  <h4 className="font-bold">اكتمل الاستيراد</h4>
                  <ul className="text-sm mt-1 list-disc list-inside">
                    <li>تم إضافة: {importResult.added}</li>
                    <li>تم تحديث: {importResult.updated}</li>
                    {importResult.failed > 0 && <li>فشل: {importResult.failed}</li>}
                  </ul>
                  {importResult.warnings && importResult.warnings.length > 0 && (
                    <div className="mt-2 text-xs">
                      <p className="font-bold mb-1">ملاحظات التحذير:</p>
                      <ul className="list-disc list-inside">
                        {importResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">{editingItem ? 'تعديل السعر' : 'إضافة سعر جديد يدوياً'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <form id="add-commodity-form" onSubmit={handleSaveSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">السلعة *</label>
                    <div className="flex gap-2">
                      <select 
                        required
                        disabled={!!editingItem}
                        value={form.symbol} 
                        onChange={e => {
                          const val = e.target.value;
                          setForm({...form, symbol: val});
                          if (!editingItem) {
                            const found = catalogCommodities.find(c => c.symbol === val);
                            if (found) {
                              setForm(prev => ({
                                ...prev,
                                symbol: val,
                                name_ar: found.name_ar,
                                name_en: found.name_en,
                                sector: found.sector,
                                unit: found.default_unit
                              }));
                            }
                          }
                        }}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none uppercase bg-white disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="">-- اختر السلعة --</option>
                        {catalogCommodities.map(c => (
                          <option key={c.id} value={c.symbol}>{c.symbol} - {c.name_ar} ({c.sector})</option>
                        ))}
                        {editingItem && !catalogCommodities.find(c => c.symbol === editingItem.symbol) && (
                          <option value={editingItem.symbol}>{editingItem.symbol}</option>
                        )}
                      </select>
                    </div>
                    {(adminUser?.role === 'super_admin' || adminUser?.can_manage_settings) && !editingItem && (
                      <p className="text-xs text-slate-500 mt-1">
                        هل السلعة غير موجودة؟ <button type="button" onClick={() => setIsQuickAddCommodityOpen(true)} className="text-primary-600 hover:underline">أضفها سريعاً</button>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">القطاع *</label>
                    <input type="text" readOnly disabled
                      value={form.sector} 
                      className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-slate-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالعربي *</label>
                    <input type="text" readOnly disabled value={form.name_ar} 
                      className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-slate-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالإنجليزي *</label>
                    <input type="text" dir="ltr" readOnly disabled value={form.name_en} 
                      className="w-full border rounded-lg px-3 py-2 bg-slate-50 text-slate-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">السعر الحالي *</label>
                    <input type="number" step="0.0001" required value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2 font-mono focus:ring-primary-500 outline-none" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة (Unit)</label>
                    <select value={form.unit || ''} onChange={e => setForm({...form, unit: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none bg-white">
                      <option value="">-- اختياري --</option>
                      {catalogUnits.map((u: UnitsCatalog) => (
                        <option key={u.id} value={u.unit_code}>{u.unit_ar} ({u.unit_code})</option>
                      ))}
                      {form.unit && !catalogUnits.find((u: UnitsCatalog) => u.unit_code === form.unit) && (
                        <option value={form.unit}>{form.unit}</option>
                      )}
                    </select>
                    {(adminUser?.role === 'super_admin' || adminUser?.can_manage_settings) && !editingItem && (
                      <p className="text-xs text-slate-500 mt-1">
                        هل الوحدة غير موجودة؟ <button type="button" onClick={() => setIsQuickAddUnitOpen(true)} className="text-primary-600 hover:underline">أضفها سريعاً</button>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">المصدر (Source)</label>
                    <input type="text" value={form.source || ''} onChange={e => setForm({...form, source: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none" placeholder="Bloomberg, OANDA..." />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الحالة</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-primary-500 outline-none bg-white">
                      <option value="active">نشط</option>
                      <option value="suspended">معلق</option>
                      <option value="closed">مغلق</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id="add_visible" checked={form.is_visible} onChange={e => setForm({...form, is_visible: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="add_visible" className="text-sm font-medium text-slate-700">تفعيل الظهور للزوار</label>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                form="add-commodity-form" 
                disabled={saving || !form.symbol} 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : (editingItem ? 'تحديث السعر' : (commodities.find(c => c.symbol === form.symbol?.trim().toUpperCase()) ? 'تحديث السعر' : 'إضافة السعر'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {isQuickAddCommodityOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">إضافة سلعة كمرجع سريع</h3>
              <button disabled={savingQuick} onClick={() => setIsQuickAddCommodityOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleQuickSaveCommodity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الرمز *</label>
                    <input required type="text" value={quickCommodityForm.symbol} onChange={e => setQuickCommodityForm({...quickCommodityForm, symbol: e.target.value.toUpperCase()})} className="w-full border rounded-lg px-3 py-2 uppercase" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة *</label>
                    <input required type="text" value={quickCommodityForm.default_unit} onChange={e => setQuickCommodityForm({...quickCommodityForm, default_unit: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالعربية *</label>
                    <input required type="text" value={quickCommodityForm.name_ar} onChange={e => setQuickCommodityForm({...quickCommodityForm, name_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالإنجليزية *</label>
                    <input required type="text" value={quickCommodityForm.name_en} onChange={e => setQuickCommodityForm({...quickCommodityForm, name_en: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">القطاع *</label>
                  <select required value={quickCommodityForm.sector} onChange={e => setQuickCommodityForm({...quickCommodityForm, sector: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-white">
                    <option value="">-- اختر القطاع --</option>
                    {catalogSectors.map(sec => <option key={sec.sector_code} value={sec.sector_code}>{sec.name_ar} - {sec.sector_code}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsQuickAddCommodityOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">إلغاء</button>
                  <button type="submit" disabled={savingQuick} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    {savingQuick ? 'جاري الحفظ...' : 'إضافة واستخدام'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isQuickAddUnitOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">إضافة وحدة سريعة</h3>
              <button disabled={savingQuick} onClick={() => setIsQuickAddUnitOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleQuickSaveUnit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الكود (مثال: barrel) *</label>
                  <input required type="text" value={quickUnitForm.unit_code} onChange={e => setQuickUnitForm({...quickUnitForm, unit_code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالعربية *</label>
                  <input required type="text" value={quickUnitForm.unit_ar} onChange={e => setQuickUnitForm({...quickUnitForm, unit_ar: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الاسم بالإنجليزية *</label>
                  <input required type="text" value={quickUnitForm.unit_en} onChange={e => setQuickUnitForm({...quickUnitForm, unit_en: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsQuickAddUnitOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">إلغاء</button>
                  <button type="submit" disabled={savingQuick} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    {savingQuick ? 'جاري الحفظ...' : 'إضافة واستخدام'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
