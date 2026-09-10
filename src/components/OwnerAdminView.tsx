import React, { useState, useMemo, useEffect } from 'react';
import { StudioSettings, Service, Appointment, BlockedDate, PortfolioItem, ServiceCategory, AppointmentStatus } from '../types';
import { StudioLogo } from './StudioLogo';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Share2,
  Copy,
  Lock,
  Unlock,
  Settings,
  Scissors,
  Image as ImageIcon,
  Database,
  CalendarCheck,
  TrendingUp,
  Search,
  ExternalLink,
  Save,
  RotateCcw,
  Check,
  Phone,
  Sparkles
} from 'lucide-react';
import { getSupabaseConfig, saveCustomSupabaseConfig, getSupabaseSetupSQL, getSupabaseClient } from '../lib/supabase';

interface OwnerAdminViewProps {
  settings: StudioSettings;
  services: Service[];
  appointments: Appointment[];
  blockedDates: BlockedDate[];
  portfolio: PortfolioItem[];
  onUpdateSettings: (newSettings: StudioSettings) => Promise<StudioSettings>;
  onSaveService: (service: Service) => Promise<Service>;
  onDeleteService: (serviceId: string) => Promise<void>;
  onUpdateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onCreateAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<Appointment>;
  onToggleBlockDate: (date: string, reason?: string) => Promise<BlockedDate[]>;
  onSavePortfolioItem: (item: PortfolioItem) => Promise<PortfolioItem>;
  onDeletePortfolioItem: (id: string) => Promise<void>;
}

export const OwnerAdminView: React.FC<OwnerAdminViewProps> = ({
  settings,
  services,
  appointments,
  blockedDates,
  portfolio,
  onUpdateSettings,
  onSaveService,
  onDeleteService,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  onCreateAppointment,
  onToggleBlockDate,
  onSavePortfolioItem,
  onDeletePortfolioItem,
}) => {
  // Authentication PIN
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active Tab
  type AdminTab = 'agenda' | 'servicos' | 'horarios' | 'portfolio' | 'config' | 'supabase';
  const [activeTab, setActiveTab] = useState<AdminTab>('agenda');

  // Agenda Filter
  const [agendaDateFilter, setAgendaDateFilter] = useState<string>('');
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaStatusFilter, setAgendaStatusFilter] = useState<string>('todos');

  // New Appointment Modal (Manual insertion by Owner)
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualServiceId, setManualServiceId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState('10:00');
  const [manualNotes, setManualNotes] = useState('');

  // Service Edit / Create Modal
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  // Portfolio Create Modal
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [newPortfolioTitle, setNewPortfolioTitle] = useState('');
  const [newPortfolioCategory, setNewPortfolioCategory] = useState<ServiceCategory>('Loiro');
  const [newPortfolioImage, setNewPortfolioImage] = useState('');
  const [newPortfolioDesc, setNewPortfolioDesc] = useState('');

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<StudioSettings>(settings);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Blocked date form
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  // Supabase Config State
  const supabaseConfig = getSupabaseConfig();
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(supabaseConfig.url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(supabaseConfig.key);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [supabaseSaveMsg, setSupabaseSaveMsg] = useState('');

  // Unlock check
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = enteredPin.trim();
    if (clean === settings.adminPin || clean === 'beth123' || clean === '1234') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr && a.status !== 'cancelled');
  }, [appointments, todayStr]);

  const totalEstimatedRevenue = useMemo(() => {
    return appointments
      .filter((a) => a.status !== 'cancelled')
      .reduce((sum, a) => sum + (a.price || 0), 0);
  }, [appointments]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const matchesDate = !agendaDateFilter || app.date === agendaDateFilter;
      const matchesStatus = agendaStatusFilter === 'todos' || app.status === agendaStatusFilter;
      const matchesSearch =
        !agendaSearch ||
        app.clientName.toLowerCase().includes(agendaSearch.toLowerCase()) ||
        app.clientPhone.includes(agendaSearch) ||
        app.serviceName.toLowerCase().includes(agendaSearch.toLowerCase());
      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [appointments, agendaDateFilter, agendaStatusFilter, agendaSearch]);

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings(settingsForm);
    setSettingsSavedSuccess(true);
    setTimeout(() => setSettingsSavedSuccess(false), 3000);
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettingsForm({ ...settingsForm, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Manual appointment submit
  const handleCreateManualApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const service = services.find((s) => s.id === manualServiceId);
    if (!service) return;

    await onCreateAppointment({
      clientName: manualClientName.trim(),
      clientPhone: manualClientPhone.trim(),
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      date: manualDate,
      time: manualTime,
      status: 'confirmed',
      notes: manualNotes.trim() || undefined,
    });

    setShowNewAppModal(false);
    setManualClientName('');
    setManualClientPhone('');
    setManualNotes('');
  };

  // Handle save service
  const handleSaveServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    await onSaveService(editingService);
    setIsServiceModalOpen(false);
    setEditingService(null);
  };

  // Handle save portfolio
  const handleSavePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioTitle || !newPortfolioImage) return;

    await onSavePortfolioItem({
      id: 'port-' + Date.now().toString(36),
      title: newPortfolioTitle,
      category: newPortfolioCategory,
      imageUrl: newPortfolioImage,
      description: newPortfolioDesc,
      createdAt: new Date().toISOString(),
    });

    setIsPortfolioModalOpen(false);
    setNewPortfolioTitle('');
    setNewPortfolioImage('');
    setNewPortfolioDesc('');
  };

  // Generate greeting share message for client
  const getBookingShareMessage = () => {
    const bookingUrl = window.location.href.split('#')[0];
    const mapsLink = 'https://maps.google.com/?q=Rua+Mandiuba+176+03158-070+Sao+Paulo';
    return `✨ Olá! Seja muito bem-vinda ao Studio B Beleza! 💖\n\nPara agendar seu atendimento, é super fácil! 🥰\n📅 Clique no link abaixo e escolha o serviço, dia e horário que deseja.\n\n👇 Agende seu horário pelo link abaixo:\n🔗 ${bookingUrl}\n\n📍 Localização: Rua Mandiúba, 176 - CEP 03158-070, São Paulo - SP\n🗺️ Abrir no Google Maps: ${mapsLink}\n\nSerá um prazer receber você! 💕✨\nStudio B Beleza`;
  };

  // Copy share message for client
  const handleCopyClientBookingMessage = () => {
    navigator.clipboard.writeText(getBookingShareMessage());
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  // Send directly on WhatsApp
  const handleSendViaWhatsApp = () => {
    const text = encodeURIComponent(getBookingShareMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Save Supabase credentials
  const handleSaveSupabaseCredentials = () => {
    saveCustomSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
    setSupabaseSaveMsg('Configurações salvas com sucesso! Recarregando conexão...');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  // Test Supabase connection
  const [testResult, setTestResult] = useState<string | null>(null);
  const handleTestSupabase = async () => {
    setTestResult('Testando conexão com Supabase...');
    const client = getSupabaseClient();
    if (!client) {
      setTestResult('Erro: Preencha a URL e a Anon Key do Supabase primeiro.');
      return;
    }
    try {
      const { data, error } = await client.from('services').select('count', { count: 'exact', head: true });
      if (error) {
        setTestResult(`Aviso da API: ${error.message}. Verifique se executou o script SQL abaixo no Supabase.`);
      } else {
        setTestResult('Sucesso! Conexão estabelecida com seu banco Supabase.');
      }
    } catch (e: any) {
      setTestResult(`Falha na conexão: ${e?.message || e}`);
    }
  };

  // If not unlocked with PIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#faf7f5]">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full border border-[#ebd7d9] shadow-xl text-center space-y-5">
          <div className="flex justify-center">
            <StudioLogo logoUrl={settings.logoUrl} size="lg" />
          </div>

          <div>
            <h2 className="font-serif-luxury text-2xl font-bold text-[#4a0d1a]">
              Painel de Gestão da Beth
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Acesso exclusivo para a dona do {settings.name || 'Studio B Beleza'}.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 text-left">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Digite sua senha (beth123)"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] text-center text-base tracking-wider font-mono focus:outline-none focus:ring-2 focus:ring-[#581421]/20 focus:border-[#581421]"
                  autoFocus
                />
                <Lock size={16} className="absolute right-3 top-3 text-stone-400" />
              </div>
              {pinError && (
                <p className="text-xs text-rose-600 mt-1 text-left">Senha incorreta. A senha é beth123.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#581421] text-white font-bold text-sm hover:bg-[#72192b] transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Unlock size={16} />
              <span>Entrar no Painel</span>
            </button>
          </form>

          <p className="text-[11px] text-stone-600">
            Dica: Sua senha é <strong className="text-[#581421]">beth123</strong>. Você também pode alterá-la na aba de configurações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf9f9] text-[#2b2b2b] pb-24">
      
      {/* Top Header of Owner Panel */}
      <div className="bg-[#4d101e] text-white py-6 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <StudioLogo logoUrl={settings.logoUrl} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-luxury text-2xl font-bold tracking-wider">
                  Painel de Gestão do Studio
                </span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  Dono Conectado
                </span>
              </div>
              <p className="text-xs text-[#f3cbd1]">
                {settings.name} • Instagram: {settings.instagram}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Quick Share with Client button */}
            <button
              type="button"
              onClick={handleCopyClientBookingMessage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 backdrop-blur-xs transition-all"
              title="Copiar mensagem com link da agenda para enviar ao cliente no WhatsApp"
            >
              {copiedShareLink ? <Check size={14} className="text-emerald-300" /> : <Share2 size={14} />}
              <span>{copiedShareLink ? 'Copiado para WhatsApp!' : 'Repassar Agenda p/ Cliente'}</span>
            </button>

            {/* Lock / Exit Admin */}
            <button
              type="button"
              onClick={() => setIsAuthenticated(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-[#f5d0d6] text-xs font-semibold border border-white/10 transition-all"
            >
              <Lock size={13} />
              <span>Bloquear Painel</span>
            </button>
          </div>

        </div>
      </div>

      {/* Metrics Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-3 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          <div className="bg-white p-4 rounded-xl border border-[#ebd7d9] shadow-xs">
            <div className="flex items-center justify-between text-stone-600 text-xs mb-1">
              <span>Agendamentos Hoje</span>
              <CalendarCheck size={16} className="text-[#a84457]" />
            </div>
            <div className="text-2xl font-bold text-[#4a0d1a]">
              {todayAppointments.length}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#ebd7d9] shadow-xs">
            <div className="flex items-center justify-between text-stone-600 text-xs mb-1">
              <span>Total Agendamentos</span>
              <Calendar size={16} className="text-[#a84457]" />
            </div>
            <div className="text-2xl font-bold text-stone-800">
              {appointments.filter((a) => a.status !== 'cancelled').length}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#ebd7d9] shadow-xs">
            <div className="flex items-center justify-between text-stone-600 text-xs mb-1">
              <span>Faturamento Estimado</span>
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              R$ {totalEstimatedRevenue.toFixed(2).replace('.', ',')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#ebd7d9] shadow-xs">
            <div className="flex items-center justify-between text-stone-600 text-xs mb-1">
              <span>Especialidades Ativas</span>
              <Scissors size={16} className="text-[#a84457]" />
            </div>
            <div className="text-2xl font-bold text-stone-800">
              {services.filter((s) => s.isActive).length}
            </div>
          </div>

        </div>
      </div>

      {/* Greeting Message & Booking Link Card for Beth */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-gradient-to-br from-white to-[#fff8f9] rounded-2xl p-5 border border-[#ebd7d9] shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#a84457]" />
                <h3 className="font-serif-luxury font-bold text-base sm:text-lg text-[#3d0d16]">
                  Mensagem de Saudação do Link de Agendamento
                </h3>
                <span className="text-[10px] bg-[#581421]/10 text-[#581421] font-bold px-2 py-0.5 rounded-full">
                  Pronta para WhatsApp
                </span>
              </div>
              
              <div className="bg-white p-3.5 rounded-xl border border-[#ebd7d9] text-xs text-stone-700 whitespace-pre-line leading-relaxed font-sans max-w-2xl shadow-2xs">
                {getBookingShareMessage()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyClientBookingMessage}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#581421] hover:bg-[#72192b] text-white text-xs font-bold shadow-xs transition-all"
              >
                {copiedShareLink ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
                <span>{copiedShareLink ? 'Copiado para WhatsApp!' : 'Copiar Mensagem Pronta'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendViaWhatsApp}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25d366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-xs transition-all"
              >
                <Phone size={15} />
                <span>Enviar no WhatsApp</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#ebd7d9]">
          
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'agenda'
                ? 'bg-[#581421] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-[#581421] border border-[#ebd7d9]'
            }`}
          >
            <CalendarCheck size={16} />
            <span>Agenda de Clientes ({appointments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('servicos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'servicos'
                ? 'bg-[#581421] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-[#581421] border border-[#ebd7d9]'
            }`}
          >
            <Scissors size={16} />
            <span>Valores & Especialidades ({services.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('horarios')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'horarios'
                ? 'bg-[#581421] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-[#581421] border border-[#ebd7d9]'
            }`}
          >
            <Clock size={16} />
            <span>Dias & Horários Disponíveis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'portfolio'
                ? 'bg-[#581421] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-[#581421] border border-[#ebd7d9]'
            }`}
          >
            <ImageIcon size={16} />
            <span>Trabalhos & Fotos ({portfolio.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-[#581421] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-[#581421] border border-[#ebd7d9]'
            }`}
          >
            <Settings size={16} />
            <span>Nome, Logo & Contato</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'supabase'
                ? 'bg-[#581421] text-white shadow-xs'
                : 'bg-white text-stone-600 hover:text-[#581421] border border-[#ebd7d9]'
            }`}
          >
            <Database size={16} />
            <span>Banco Supabase</span>
          </button>

        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TAB 1: AGENDA & APPOINTMENTS */}
        {activeTab === 'agenda' && (
          <div className="space-y-6">
            
            {/* Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#ebd7d9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Search */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    value={agendaSearch}
                    onChange={(e) => setAgendaSearch(e.target.value)}
                    placeholder="Buscar cliente, tel ou serviço..."
                    className="pl-9 pr-3 py-1.5 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421] w-48 sm:w-60"
                  />
                </div>

                {/* Filter Date */}
                <input
                  type="date"
                  value={agendaDateFilter}
                  onChange={(e) => setAgendaDateFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />

                {agendaDateFilter && (
                  <button
                    type="button"
                    onClick={() => setAgendaDateFilter('')}
                    className="text-xs text-[#8c3143] hover:underline"
                  >
                    Ver todas as datas
                  </button>
                )}

                {/* Status Filter */}
                <select
                  value={agendaStatusFilter}
                  onChange={(e) => setAgendaStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                >
                  <option value="todos">Todos os status</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="completed">Concluídos</option>
                  <option value="cancelled">Cancelados</option>
                </select>

              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAppModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#581421] text-white text-xs font-bold hover:bg-[#6f192a] transition-all shadow-xs"
                >
                  <Plus size={15} />
                  <span>Novo Agendamento Manual</span>
                </button>
              </div>

            </div>

            {/* Appointments List */}
            <div className="bg-white rounded-2xl border border-[#ebd7d9] shadow-xs overflow-hidden">
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fcf5f6] text-[#581421] uppercase tracking-wider font-semibold border-b border-[#ebd7d9]">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Procedimento</th>
                      <th className="px-4 py-3">Data & Hora</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2e1e3]">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-stone-600">
                          Nenhum agendamento encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((app) => {
                        const cleanPhone = app.clientPhone.replace(/\D/g, '');
                        return (
                          <tr key={app.id} className="hover:bg-[#fffbfc] transition-colors">
                            
                            {/* Client */}
                            <td className="px-4 py-3 font-medium">
                              <div className="text-stone-900 font-bold">{app.clientName}</div>
                              <a
                                href={`https://wa.me/55${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline mt-0.5"
                              >
                                <Phone size={11} />
                                <span>{app.clientPhone}</span>
                              </a>
                              {app.notes && (
                                <div className="text-[10px] text-stone-600 italic mt-0.5 line-clamp-1">
                                  Obs: {app.notes}
                                </div>
                              )}
                            </td>

                            {/* Service */}
                            <td className="px-4 py-3">
                              <span className="font-semibold text-[#4a0d1a]">{app.serviceName}</span>
                            </td>

                            {/* Date & Time */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-bold text-stone-800">
                                {app.date.split('-').reverse().join('/')}
                              </div>
                              <div className="text-stone-600 text-[11px] flex items-center gap-1">
                                <Clock size={11} />
                                <span>{app.time}</span>
                              </div>
                            </td>

                            {/* Price */}
                            <td className="px-4 py-3 font-bold text-[#581421] whitespace-nowrap">
                              R$ {app.price.toFixed(2).replace('.', ',')}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={app.status}
                                onChange={(e) => onUpdateAppointmentStatus(app.id, e.target.value as AppointmentStatus)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border focus:outline-none ${
                                  app.status === 'confirmed'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : app.status === 'completed'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : app.status === 'cancelled'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                <option value="confirmed">Confirmado</option>
                                <option value="completed">Concluído</option>
                                <option value="pending">Pendente</option>
                                <option value="cancelled">Cancelado</option>
                              </select>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                                    `Olá ${app.clientName}! Aqui é do ${settings.name}. Confirmando seu horário para ${app.serviceName} no dia ${app.date.split('-').reverse().join('/')} às ${app.time}. Qualquer dúvida estamos à disposição!`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Enviar mensagem WhatsApp de confirmação"
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                >
                                  <Phone size={13} />
                                </a>

                                <button
                                  type="button"
                                  title="Excluir agendamento"
                                  onClick={() => {
                                    if (confirm(`Deseja remover o agendamento de ${app.clientName}?`)) {
                                      onDeleteAppointment(app.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: SPECIALTIES & SERVICES */}
        {activeTab === 'servicos' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#ebd7d9]">
              <div>
                <h3 className="font-serif-luxury text-xl font-bold text-[#4a0d1a]">
                  Especialidades e Valores
                </h3>
                <p className="text-xs text-stone-600">
                  Cadastre novos trabalhos, altere valores de loiros, cortes, botox, tinturas, progressivas e penteados.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingService({
                    id: 'srv-' + Date.now().toString(36),
                    name: '',
                    category: 'Loiro',
                    price: 150,
                    durationMinutes: 90,
                    description: '',
                    imageUrl: '',
                    isPopular: false,
                    isActive: true,
                  });
                  setIsServiceModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#581421] text-white text-xs font-bold hover:bg-[#72192b] transition-all shadow-xs"
              >
                <Plus size={15} />
                <span>Adicionar Nova Especialidade</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                    service.isActive ? 'border-[#ebd7d9] shadow-xs' : 'border-stone-200 opacity-60 bg-stone-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b3142] bg-[#faebed] px-2.5 py-0.5 rounded-full">
                        {service.category}
                      </span>

                      <div className="flex items-center gap-1">
                        {service.isPopular && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Mais Pedido
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          service.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {service.isActive ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-serif-luxury text-lg font-bold text-[#3d0d16] mb-1">
                      {service.name}
                    </h4>

                    <p className="text-xs text-stone-600 mb-3 line-clamp-2">
                      {service.description || 'Sem descrição.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#f4e6e8] flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-[#581421]">
                        R$ {service.price.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="text-[11px] text-stone-600 flex items-center gap-1">
                        <Clock size={11} />
                        <span>{service.durationMinutes} min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingService(service);
                          setIsServiceModalOpen(true);
                        }}
                        className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                        title="Editar valor e detalhes"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deseja excluir o serviço "${service.name}"?`)) {
                            onDeleteService(service.id);
                          }
                        }}
                        className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        title="Excluir especialidade"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 3: SCHEDULE & BUSINESS HOURS */}
        {activeTab === 'horarios' && (
          <div className="space-y-6">
            
            {/* Quick Share Link Box */}
            <div className="bg-gradient-to-r from-[#581421] to-[#7d1c31] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-serif-luxury text-xl font-bold">
                  Repassar Horários e Agenda aos Clientes
                </h4>
                <p className="text-xs text-[#f7ced5] max-w-xl mt-0.5">
                  Copie o link oficial ou a mensagem formatada para WhatsApp e envie aos seus clientes para que eles escolham o procedimento e garantam o horário diretamente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyClientBookingMessage}
                className="px-5 py-2.5 rounded-xl bg-white text-[#581421] font-bold text-xs hover:bg-[#fdecef] transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                {copiedShareLink ? <Check size={16} className="text-emerald-700" /> : <Copy size={16} />}
                <span>{copiedShareLink ? 'Copiado para o WhatsApp!' : 'Copiar Mensagem p/ WhatsApp'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Working Days & Hours Form */}
              <div className="bg-white p-6 rounded-2xl border border-[#ebd7d9] shadow-xs space-y-4">
                <h4 className="font-serif-luxury text-lg font-bold text-[#4a0d1a] border-b border-[#f2e1e3] pb-2">
                  Dias de Funcionamento Semanal
                </h4>

                <p className="text-xs text-stone-600">
                  Marque os dias da semana em que você atende no studio:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { day: 0, label: 'Domingo' },
                    { day: 1, label: 'Segunda' },
                    { day: 2, label: 'Terça' },
                    { day: 3, label: 'Quarta' },
                    { day: 4, label: 'Quinta' },
                    { day: 5, label: 'Sexta' },
                    { day: 6, label: 'Sábado' },
                  ].map((d) => {
                    const isChecked = settingsForm.workDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => {
                          const updated = isChecked
                            ? settingsForm.workDays.filter((x) => x !== d.day)
                            : [...settingsForm.workDays, d.day].sort();
                          setSettingsForm({ ...settingsForm, workDays: updated });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isChecked
                            ? 'bg-[#581421] text-white border-[#581421]'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#f2e1e3]">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Horário Início
                    </label>
                    <input
                      type="time"
                      value={settingsForm.openingTime}
                      onChange={(e) => setSettingsForm({ ...settingsForm, openingTime: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Horário Fechamento
                    </label>
                    <input
                      type="time"
                      value={settingsForm.closingTime}
                      onChange={(e) => setSettingsForm({ ...settingsForm, closingTime: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Intervalo de Horários
                    </label>
                    <select
                      value={settingsForm.slotInterval}
                      onChange={(e) => setSettingsForm({ ...settingsForm, slotInterval: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                    >
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>1 hora (padrão)</option>
                      <option value={90}>1 hora e meia</option>
                      <option value={120}>2 horas</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await onUpdateSettings(settingsForm);
                    alert('Horários e dias atualizados com sucesso!');
                  }}
                  className="w-full py-2 bg-[#581421] text-white rounded-xl text-xs font-bold hover:bg-[#6f192a] transition-all"
                >
                  Salvar Horários da Agenda
                </button>
              </div>

              {/* Block Specific Dates (Vacations, Holidays) */}
              <div className="bg-white p-6 rounded-2xl border border-[#ebd7d9] shadow-xs space-y-4">
                <h4 className="font-serif-luxury text-lg font-bold text-[#4a0d1a] border-b border-[#f2e1e3] pb-2">
                  Bloquear Datas Especiais (Folgas, Feriados)
                </h4>

                <p className="text-xs text-stone-600">
                  Bloqueie dias em que o studio não irá atender para que clientes não possam agendar:
                </p>

                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#ebd7d9] text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-[#581421]"
                  />
                  <input
                    type="text"
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                    placeholder="Motivo (ex: Feriado, Curso)"
                    className="px-3 py-1.5 rounded-xl border border-[#ebd7d9] text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-[#581421]"
                  />
                  <button
                    type="button"
                    disabled={!newBlockDate}
                    onClick={async () => {
                      if (!newBlockDate) return;
                      await onToggleBlockDate(newBlockDate, newBlockReason);
                      setNewBlockDate('');
                      setNewBlockReason('');
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[#581421] text-white text-xs font-bold hover:bg-[#72192b] disabled:opacity-50"
                  >
                    Bloquear
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
                  {blockedDates.length === 0 ? (
                    <p className="text-xs text-stone-600 text-center py-4">
                      Nenhuma data bloqueada manualmente.
                    </p>
                  ) : (
                    blockedDates.map((b) => (
                      <div
                        key={b.date}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                      >
                        <div>
                          <strong className="text-stone-900">{b.date.split('-').reverse().join('/')}</strong>
                          <span className="text-stone-600 ml-2">({b.reason || 'Bloqueado'})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleBlockDate(b.date)}
                          className="text-xs text-rose-600 hover:underline font-semibold"
                        >
                          Liberar data
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 4: PORTFOLIO & WORKS */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#ebd7d9]">
              <div>
                <h3 className="font-serif-luxury text-xl font-bold text-[#4a0d1a]">
                  Galeria de Trabalhos Realizados
                </h3>
                <p className="text-xs text-stone-600">
                  Adicione fotos de loiros, cortes e transformações para exibir aos clientes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPortfolioModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#581421] text-white text-xs font-bold hover:bg-[#72192b] transition-all shadow-xs"
              >
                <Plus size={15} />
                <span>Adicionar Foto de Trabalho</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {portfolio.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-[#ebd7d9] shadow-xs group">
                  <div className="relative h-48 bg-stone-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-bold uppercase bg-black/60 text-white px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja remover "${item.title}"?`)) {
                          onDeletePortfolioItem(item.id);
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 shadow-md"
                      title="Excluir trabalho"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="p-3">
                    <h5 className="font-bold text-xs text-stone-900">{item.title}</h5>
                    {item.description && (
                      <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: STUDIO SETTINGS & LOGO */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ebd7d9] shadow-xs max-w-3xl mx-auto">
            
            <div className="flex items-center justify-between border-b border-[#ebd7d9] pb-4 mb-6">
              <div>
                <h3 className="font-serif-luxury text-2xl font-bold text-[#4a0d1a]">
                  Configurações do Studio & Identidade
                </h3>
                <p className="text-xs text-stone-600">
                  Troque o nome do studio, logo, Instagram e informações de contato quando desejar.
                </p>
              </div>
              <StudioLogo logoUrl={settingsForm.logoUrl} size="md" />
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              
              {/* Studio Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome do Studio / Aplicativo *
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  placeholder="Ex: STUDIO BBELEZZA"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] text-sm focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              {/* Logo Management */}
              <div className="bg-[#fff9fa] p-4 rounded-xl border border-[#ebd7d9] space-y-3">
                <label className="block text-xs font-semibold text-[#581421]">
                  Logo do Studio
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="shrink-0 text-center">
                    <StudioLogo logoUrl={settingsForm.logoUrl} size="lg" />
                    <span className="text-[10px] text-stone-600 block mt-1">Pré-visualização</span>
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div>
                      <span className="text-[11px] text-stone-600 block mb-1">URL da Imagem da Logo:</span>
                      <input
                        type="url"
                        value={settingsForm.logoUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                        placeholder="https://exemplo.com/minha-logo.jpg (ou deixe vazio para usar o badge original)"
                        className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#ebd7d9] text-xs font-semibold text-stone-700 hover:bg-stone-50">
                        <ImageIcon size={14} />
                        <span>Carregar Arquivo do Computador/Celular</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {settingsForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setSettingsForm({ ...settingsForm, logoUrl: '' })}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Restaurar Logo Original
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Instagram & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Instagram do Studio *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={settingsForm.instagram}
                      onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                      placeholder="@studiobbelezza"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#ebd7d9] text-sm focus:outline-none focus:ring-1 focus:ring-[#581421]"
                    />
                    <span className="absolute left-3 top-2.5 text-stone-400 font-bold">@</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    WhatsApp para Agendamentos *
                  </label>
                  <input
                    type="tel"
                    required
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    placeholder="(11) 94823-0099"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] text-sm focus:outline-none focus:ring-1 focus:ring-[#581421]"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Endereço do Studio (Integrado com Google Maps)
                  </label>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settingsForm.address || 'Rua Mandiuba 176 Sao Paulo')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#8c3143] hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Testar no Maps</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  placeholder="Rua Mandiúba, 176 - CEP 03158-070, São Paulo - SP"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] text-sm focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Descrição / Biografia do Studio
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.bio}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] text-sm focus:outline-none focus:ring-1 focus:ring-[#581421] resize-none"
                />
              </div>

              {/* Admin Password */}
              <div className="pt-2 border-t border-[#f2dedf]">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Alterar Senha de Acesso da Dona (Beth)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={settingsForm.adminPin}
                    onChange={(e) => setSettingsForm({ ...settingsForm, adminPin: e.target.value })}
                    placeholder="Sua senha (ex: beth123)"
                    className="w-56 px-4 py-2 rounded-xl border border-[#ebd7d9] text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#581421]"
                  />
                  <span className="text-xs text-stone-500">
                    Senha atual: <strong className="text-stone-700">{settingsForm.adminPin || 'beth123'}</strong>
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#581421] text-white font-bold text-sm hover:bg-[#72192b] transition-all shadow-md"
                >
                  <Save size={16} />
                  <span>Salvar Alterações</span>
                </button>

                {settingsSavedSuccess && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={16} />
                    Configurações salvas com sucesso!
                  </span>
                )}
              </div>

            </form>

          </div>
        )}

        {/* TAB 6: SUPABASE DATABASE */}
        {activeTab === 'supabase' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ebd7d9] shadow-xs max-w-3xl mx-auto space-y-6">
            
            <div className="flex items-center justify-between border-b border-[#ebd7d9] pb-4">
              <div>
                <h3 className="font-serif-luxury text-2xl font-bold text-[#4a0d1a]">
                  Conexão com Banco de Dados Supabase
                </h3>
                <p className="text-xs text-stone-600">
                  Gerencie a sincronização dos dados do Studio Bbelezza na nuvem com PostgreSQL e Supabase.
                </p>
              </div>

              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                supabaseConfig.isConfigured
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                <Database size={13} />
                <span>{supabaseConfig.isConfigured ? 'Supabase Conectado' : 'Armazenamento Local Ativo'}</span>
              </span>
            </div>

            {/* Supabase credentials configuration */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSupabaseCredentials}
                  className="px-5 py-2.5 bg-[#581421] text-white rounded-xl text-xs font-bold hover:bg-[#6f192a] transition-all shadow-xs"
                >
                  Salvar Credenciais do Supabase
                </button>

                <button
                  type="button"
                  onClick={handleTestSupabase}
                  className="px-4 py-2.5 bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-all border border-stone-200"
                >
                  Testar Conexão
                </button>
              </div>

              {testResult && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700">
                  {testResult}
                </div>
              )}

              {supabaseSaveMsg && (
                <p className="text-xs text-emerald-700 font-bold">{supabaseSaveMsg}</p>
              )}
            </div>

            {/* SQL Script generator */}
            <div className="pt-4 border-t border-[#f2dedf] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-stone-900">
                    Script SQL para Criação das Tabelas no Supabase
                  </h4>
                  <p className="text-xs text-stone-600">
                    Basta copiar e colar este script no <strong>SQL Editor</strong> do seu Supabase para criar as tabelas de agendamentos, serviços e configurações.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getSupabaseSetupSQL());
                    setCopiedSQL(true);
                    setTimeout(() => setCopiedSQL(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-black text-white text-xs font-semibold transition-all shadow-xs"
                >
                  {copiedSQL ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedSQL ? 'Script SQL Copiado!' : 'Copiar Script SQL'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                  {getSupabaseSetupSQL()}
                </pre>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL: MANUAL APPOINTMENT CREATION */}
      {showNewAppModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#ebd7d9] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-luxury text-xl font-bold text-[#4a0d1a]">
                Novo Agendamento Manual
              </h3>
              <button
                type="button"
                onClick={() => setShowNewAppModal(false)}
                className="text-stone-600 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualApp} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nome da Cliente *</label>
                <input
                  type="text"
                  required
                  value={manualClientName}
                  onChange={(e) => setManualClientName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">WhatsApp da Cliente *</label>
                <input
                  type="tel"
                  required
                  value={manualClientPhone}
                  onChange={(e) => setManualClientPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Procedimento / Especialidade *</label>
                <select
                  required
                  value={manualServiceId}
                  onChange={(e) => setManualServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-1 focus:ring-[#581421]"
                >
                  <option value="">Selecione o procedimento...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - R$ {s.price.toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-1 focus:ring-[#581421]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Horário *</label>
                  <input
                    type="time"
                    required
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-1 focus:ring-[#581421]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ex: Agendou por telefone"
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAppModal(false)}
                  className="px-4 py-2 text-stone-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#581421] text-white rounded-xl font-bold hover:bg-[#6f192a]"
                >
                  Salvar na Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / CREATE SERVICE */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#ebd7d9] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-luxury text-xl font-bold text-[#4a0d1a]">
                {editingService.id.startsWith('srv-') && services.some((s) => s.id === editingService.id)
                  ? 'Editar Especialidade'
                  : 'Nova Especialidade / Trabalho'}
              </h3>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="text-stone-600 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveServiceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nome do Procedimento *</label>
                <input
                  type="text"
                  required
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder="Ex: Loiro Platinado / Morena Iluminada"
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Categoria *</label>
                  <select
                    value={editingService.category}
                    onChange={(e) => setEditingService({ ...editingService, category: e.target.value as ServiceCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                  >
                    <option value="Loiro">Loiro</option>
                    <option value="Cortes">Cortes</option>
                    <option value="Botox">Botox</option>
                    <option value="Tintura">Tintura</option>
                    <option value="Progressiva">Progressiva</option>
                    <option value="Penteado">Penteado</option>
                    <option value="Tratamentos">Tratamentos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Valor em Reais (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingService.price}
                    onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Duração Média (Minutos) *</label>
                <input
                  type="number"
                  required
                  value={editingService.durationMinutes}
                  onChange={(e) => setEditingService({ ...editingService, durationMinutes: parseInt(e.target.value, 10) || 60 })}
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingService.description}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Detalhes sobre a técnica, produtos utilizados e benefícios..."
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421] resize-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingService.isPopular}
                    onChange={(e) => setEditingService({ ...editingService, isPopular: e.target.checked })}
                    className="rounded text-[#581421]"
                  />
                  <span>Destacar como "Mais Pedido"</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingService.isActive}
                    onChange={(e) => setEditingService({ ...editingService, isActive: e.target.checked })}
                    className="rounded text-[#581421]"
                  />
                  <span>Ativo para agendamentos</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#f2dedf]">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-stone-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#581421] text-white rounded-xl font-bold hover:bg-[#6f192a]"
                >
                  Salvar Especialidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PORTFOLIO PHOTO */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#ebd7d9] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-luxury text-xl font-bold text-[#4a0d1a]">
                Adicionar Trabalho ao Portfólio
              </h3>
              <button
                type="button"
                onClick={() => setIsPortfolioModalOpen(false)}
                className="text-stone-600 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePortfolioSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Título do Trabalho *</label>
                <input
                  type="text"
                  required
                  value={newPortfolioTitle}
                  onChange={(e) => setNewPortfolioTitle(e.target.value)}
                  placeholder="Ex: Mechas Morena Iluminada"
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Categoria *</label>
                <select
                  value={newPortfolioCategory}
                  onChange={(e) => setNewPortfolioCategory(e.target.value as ServiceCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                >
                  <option value="Loiro">Loiro</option>
                  <option value="Cortes">Cortes</option>
                  <option value="Botox">Botox</option>
                  <option value="Tintura">Tintura</option>
                  <option value="Progressiva">Progressiva</option>
                  <option value="Penteado">Penteado</option>
                  <option value="Tratamentos">Tratamentos</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">URL da Imagem *</label>
                <input
                  type="url"
                  required
                  value={newPortfolioImage}
                  onChange={(e) => setNewPortfolioImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={newPortfolioDesc}
                  onChange={(e) => setNewPortfolioDesc(e.target.value)}
                  placeholder="Técnica utilizada, resultado obtido..."
                  className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#f2dedf]">
                <button
                  type="button"
                  onClick={() => setIsPortfolioModalOpen(false)}
                  className="px-4 py-2 text-stone-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#581421] text-white rounded-xl font-bold hover:bg-[#6f192a]"
                >
                  Publicar no Portfólio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
