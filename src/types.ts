export interface StudioSettings {
  id?: string;
  name: string;
  instagram: string;
  phone: string;
  address: string;
  bio: string;
  logoUrl: string;
  bannerUrl?: string;
  workDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  openingTime: string; // '09:00'
  closingTime: string; // '19:00'
  slotInterval: number; // in minutes (e.g. 30 or 60)
  adminPin: string;
}

export type ServiceCategory = 
  | 'Loiro'
  | 'Cortes'
  | 'Botox'
  | 'Tintura'
  | 'Progressiva'
  | 'Penteado'
  | 'Tratamentos'
  | 'Outros';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  description: string;
  imageUrl?: string;
  isPopular?: boolean;
  isActive: boolean;
}

export type AppointmentStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export interface BlockedDate {
  date: string; // YYYY-MM-DD
  reason?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: ServiceCategory;
  imageUrl: string;
  description?: string;
  createdAt: string;
}
