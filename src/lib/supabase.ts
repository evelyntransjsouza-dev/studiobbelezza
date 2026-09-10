import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudioSettings, Service, Appointment, PortfolioItem, BlockedDate } from '../types';
import { DEFAULT_STUDIO_SETTINGS, INITIAL_SERVICES, INITIAL_APPOINTMENTS, INITIAL_PORTFOLIO } from './defaultData';

const STORAGE_KEYS = {
  SETTINGS: 'studio_settings_data',
  SERVICES: 'studio_services_data',
  APPOINTMENTS: 'studio_appointments_data',
  PORTFOLIO: 'studio_portfolio_data',
  BLOCKED_DATES: 'studio_blocked_dates_data',
  SUPABASE_URL: 'studio_custom_supabase_url',
  SUPABASE_KEY: 'studio_custom_supabase_key',
};

// Get current Supabase credentials (from env or localStorage)
export function getSupabaseConfig(): { url: string; key: string; isConfigured: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  const localUrl = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || '';

  const url = localUrl || envUrl;
  const key = localKey || envKey;

  const isConfigured = Boolean(url && key && url.startsWith('http'));
  return { url, key, isConfigured };
}

export function saveCustomSupabaseConfig(url: string, key: string) {
  if (url) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
  }

  if (key) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_KEY);
  }
}

let supabaseInstance: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance || lastUrl !== url || lastKey !== key) {
    try {
      supabaseInstance = createClient(url, key);
      lastUrl = url;
      lastKey = key;
    } catch (e) {
      console.error('Failed to create Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

// ================= Local Fallback Storage Helpers =================
function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Local storage write error:', e);
  }
}

// ================= Unified Storage Services =================

export async function fetchStudioSettings(): Promise<StudioSettings> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('studio_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name || DEFAULT_STUDIO_SETTINGS.name,
          instagram: data.instagram || DEFAULT_STUDIO_SETTINGS.instagram,
          phone: data.phone || DEFAULT_STUDIO_SETTINGS.phone,
          address: data.address || DEFAULT_STUDIO_SETTINGS.address,
          bio: data.bio || DEFAULT_STUDIO_SETTINGS.bio,
          logoUrl: data.logo_url || '',
          bannerUrl: data.banner_url || '',
          workDays: data.work_days || DEFAULT_STUDIO_SETTINGS.workDays,
          openingTime: data.opening_time || DEFAULT_STUDIO_SETTINGS.openingTime,
          closingTime: data.closing_time || DEFAULT_STUDIO_SETTINGS.closingTime,
          slotInterval: data.slot_interval || DEFAULT_STUDIO_SETTINGS.slotInterval,
          adminPin: data.admin_pin || DEFAULT_STUDIO_SETTINGS.adminPin,
        };
      }
    } catch (e) {
      console.warn('Supabase fetch settings failed, falling back to local:', e);
    }
  }
  const local = getLocal<StudioSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_STUDIO_SETTINGS);
  let updated = false;
  // Auto-migrate previous placeholder phone to the studio's actual whatsapp
  if (!local.phone || local.phone === '(11) 98765-4321') {
    local.phone = DEFAULT_STUDIO_SETTINGS.phone;
    updated = true;
  }
  // Auto-migrate adminPin to beth123
  if (!local.adminPin || local.adminPin === '1234') {
    local.adminPin = 'beth123';
    updated = true;
  }
  if (!local.name || local.name === 'STUDIO BBELEZZA') {
    local.name = 'Studio B Beleza';
    updated = true;
  }
  // Auto-migrate address to Rua Mandiúba 176
  if (!local.address || local.address.includes('Paulista')) {
    local.address = 'Rua Mandiúba, 176 - CEP 03158-070, São Paulo - SP';
    updated = true;
  }
  if (updated) {
    setLocal(STORAGE_KEYS.SETTINGS, local);
  }
  return local;
}

export async function updateStudioSettings(settings: StudioSettings): Promise<StudioSettings> {
  setLocal(STORAGE_KEYS.SETTINGS, settings);
  const client = getSupabaseClient();
  if (client) {
    try {
      const payload = {
        name: settings.name,
        instagram: settings.instagram,
        phone: settings.phone,
        address: settings.address,
        bio: settings.bio,
        logo_url: settings.logoUrl,
        banner_url: settings.bannerUrl,
        work_days: settings.workDays,
        opening_time: settings.openingTime,
        closing_time: settings.closingTime,
        slot_interval: settings.slotInterval,
        admin_pin: settings.adminPin,
        updated_at: new Date().toISOString(),
      };

      // Try update or insert
      const { data: existing } = await client.from('studio_settings').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        await client.from('studio_settings').update(payload).eq('id', existing.id);
      } else {
        await client.from('studio_settings').insert([payload]);
      }
    } catch (e) {
      console.warn('Supabase update settings error:', e);
    }
  }
  return settings;
}

export async function fetchServices(): Promise<Service[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('services')
        .select('*')
        .order('price', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          price: Number(d.price),
          durationMinutes: Number(d.duration_minutes),
          description: d.description || '',
          imageUrl: d.image_url || '',
          isPopular: Boolean(d.is_popular),
          isActive: Boolean(d.is_active ?? true),
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch services error, using local:', e);
    }
  }
  return getLocal<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
}

export async function saveService(service: Service): Promise<Service> {
  const current = getLocal<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const index = current.findIndex((s) => s.id === service.id);
  let updatedList: Service[];

  if (index >= 0) {
    updatedList = current.map((s) => (s.id === service.id ? service : s));
  } else {
    updatedList = [service, ...current];
  }
  setLocal(STORAGE_KEYS.SERVICES, updatedList);

  const client = getSupabaseClient();
  if (client) {
    try {
      const payload = {
        id: service.id,
        name: service.name,
        category: service.category,
        price: service.price,
        duration_minutes: service.durationMinutes,
        description: service.description,
        image_url: service.imageUrl,
        is_popular: service.isPopular,
        is_active: service.isActive,
      };
      await client.from('services').upsert(payload);
    } catch (e) {
      console.warn('Supabase save service error:', e);
    }
  }
  return service;
}

export async function deleteService(serviceId: string): Promise<void> {
  const current = getLocal<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const updated = current.filter((s) => s.id !== serviceId);
  setLocal(STORAGE_KEYS.SERVICES, updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('services').delete().eq('id', serviceId);
    } catch (e) {
      console.warn('Supabase delete service error:', e);
    }
  }
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (!error && data) {
        return data.map((d) => ({
          id: d.id,
          clientName: d.client_name,
          clientPhone: d.client_phone,
          clientEmail: d.client_email,
          serviceId: d.service_id,
          serviceName: d.service_name,
          price: Number(d.price),
          date: d.date,
          time: d.time,
          status: d.status,
          notes: d.notes,
          createdAt: d.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch appointments error, using local:', e);
    }
  }
  return getLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
}

export async function createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
  const newAppointment: Appointment = {
    ...appointment,
    id: 'app-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
  };

  const current = getLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const updated = [newAppointment, ...current];
  setLocal(STORAGE_KEYS.APPOINTMENTS, updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      const payload = {
        id: newAppointment.id,
        client_name: newAppointment.clientName,
        client_phone: newAppointment.clientPhone,
        client_email: newAppointment.clientEmail || null,
        service_id: newAppointment.serviceId,
        service_name: newAppointment.serviceName,
        price: newAppointment.price,
        date: newAppointment.date,
        time: newAppointment.time,
        status: newAppointment.status,
        notes: newAppointment.notes || null,
        created_at: newAppointment.createdAt,
      };
      await client.from('appointments').insert([payload]);
    } catch (e) {
      console.warn('Supabase create appointment error:', e);
    }
  }
  return newAppointment;
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']): Promise<void> {
  const current = getLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const updated = current.map((a) => (a.id === id ? { ...a, status } : a));
  setLocal(STORAGE_KEYS.APPOINTMENTS, updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('appointments').update({ status }).eq('id', id);
    } catch (e) {
      console.warn('Supabase update appointment error:', e);
    }
  }
}

export async function deleteAppointment(id: string): Promise<void> {
  const current = getLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const updated = current.filter((a) => a.id !== id);
  setLocal(STORAGE_KEYS.APPOINTMENTS, updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('appointments').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete appointment error:', e);
    }
  }
}

export async function fetchPortfolio(): Promise<PortfolioItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('portfolio')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          imageUrl: d.image_url,
          description: d.description,
          createdAt: d.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch portfolio error:', e);
    }
  }
  return getLocal<PortfolioItem[]>(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
}

export async function savePortfolioItem(item: PortfolioItem): Promise<PortfolioItem> {
  const current = getLocal<PortfolioItem[]>(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
  const updated = [item, ...current.filter((p) => p.id !== item.id)];
  setLocal(STORAGE_KEYS.PORTFOLIO, updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('portfolio').upsert({
        id: item.id,
        title: item.title,
        category: item.category,
        image_url: item.imageUrl,
        description: item.description,
        created_at: item.createdAt,
      });
    } catch (e) {
      console.warn('Supabase save portfolio error:', e);
    }
  }
  return item;
}

export async function deletePortfolioItem(id: string): Promise<void> {
  const current = getLocal<PortfolioItem[]>(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
  const updated = current.filter((p) => p.id !== id);
  setLocal(STORAGE_KEYS.PORTFOLIO, updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('portfolio').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete portfolio item error:', e);
    }
  }
}

export async function fetchBlockedDates(): Promise<BlockedDate[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('blocked_dates').select('*');
      if (!error && data) {
        return data.map((d) => ({
          date: d.date,
          reason: d.reason,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch blocked dates error:', e);
    }
  }
  return getLocal<BlockedDate[]>(STORAGE_KEYS.BLOCKED_DATES, []);
}

export async function toggleBlockDate(date: string, reason?: string): Promise<BlockedDate[]> {
  const current = getLocal<BlockedDate[]>(STORAGE_KEYS.BLOCKED_DATES, []);
  const exists = current.some((d) => d.date === date);
  let updated: BlockedDate[];

  if (exists) {
    updated = current.filter((d) => d.date !== date);
  } else {
    updated = [...current, { date, reason: reason || 'Bloqueado pelo Studio' }];
  }
  setLocal(STORAGE_KEYS.BLOCKED_DATES, updated);

  const client = getSupabaseClient();
  if (client) {
    try {
      if (exists) {
        await client.from('blocked_dates').delete().eq('date', date);
      } else {
        await client.from('blocked_dates').insert([{ date, reason: reason || 'Bloqueado pelo Studio' }]);
      }
    } catch (e) {
      console.warn('Supabase toggle blocked date error:', e);
    }
  }
  return updated;
}

// SQL Script generator for owner to run in Supabase SQL Editor
export function getSupabaseSetupSQL(): string {
  return `-- ========================================================================
-- STUDIO B BELEZA (@studiobbelezza) - SCHEMA COMPLETO & POLÍTICAS DE ARMAZENAMENTO
-- Execute este script no SQL Editor do seu Supabase Dashboard (supabase.com)
-- ========================================================================

-- 1. TABELA DE CONFIGURAÇÕES DO STUDIO
CREATE TABLE IF NOT EXISTS studio_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Studio B Beleza',
  instagram TEXT NOT NULL DEFAULT '@studiobbelezza',
  phone TEXT NOT NULL DEFAULT '(11) 94823-0099',
  address TEXT DEFAULT 'Rua Mandiúba, 176 - CEP 03158-070, São Paulo - SP',
  bio TEXT DEFAULT 'Especialistas em loiros perfeitos, cortes, botox e tratamentos capilares.',
  logo_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  work_days JSONB DEFAULT '[2, 3, 4, 5, 6]'::jsonb,
  opening_time TEXT DEFAULT '09:00',
  closing_time TEXT DEFAULT '19:00',
  slot_interval INT DEFAULT 60,
  admin_pin TEXT DEFAULT 'beth123',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE SERVIÇOS & ESPECIALIDADES
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  description TEXT,
  image_url TEXT,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE AGENDAMENTOS DOS CLIENTES
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE DATAS BLOQUEADAS PELO STUDIO
CREATE TABLE IF NOT EXISTS blocked_dates (
  date TEXT PRIMARY KEY,
  reason TEXT DEFAULT 'Bloqueado pelo Studio',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE PORTFÓLIO / TRABALHOS REALIZADOS
CREATE TABLE IF NOT EXISTS portfolio (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================================
-- ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ========================================================================
ALTER TABLE studio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

-- Remove políticas anteriores se existirem (evita erro de duplicidade ao reexecutar)
DROP POLICY IF EXISTS "Public read studio_settings" ON studio_settings;
DROP POLICY IF EXISTS "Public update studio_settings" ON studio_settings;
DROP POLICY IF EXISTS "Public manage studio_settings" ON studio_settings;

DROP POLICY IF EXISTS "Public read services" ON services;
DROP POLICY IF EXISTS "Public manage services" ON services;

DROP POLICY IF EXISTS "Public read appointments" ON appointments;
DROP POLICY IF EXISTS "Public insert appointments" ON appointments;
DROP POLICY IF EXISTS "Public update appointments" ON appointments;
DROP POLICY IF EXISTS "Public delete appointments" ON appointments;
DROP POLICY IF EXISTS "Public manage appointments" ON appointments;

DROP POLICY IF EXISTS "Public read blocked_dates" ON blocked_dates;
DROP POLICY IF EXISTS "Public manage blocked_dates" ON blocked_dates;

DROP POLICY IF EXISTS "Public read portfolio" ON portfolio;
DROP POLICY IF EXISTS "Public manage portfolio" ON portfolio;

-- Políticas para studio_settings
CREATE POLICY "Public read studio_settings" ON studio_settings FOR SELECT USING (true);
CREATE POLICY "Public manage studio_settings" ON studio_settings FOR ALL USING (true);

-- Políticas para services
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Public manage services" ON services FOR ALL USING (true);

-- Políticas para appointments (clientes podem consultar e agendar; dono pode gerenciar)
CREATE POLICY "Public read appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY "Public insert appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update appointments" ON appointments FOR UPDATE USING (true);
CREATE POLICY "Public delete appointments" ON appointments FOR DELETE USING (true);

-- Políticas para blocked_dates
CREATE POLICY "Public read blocked_dates" ON blocked_dates FOR SELECT USING (true);
CREATE POLICY "Public manage blocked_dates" ON blocked_dates FOR ALL USING (true);

-- Políticas para portfolio
CREATE POLICY "Public read portfolio" ON portfolio FOR SELECT USING (true);
CREATE POLICY "Public manage portfolio" ON portfolio FOR ALL USING (true);

-- ========================================================================
-- POLÍTICAS DE ARMAZENAMENTO DE ARQUIVOS (SUPABASE STORAGE)
-- O RLS já vem habilitado por padrão no storage.objects pelo Supabase
-- ========================================================================

-- 1. Criação do Bucket de Armazenamento Público para Fotos e Mídias
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-media',
  'studio-media',
  true,
  10485760, -- limite de 10MB por foto
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Limpa políticas de storage anteriores para evitar duplicidade
DROP POLICY IF EXISTS "Public Access - Ver Fotos do Studio" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload - Enviar Fotos para o Studio" ON storage.objects;
DROP POLICY IF EXISTS "Public Update - Atualizar Fotos do Studio" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete - Excluir Fotos do Studio" ON storage.objects;

-- 2. Política de Leitura Pública (Qualquer visitante pode carregar as fotos no site)
CREATE POLICY "Public Access - Ver Fotos do Studio"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-media');

-- 3. Política de Armazenamento/Upload (Permite upload de fotos no bucket studio-media)
CREATE POLICY "Public Upload - Enviar Fotos para o Studio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'studio-media');

-- 4. Política de Atualização (Permite substituir imagens existentes)
CREATE POLICY "Public Update - Atualizar Fotos do Studio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'studio-media');

-- 5. Política de Remoção (Permite remover fotos do portfólio)
CREATE POLICY "Public Delete - Excluir Fotos do Studio"
ON storage.objects FOR DELETE
USING (bucket_id = 'studio-media');

-- ========================================================================
-- DADOS INICIAIS DO STUDIO B BELEZA
-- ========================================================================
INSERT INTO studio_settings (name, instagram, phone, address, bio, opening_time, closing_time)
VALUES (
  'Studio B Beleza',
  '@studiobbelezza',
  '(11) 94823-0099',
  'Rua Mandiúba, 176 - CEP 03158-070, São Paulo - SP',
  'Especialistas em loiros perfeitos, cortes, botox e tratamentos capilares.',
  '09:00',
  '19:00'
)
ON CONFLICT DO NOTHING;

INSERT INTO services (id, name, category, price, duration_minutes, description, is_popular, is_active)
VALUES 
  ('srv-loiro', 'Loiro dos Sonhos (Mechas & Iluminado)', 'Loiro', 380.00, 240, 'Técnica de mechas e descoloração com proteção dos fios.', true, true),
  ('srv-corte', 'Corte Feminino & Visagismo', 'Cortes', 90.00, 60, 'Corte visagista com lavagem especial e escova modelada.', true, true),
  ('srv-botox', 'Botox Capilar Repositor de Massa', 'Botox', 180.00, 90, 'Alinhamento e redução de volume com brilho espelhado.', true, true),
  ('srv-tintura', 'Tintura & Coloração Global', 'Tintura', 150.00, 90, 'Coloração profissional com alta cobertura e luminosidade.', false, true),
  ('srv-progressiva', 'Escova Progressiva Orgânica', 'Progressiva', 230.00, 150, 'Alinhamento 100% livre de formol e fios sedosos.', true, true),
  ('srv-penteado', 'Penteado para Festas & Noivas', 'Penteado', 170.00, 90, 'Coques, semi-presos e tranças sofisticadas.', false, true)
ON CONFLICT (id) DO NOTHING;
`;
}
