import React, { useState, useEffect } from 'react';
import { StudioSettings, Service, Appointment, BlockedDate, PortfolioItem, AppointmentStatus } from './types';
import { DEFAULT_STUDIO_SETTINGS } from './lib/defaultData';
import {
  fetchStudioSettings,
  updateStudioSettings,
  fetchServices,
  saveService,
  deleteService,
  fetchAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  fetchBlockedDates,
  toggleBlockDate,
  fetchPortfolio,
  savePortfolioItem,
  deletePortfolioItem,
} from './lib/supabase';
import { Navbar } from './components/Navbar';
import { ClientBookingView } from './components/ClientBookingView';
import { OwnerAdminView } from './components/OwnerAdminView';
import { SupabaseModal } from './components/SupabaseModal';
import { StudioLogo } from './components/StudioLogo';

export default function App() {
  const [activeView, setActiveView] = useState<'client' | 'owner'>('client');
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Initial load
  useEffect(() => {
    async function loadAllData() {
      try {
        setIsLoading(true);
        const [loadedSettings, loadedServices, loadedApps, loadedBlocked, loadedPort] = await Promise.all([
          fetchStudioSettings(),
          fetchServices(),
          fetchAppointments(),
          fetchBlockedDates(),
          fetchPortfolio(),
        ]);

        setSettings(loadedSettings);
        setServices(loadedServices);
        setAppointments(loadedApps);
        setBlockedDates(loadedBlocked);
        setPortfolio(loadedPort);
      } catch (err) {
        console.error('Error loading initial studio data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAllData();

    // Check URL hash for admin access (#admin or #dono)
    const checkHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin' || hash === '#dono' || hash === '#gestao') {
        setActiveView('owner');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Handlers
  const handleUpdateSettings = async (newSettings: StudioSettings) => {
    const updated = await updateStudioSettings(newSettings);
    setSettings(updated);
    return updated;
  };

  const handleSaveService = async (service: Service) => {
    const saved = await saveService(service);
    setServices((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        return prev.map((s) => (s.id === saved.id ? saved : s));
      }
      return [saved, ...prev];
    });
    return saved;
  };

  const handleDeleteService = async (serviceId: string) => {
    await deleteService(serviceId);
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const handleCreateAppointment = async (app: Omit<Appointment, 'id' | 'createdAt'>) => {
    const created = await createAppointment(app);
    setAppointments((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    await updateAppointmentStatus(id, status);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointment(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggleBlockDate = async (date: string, reason?: string) => {
    const updated = await toggleBlockDate(date, reason);
    setBlockedDates(updated);
    return updated;
  };

  const handleSavePortfolioItem = async (item: PortfolioItem) => {
    const saved = await savePortfolioItem(item);
    setPortfolio((prev) => [saved, ...prev.filter((p) => p.id !== item.id)]);
    return saved;
  };

  const handleDeletePortfolioItem = async (id: string) => {
    await deletePortfolioItem(id);
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f5] flex flex-col items-center justify-center p-4">
        <StudioLogo size="lg" className="animate-pulse mb-4" />
        <p className="font-serif-luxury text-xl font-bold text-[#581421]">STUDIO BBELEZZA</p>
        <p className="text-xs text-stone-600 mt-1">Carregando serviços e agenda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f5]">
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main Content: Client Booking View vs Owner Admin View */}
      <div className="flex-1">
        {activeView === 'client' ? (
          <ClientBookingView
            settings={settings}
            services={services}
            appointments={appointments}
            blockedDates={blockedDates}
            portfolio={portfolio}
            onCreateAppointment={handleCreateAppointment}
            onOpenOwner={() => setActiveView('owner')}
          />
        ) : (
          <OwnerAdminView
            settings={settings}
            services={services}
            appointments={appointments}
            blockedDates={blockedDates}
            portfolio={portfolio}
            onUpdateSettings={handleUpdateSettings}
            onSaveService={handleSaveService}
            onDeleteService={handleDeleteService}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={handleDeleteAppointment}
            onCreateAppointment={handleCreateAppointment}
            onToggleBlockDate={handleToggleBlockDate}
            onSavePortfolioItem={handleSavePortfolioItem}
            onDeletePortfolioItem={handleDeletePortfolioItem}
          />
        )}
      </div>

      {/* Supabase Connection Setup Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}
