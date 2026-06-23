export type AdminRole = 'super_admin' | 'Admin' | 'Editor' | 'Viewer' | string;

export interface AdminUser {
  id: string; // auth.uid()
  email: string;
  full_name?: string;
  role: AdminRole;
  is_active: boolean;
  can_manage_admins: boolean;
  can_manage_prices: boolean;
  can_import_prices: boolean;
  can_manage_news: boolean;
  can_manage_analysis: boolean;
  can_manage_messages: boolean;
  can_view_visits: boolean;
  can_manage_settings: boolean;
  created_at: string;
  updated_at: string;
}

export interface Commodity {
  id: string;
  symbol: string;
  name_ar: string;
  name_en: string;
  sector: string;
  price: number;
  previous_price: number | null;
  change_value: number | null;
  change_percent: number | null;
  trend: 'up' | 'down' | 'neutral';
  status: 'active' | 'suspended' | 'closed';
  is_visible: boolean;
  unit: string | null;
  source: string | null;
  last_update_method?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  summary_ar: string | null;
  summary_en: string | null;
  source: string | null;
  image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  title: string;
  content: string;
  asset_symbol: string | null;
  author: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface SiteVisit {
  id: string;
  path: string;
  ip_address: string | null;
  user_agent: string | null;
  visited_at: string;
}

export interface PlatformSettings {
  id: string; // single row usually
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  announcement: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  maintenance_mode: boolean;
  updated_at: string;
}

export interface SectorCatalog {
  id: string;
  sector_code: string;
  name_ar: string;
  name_en: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CommodityCatalog {
  id: string;
  symbol: string;
  name_ar: string;
  name_en: string;
  sector: string;
  default_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitsCatalog {
  id: string;
  unit_code: string;
  unit_ar: string;
  unit_en: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
