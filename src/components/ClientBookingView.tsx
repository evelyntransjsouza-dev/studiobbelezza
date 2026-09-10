import React, { useState, useMemo } from 'react';
import { StudioSettings, Service, Appointment, BlockedDate, PortfolioItem, ServiceCategory } from '../types';
import { StudioLogo } from './StudioLogo';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Instagram, 
  Phone, 
  MapPin, 
  ArrowRight, 
  ChevronLeft, 
  Search, 
  CalendarPlus,
  AlertCircle,
  Scissors,
  Lock,
  Navigation,
  Compass,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClientBookingViewProps {
  settings: StudioSettings;
  services: Service[];
  appointments: Appointment[];
  blockedDates: BlockedDate[];
  portfolio: PortfolioItem[];
  onCreateAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<Appointment>;
  onOpenOwner?: () => void;
}

export const ClientBookingView: React.FC<ClientBookingViewProps> = ({
  settings,
  services,
  appointments,
  blockedDates,
  portfolio,
  onCreateAppointment,
  onOpenOwner,
}) => {
  // Booking state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search client appointments modal
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResults, setLookupResults] = useState<Appointment[] | null>(null);

  // Address copy feedback
  const [copiedAddress, setCopiedAddress] = useState(false);
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(settings.address || 'Rua Mandiúba, 176 - CEP 03158-070, São Paulo - SP');
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Active services only
  const activeServices = useMemo(() => {
    return services.filter((s) => s.isActive);
  }, [services]);

  const categories: (ServiceCategory | 'Todos')[] = [
    'Todos',
    'Loiro',
    'Cortes',
    'Botox',
    'Tintura',
    'Progressiva',
    'Penteado',
    'Tratamentos',
  ];

  const filteredServices = useMemo(() => {
    if (categoryFilter === 'Todos') return activeServices;
    return activeServices.filter((s) => s.category === categoryFilter);
  }, [activeServices, categoryFilter]);

  // Generate next 21 days for booking selection
  const availableDates = useMemo(() => {
    const dates: { dateString: string; label: string; weekday: string; isBlocked: boolean; dayNumber: number }[] = [];
    const today = new Date();

    for (let i = 0; i < 21; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat

      const isWorkDay = settings.workDays.includes(dayOfWeek);
      const isDateBlockedByOwner = blockedDates.some((b) => b.date === dateString);

      const weekdaysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      dates.push({
        dateString,
        label: `${day}/${month}`,
        weekday: weekdaysMap[dayOfWeek],
        dayNumber: d.getDate(),
        isBlocked: !isWorkDay || isDateBlockedByOwner,
      });
    }
    return dates;
  }, [settings.workDays, blockedDates]);

  // Generate time slots based on openingTime, closingTime and slotInterval
  const availableSlotsForDate = useMemo(() => {
    if (!selectedDate) return [];

    const slots: { time: string; isTaken: boolean }[] = [];
    const [startH, startM] = settings.openingTime.split(':').map(Number);
    const [endH, endM] = settings.closingTime.split(':').map(Number);

    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);
    const interval = settings.slotInterval || 60;

    // Filter appointments on this date that are not cancelled
    const bookedOnDate = appointments
      .filter((a) => a.date === selectedDate && a.status !== 'cancelled')
      .map((a) => a.time);

    for (let m = startMinutes; m < endMinutes; m += interval) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      const isTaken = bookedOnDate.includes(timeStr);
      slots.push({ time: timeStr, isTaken });
    }

    return slots;
  }, [selectedDate, settings.openingTime, settings.closingTime, settings.slotInterval, appointments]);

  // Handle appointment submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newApp = await onCreateAppointment({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        price: selectedService.price,
        date: selectedDate,
        time: selectedTime,
        status: 'confirmed',
        notes: clientNotes.trim() || undefined,
      });

      setConfirmedAppointment(newApp);
      setCurrentStep(4);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#581421', '#d99fa6', '#e6c280', '#ffffff'],
      });
    } catch (err) {
      console.error('Erro ao agendar:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookup = () => {
    const clean = lookupPhone.replace(/\D/g, '');
    if (!clean) return;
    const found = appointments.filter((a) => a.clientPhone.replace(/\D/g, '').includes(clean));
    setLookupResults(found);
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientNotes('');
    setConfirmedAppointment(null);
    setCurrentStep(1);
  };

  const cleanInstagram = settings.instagram.replace(/^@/, '');
  const cleanPhone = settings.phone.replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-[#faf7f5] pb-24 text-[#2b2b2b]">
      
      {/* Hero Banner with Studio Identity */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#4e101d] via-[#5c1323] to-[#3a0b15] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-[#782233]">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#8c263c]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#f3c2c7]/10 blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          
          <div className="flex justify-center mb-5">
            <StudioLogo logoUrl={settings.logoUrl} size="xl" className="shadow-2xl ring-4 ring-[#e5a8ae]/30" />
          </div>

          <h1 className="font-serif-luxury text-3xl sm:text-5xl font-bold tracking-wider text-[#fdecef] mb-3">
            {settings.name || 'STUDIO BBELEZZA'}
          </h1>

          <p className="text-sm sm:text-base text-[#f0cad0] max-w-xl mx-auto mb-6 leading-relaxed">
            {settings.bio || 'Especialistas em loiros perfeitos, cortes sofisticados, botox, tinturas, progressivas e penteados marcantes.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
            <a
              href={`https://instagram.com/${cleanInstagram}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-[#ffe5e8] border border-white/15 backdrop-blur-xs transition-all shadow-xs"
            >
              <Instagram size={16} className="text-[#f7b5be]" />
              <span>@{cleanInstagram}</span>
            </a>

            {settings.phone && (
              <a
                href={`https://wa.me/55${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#25d366]/20 hover:bg-[#25d366]/30 text-emerald-200 border border-[#25d366]/30 transition-all shadow-xs"
              >
                <Phone size={15} />
                <span>WhatsApp: {settings.phone}</span>
              </a>
            )}

            <a
              href="#localizacao"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-[#ffe5e8] border border-white/15 backdrop-blur-xs transition-all shadow-xs"
            >
              <MapPin size={15} className="text-[#f7b5be]" />
              <span>Rua Mandiúba, 176 (Maps)</span>
            </a>

            <button
              type="button"
              onClick={() => setShowLookupModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#fcebee] text-[#4d101e] font-semibold hover:bg-white transition-all shadow-xs"
            >
              <Search size={15} />
              <span>Consultar Agendamento</span>
            </button>
          </div>

        </div>
      </section>

      {/* Main Booking Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        
        {/* Welcoming Greeting Card */}
        <div className="bg-gradient-to-r from-[#fff5f6] to-[#fff0f2] rounded-2xl p-5 border border-[#ebd7d9] shadow-xs mb-6 flex items-start gap-3.5 sm:gap-4">
          <div className="w-10 h-10 rounded-full bg-[#581421] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Sparkles size={20} className="text-[#fcd0d7]" />
          </div>
          <div className="text-xs sm:text-sm text-[#4d101e] space-y-1">
            <h2 className="font-bold font-serif-luxury text-base sm:text-lg text-[#3d0d16]">
              ✨ Olá! Seja muito bem-vinda ao {settings.name || 'Studio B Beleza'}! 💖
            </h2>
            <p className="text-stone-700 leading-relaxed">
              Para agendar seu atendimento, é super fácil! 🥰 Escolha o serviço, dia e horário que deseja. Será um prazer receber você! 💕✨
            </p>
          </div>
        </div>

        {/* Multi-step progress bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#f0dadc] p-4 sm:p-5 mb-8">
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
            
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 transition-colors ${
                currentStep >= 1 ? 'text-[#581421] font-bold' : 'text-stone-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep >= 1 ? 'bg-[#581421] text-white' : 'bg-stone-100 text-stone-500'
              }`}>
                1
              </span>
              <span>Procedimento</span>
            </button>

            <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${currentStep >= 2 ? 'bg-[#581421]' : 'bg-stone-200'}`} />

            {/* Step 2 */}
            <button
              type="button"
              disabled={!selectedService}
              onClick={() => selectedService && setCurrentStep(2)}
              className={`flex items-center gap-2 transition-colors ${
                currentStep >= 2 ? 'text-[#581421] font-bold' : 'text-stone-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep >= 2 ? 'bg-[#581421] text-white' : 'bg-stone-100 text-stone-500'
              }`}>
                2
              </span>
              <span>Data & Hora</span>
            </button>

            <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${currentStep >= 3 ? 'bg-[#581421]' : 'bg-stone-200'}`} />

            {/* Step 3 */}
            <button
              type="button"
              disabled={!selectedDate || !selectedTime}
              onClick={() => selectedDate && selectedTime && setCurrentStep(3)}
              className={`flex items-center gap-2 transition-colors ${
                currentStep >= 3 ? 'text-[#581421] font-bold' : 'text-stone-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep >= 3 ? 'bg-[#581421] text-white' : 'bg-stone-100 text-stone-500'
              }`}>
                3
              </span>
              <span>Seus Dados</span>
            </button>

          </div>
        </div>

        {/* STEP 1: SELECT PROCEDURE / SPECIALTY */}
        {currentStep === 1 && (
          <div className="space-y-6">
            
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? 'bg-[#581421] text-white shadow-xs'
                      : 'bg-white text-[#581421] border border-[#ebd7d9] hover:bg-[#fdf2f4]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* List of Services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredServices.map((service) => {
                const isSelected = selectedService?.id === service.id;
                return (
                  <div
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      setCurrentStep(2);
                    }}
                    className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                      isSelected
                        ? 'border-[#581421] ring-2 ring-[#581421]/20 bg-[#fffafb]'
                        : 'border-[#ebd7d9] hover:border-[#c57987]'
                    }`}
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b3142] bg-[#faebed] px-2.5 py-0.5 rounded-full">
                          {service.category}
                        </span>
                        {service.isPopular && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Sparkles size={11} className="text-amber-600" />
                            Mais Pedido
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif-luxury text-xl font-bold text-[#3d0d16] mb-1">
                        {service.name}
                      </h3>

                      <p className="text-xs text-stone-600 mb-4 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#f4e6e8] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-stone-600">A partir de</div>
                        <div className="text-lg sm:text-xl font-bold text-[#581421]">
                          R$ {service.price.toFixed(2).replace('.', ',')}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center gap-1 text-xs text-stone-600">
                          <Clock size={13} />
                          <span>{service.durationMinutes} min</span>
                        </div>

                        <button
                          type="button"
                          className="px-3.5 py-1.5 rounded-full bg-[#581421] text-white text-xs font-semibold hover:bg-[#6f192a] transition-all flex items-center gap-1"
                        >
                          <span>Agendar</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredServices.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#ebd7d9]">
                <Scissors className="w-10 h-10 text-[#a84457] mx-auto mb-2 opacity-50" />
                <p className="text-stone-600 text-sm">Nenhum serviço disponível nesta categoria no momento.</p>
              </div>
            )}

          </div>
        )}

        {/* STEP 2: SELECT DATE AND TIME */}
        {currentStep === 2 && selectedService && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ebd7d9] shadow-sm space-y-6">
            
            {/* Selected Service Recap */}
            <div className="flex items-center justify-between bg-[#fdf4f5] p-4 rounded-xl border border-[#ebd7d9]">
              <div>
                <span className="text-xs font-medium text-[#8c3143]">Procedimento Selecionado:</span>
                <h4 className="font-serif-luxury text-lg font-bold text-[#4a0d1a]">
                  {selectedService.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-stone-600 mt-0.5">
                  <span className="font-semibold text-[#581421]">R$ {selectedService.price.toFixed(2).replace('.', ',')}</span>
                  <span>•</span>
                  <span>{selectedService.durationMinutes} minutos</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-[#8c3143] hover:underline"
              >
                Trocar
              </button>
            </div>

            {/* 1. Date selector */}
            <div>
              <label className="block text-sm font-semibold text-[#3d0d16] mb-3 flex items-center gap-1.5">
                <Calendar size={16} className="text-[#a84457]" />
                <span>Escolha o Dia para o seu Atendimento:</span>
              </label>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {availableDates.map((item) => {
                  const isSelected = selectedDate === item.dateString;
                  return (
                    <button
                      key={item.dateString}
                      type="button"
                      disabled={item.isBlocked}
                      onClick={() => {
                        setSelectedDate(item.dateString);
                        setSelectedTime(''); // reset time on day change
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                        item.isBlocked
                          ? 'bg-stone-50 border-stone-200 text-stone-600 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-[#581421] text-white border-[#581421] shadow-sm scale-102'
                          : 'bg-white border-[#ebd7d9] text-[#3d0d16] hover:border-[#a84457] hover:bg-[#fff9fa]'
                      }`}
                    >
                      <span className="text-[11px] font-medium uppercase">{item.weekday}</span>
                      <span className="text-base font-bold my-0.5">{item.dayNumber}</span>
                      <span className="text-[10px] opacity-75">
                        {item.isBlocked ? 'Indisp.' : 'Livre'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-600 mt-2">
                * Dias cinzas indicam folga do studio ou datas já preenchidas/bloqueadas pela dona.
              </p>
            </div>

            {/* 2. Time selector */}
            {selectedDate && (
              <div>
                <label className="block text-sm font-semibold text-[#3d0d16] mb-3 flex items-center gap-1.5">
                  <Clock size={16} className="text-[#a84457]" />
                  <span>Escolha o Horário Disponível:</span>
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {availableSlotsForDate.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={slot.isTaken}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                          slot.isTaken
                            ? 'bg-stone-100 border-stone-200 text-stone-600 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-[#581421] text-white border-[#581421] shadow-sm'
                            : 'bg-white border-[#ebd7d9] text-[#4a0d1a] hover:border-[#a84457] hover:bg-[#fff9fa]'
                        }`}
                      >
                        <span>{slot.time}</span>
                        {slot.isTaken && <span className="text-[10px] font-normal">(Ocupado)</span>}
                      </button>
                    );
                  })}
                </div>

                {availableSlotsForDate.every((s) => s.isTaken) && (
                  <div className="p-4 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center gap-2 mt-3">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <span>Todos os horários desta data já foram preenchidos. Por favor, selecione outro dia no calendário acima.</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#f0dadc]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                <ChevronLeft size={16} />
                <span>Voltar aos procedimentos</span>
              </button>

              <button
                type="button"
                disabled={!selectedDate || !selectedTime}
                onClick={() => setCurrentStep(3)}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  selectedDate && selectedTime
                    ? 'bg-[#581421] text-white hover:bg-[#70192a] shadow-md'
                    : 'bg-stone-200 text-stone-600 cursor-not-allowed'
                }`}
              >
                <span>Avançar para Seus Dados</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        )}

        {/* STEP 3: CLIENT DETAILS FORM */}
        {currentStep === 3 && selectedService && selectedDate && selectedTime && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ebd7d9] shadow-sm">
            
            <h3 className="font-serif-luxury text-2xl font-bold text-[#3d0d16] mb-1">
              Finalize seu Agendamento
            </h3>
            <p className="text-xs text-stone-600 mb-6">
              Informe seu nome e WhatsApp para garantirmos seu horário no {settings.name}.
            </p>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              
              {/* Summary Card */}
              <div className="bg-[#fff9fa] rounded-xl p-4 border border-[#f0dadc] space-y-1.5 text-xs text-stone-700">
                <div className="flex justify-between">
                  <span className="text-stone-600">Procedimento:</span>
                  <span className="font-bold text-[#581421]">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Data & Horário:</span>
                  <span className="font-semibold text-stone-900">
                    {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Duração estimada:</span>
                  <span>{selectedService.durationMinutes} minutos</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-[#f2dedf] font-bold text-[#4a0d1a]">
                  <span>Valor:</span>
                  <span>R$ {selectedService.price.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Maria Eduarda Silva"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-2 focus:ring-[#581421]/20 focus:border-[#581421] text-sm"
                />
              </div>

              {/* WhatsApp Phone */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  WhatsApp com DDD * (Para confirmação e lembrete)
                </label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-2 focus:ring-[#581421]/20 focus:border-[#581421] text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Observações sobre seu cabelo (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Ex: Tenho tintura recente nas pontas, cabelo volumoso, quero clarear bastante..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ebd7d9] focus:outline-none focus:ring-2 focus:ring-[#581421]/20 focus:border-[#581421] text-sm resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#f0dadc]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  <ChevronLeft size={16} />
                  <span>Voltar para horário</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#581421] hover:bg-[#72192b] text-white text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Confirmando horário...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirmar Meu Horário</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {currentStep === 4 && confirmedAppointment && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#ebd7d9] shadow-md text-center space-y-5 animate-in fade-in zoom-in duration-300">
            
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="font-serif-luxury text-3xl font-bold text-[#3d0d16]">
              Agendamento Confirmado!
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
              Parabéns, <strong className="text-stone-900">{confirmedAppointment.clientName}</strong>! Seu horário foi garantido na agenda do {settings.name}.
            </p>

            {/* Booking Details Card */}
            <div className="bg-[#fff8f9] rounded-2xl p-5 border border-[#ebd7d9] text-left max-w-md mx-auto space-y-2 text-xs">
              <div className="flex justify-between border-b border-[#f4e2e4] pb-2">
                <span className="text-stone-600">Código do Agendamento:</span>
                <span className="font-mono font-bold text-[#581421]">{confirmedAppointment.id.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Procedimento:</span>
                <span className="font-bold text-stone-900">{confirmedAppointment.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Data & Horário:</span>
                <span className="font-bold text-[#581421]">
                  {confirmedAppointment.date.split('-').reverse().join('/')} às {confirmedAppointment.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Valor Estimado:</span>
                <span className="font-bold text-stone-900">R$ {confirmedAppointment.price.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Status:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} />
                  Garantido na Agenda
                </span>
              </div>
            </div>

            {/* Studio Location & Google Maps Card for Client */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ebd7d9] text-left max-w-md mx-auto space-y-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#581421] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <MapPin size={18} className="text-[#fcd0d7]" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-bold text-[#a84457] tracking-wider">Local do Atendimento</span>
                  <h4 className="font-bold text-xs sm:text-sm text-[#3d0d16]">Rua Mandiúba, 176</h4>
                  <p className="text-[11px] text-stone-600">CEP 03158-070 • São Paulo - SP</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Rua+Mandiuba+176+03158-070+Sao+Paulo+SP"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#581421] hover:bg-[#72192b] text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Navigation size={14} className="text-[#fcd0d7]" />
                  <span>Traçar Rota no Google Maps</span>
                </a>

                <a
                  href="https://waze.com/ul?q=Rua+Mandiuba+176+Sao+Paulo&navigate=yes"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition-all"
                >
                  <Compass size={14} className="text-sky-600" />
                  <span>Waze</span>
                </a>
              </div>
            </div>

            {/* Direct WhatsApp Action to Studio */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                  `Olá ${settings.name}! Acabei de agendar meu procedimento *${confirmedAppointment.serviceName}* para o dia *${confirmedAppointment.date.split('-').reverse().join('/')}* às *${confirmedAppointment.time}*. Meu nome é ${confirmedAppointment.clientName}. (Código: ${confirmedAppointment.id})\n\n📍 Local: Rua Mandiúba, 176 - CEP 03158-070, São Paulo - SP\n🗺️ Maps: https://maps.google.com/?q=Rua+Mandiuba+176+03158-070+Sao+Paulo`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#25d366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-md transition-all"
              >
                <Phone size={16} />
                <span>Avisar no WhatsApp do Studio</span>
              </a>

              <button
                type="button"
                onClick={resetBooking}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-[#ebd7d9] text-[#581421] font-semibold text-xs hover:bg-[#fdf4f5] transition-all"
              >
                <CalendarPlus size={15} />
                <span>Novo Agendamento</span>
              </button>
            </div>

          </div>
        )}

        {/* Studio Works Portfolio Section */}
        {portfolio.length > 0 && (
          <section className="mt-16 pt-8 border-t border-[#ebd7d9]">
            <div className="text-center mb-8">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8c3143] bg-[#f9eaec] px-3 py-1 rounded-full">
                Transformações Reais
              </span>
              <h2 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-[#3d0d16] mt-2 mb-1">
                Trabalhos do Studio
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                Confira alguns dos resultados de loiros, cortes, botox e penteados feitos com amor no {settings.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {portfolio.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden border border-[#ebd7d9] shadow-xs group hover:shadow-md transition-all"
                >
                  <div className="relative h-48 overflow-hidden bg-stone-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-bold uppercase bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5">
                    <h4 className="font-serif-luxury font-bold text-sm text-[#3d0d16] mb-1">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-[11px] text-stone-600 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-6">
              <a
                href={`https://instagram.com/${cleanInstagram}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#8c3143] hover:text-[#52111d] hover:underline"
              >
                <Instagram size={15} />
                <span>Ver mais fotos e vídeos no @{cleanInstagram}</span>
              </a>
            </div>
          </section>
        )}

        {/* Studio Location & Google Maps Section */}
        <section id="localizacao" className="mt-16 pt-8 border-t border-[#ebd7d9] scroll-mt-24">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8c3143] bg-[#f9eaec] px-3 py-1 rounded-full">
              <MapPin size={13} className="text-[#a84457]" />
              Localização & Como Chegar
            </span>
            <h2 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-[#3d0d16] mt-2 mb-1">
              Como Chegar ao {settings.name}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
              Veja nossa localização no Google Maps e venha cuidar da sua beleza no nosso espaço.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#ebd7d9] shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              
              {/* Left Column: Address Info & Interactive Navigation Buttons */}
              <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between space-y-6 bg-gradient-to-b from-[#fffbfc] to-white border-b lg:border-b-0 lg:border-r border-[#ebd7d9]">
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#581421] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <MapPin size={22} className="text-[#fcd0d7]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a84457]">
                        Endereço do Studio
                      </span>
                      <h3 className="font-serif-luxury text-lg sm:text-xl font-bold text-[#3d0d16] leading-snug">
                        Rua Mandiúba, 176
                      </h3>
                      <p className="text-xs text-stone-600 font-medium mt-0.5">
                        CEP 03158-070 • São Paulo - SP
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#fcf4f5] rounded-xl border border-[#ebd7d9] text-xs text-stone-700 space-y-1.5">
                    <p className="font-semibold text-[#581421] flex items-center gap-1.5">
                      <Clock size={13} />
                      Horários de Atendimento
                    </p>
                    <p className="text-[11px] text-stone-600">
                      Terça a Sábado: {settings.openingTime} às {settings.closingTime}
                    </p>
                    <p className="text-[11px] text-stone-500 pt-1 border-t border-[#ebd7d9]">
                      ✨ Espaço aconchegante com recepção e fácil acesso.
                    </p>
                  </div>
                </div>

                {/* Navigation Buttons for Client */}
                <div className="space-y-2 pt-2">
                  {/* Primary Google Maps Button */}
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Rua+Mandiuba+176+03158-070+Sao+Paulo+SP"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#581421] hover:bg-[#72192b] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all"
                  >
                    <Navigation size={15} className="text-[#fcd0d7]" />
                    <span>Abrir no Google Maps</span>
                    <ExternalLink size={13} className="opacity-70" />
                  </a>

                  {/* Route GPS Button */}
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Rua+Mandiuba+176+03158-070+Sao+Paulo+SP"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#fff0f2] hover:bg-[#ffe5e8] text-[#581421] border border-[#ebd7d9] text-xs font-bold transition-all"
                  >
                    <Compass size={14} className="text-[#a84457]" />
                    <span>Traçar Rota até o Studio (GPS)</span>
                  </a>

                  <div className="flex gap-2">
                    {/* Waze Button */}
                    <a
                      href="https://waze.com/ul?q=Rua+Mandiuba+176+Sao+Paulo&navigate=yes"
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-all"
                    >
                      <Compass size={13} className="text-sky-600" />
                      <span>Abrir no Waze</span>
                    </a>

                    {/* Copy Address Button */}
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all"
                    >
                      {copiedAddress ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedAddress ? 'Copiado!' : 'Copiar Endereço'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Google Maps Interactive Embed */}
              <div className="lg:col-span-7 relative min-h-[340px] sm:min-h-[400px] bg-stone-100">
                <iframe
                  title="Localização do Studio B Beleza no Google Maps"
                  src="https://maps.google.com/maps?q=Rua%20Mandiuba,%20176,%20Sao%20Paulo%20SP%2003158-070&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  className="w-full h-full min-h-[340px] sm:min-h-[400px] border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* Footer information */}
      <footer className="max-w-4xl mx-auto px-4 mt-16 pt-8 border-t border-[#ebd7d9] text-center text-xs text-stone-600 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <StudioLogo logoUrl={settings.logoUrl} size="sm" />
          <span className="font-serif-luxury font-bold text-[#4a0d1a]">{settings.name}</span>
        </div>
        <a
          href="https://www.google.com/maps/search/?api=1&query=Rua+Mandiuba+176+03158-070+Sao+Paulo+SP"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 hover:text-[#581421] transition-colors hover:underline underline-offset-2"
          title="Ver no Google Maps"
        >
          <MapPin size={13} className="text-[#a84457]" />
          <span>{settings.address}</span>
          <ExternalLink size={11} className="opacity-60" />
        </a>
        <p className="text-[11px] text-stone-600">
          Atendimento: {settings.openingTime} às {settings.closingTime} • Terça a Sábado
        </p>

        <div className="pt-4 flex items-center justify-center gap-2 text-[10px] text-stone-400">
          <span>© {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.</span>
          {onOpenOwner && (
            <button
              type="button"
              onClick={onOpenOwner}
              title="Acesso de Gestão"
              className="text-stone-300 hover:text-stone-500 transition-colors p-1"
            >
              <Lock size={11} />
            </button>
          )}
        </div>
      </footer>

      {/* Lookup Appointment Modal */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#ebd7d9] shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="font-serif-luxury text-xl font-bold text-[#3d0d16]">
                Consultar Meus Agendamentos
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowLookupModal(false);
                  setLookupResults(null);
                }}
                className="text-stone-600 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Digite seu número de WhatsApp com DDD para localizar seus agendamentos no studio:
            </p>

            <div className="flex gap-2">
              <input
                type="tel"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="Ex: 11987654321"
                className="flex-1 px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs focus:outline-none focus:ring-1 focus:ring-[#581421]"
              />
              <button
                type="button"
                onClick={handleLookup}
                className="px-4 py-2 bg-[#581421] text-white rounded-xl text-xs font-semibold hover:bg-[#6f192a]"
              >
                Buscar
              </button>
            </div>

            {lookupResults !== null && (
              <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
                {lookupResults.length === 0 ? (
                  <p className="text-xs text-stone-600 text-center py-4">
                    Nenhum agendamento encontrado para este telefone.
                  </p>
                ) : (
                  lookupResults.map((app) => (
                    <div key={app.id} className="p-3 bg-[#fff8f9] rounded-xl border border-[#ebd7d9] text-xs space-y-1">
                      <div className="flex justify-between font-bold text-[#4a0d1a]">
                        <span>{app.serviceName}</span>
                        <span>R$ {app.price.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="text-stone-600">
                        Data: <strong>{app.date.split('-').reverse().join('/')} às {app.time}</strong>
                      </div>
                      <div className="text-[11px] text-stone-600">
                        Status: <span className="capitalize font-semibold text-emerald-700">{app.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
