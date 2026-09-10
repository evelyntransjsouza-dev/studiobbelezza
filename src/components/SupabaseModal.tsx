import React, { useState } from 'react';
import { Database, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { getSupabaseConfig, saveCustomSupabaseConfig, getSupabaseSetupSQL, getSupabaseClient } from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const config = getSupabaseConfig();
  const [url, setUrl] = useState(config.url);
  const [key, setKey] = useState(config.key);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    saveCustomSupabaseConfig(url, key);
    setStatusMsg('Credenciais salvas! Atualizando banco...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleTest = async () => {
    setStatusMsg('Testando conexão com o Supabase...');
    const client = getSupabaseClient();
    if (!client) {
      setStatusMsg('Por favor insira a URL e Anon Key antes de testar.');
      return;
    }
    try {
      const { error } = await client.from('services').select('count', { count: 'exact', head: true });
      if (error) {
        setStatusMsg(`Aviso: ${error.message}. Certifique-se de rodar o script SQL abaixo.`);
      } else {
        setStatusMsg('Conexão ativa com o Supabase com sucesso!');
      }
    } catch (e: any) {
      setStatusMsg(`Erro: ${e.message || e}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-[#ebd7d9] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-[#ebd7d9] pb-3">
          <div className="flex items-center gap-2 text-[#581421]">
            <Database size={20} />
            <h3 className="font-serif-luxury text-xl font-bold">
              Banco de Dados Supabase
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-600 hover:text-stone-700 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 ${
          config.isConfigured
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div className="flex-1">
            <strong>{config.isConfigured ? 'Supabase Conectado' : 'Modo Armazenamento Local Ativo'}</strong>
            <p className="text-[11px] opacity-90">
              {config.isConfigured
                ? 'Seu aplicativo está salvando e sincronizando agendamentos diretamente na nuvem Supabase.'
                : 'O app está funcionando com dados salvos no navegador. Insira suas chaves do Supabase para sincronizar em tempo real.'}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Project URL do Supabase
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.supabase.co"
              className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#581421]"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Anon Public API Key do Supabase
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full px-3 py-2 rounded-xl border border-[#ebd7d9] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#581421]"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-[#581421] text-white rounded-xl font-bold hover:bg-[#6f192a]"
              >
                Salvar Credenciais
              </button>
              <button
                type="button"
                onClick={handleTest}
                className="px-3 py-2 bg-stone-100 text-stone-800 rounded-xl font-semibold border border-stone-200 hover:bg-stone-200"
              >
                Testar
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(getSupabaseSetupSQL());
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 text-white rounded-xl font-semibold hover:bg-black"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'SQL Copiado!' : 'Copiar Script SQL'}</span>
            </button>
          </div>

          {statusMsg && (
            <p className="text-xs text-[#581421] font-semibold bg-[#fff8f9] p-2.5 rounded-xl border border-[#ebd7d9]">
              {statusMsg}
            </p>
          )}

          <div className="pt-2 border-t border-[#f2dedf] text-[11px] text-stone-600 space-y-1">
            <p className="font-semibold text-stone-800">Como conectar seu Supabase em 3 passos:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Crie um projeto gratuito em <strong>supabase.com</strong>.</li>
              <li>Acesse o <strong>SQL Editor</strong> e cole o Script SQL acima para criar as tabelas.</li>
              <li>Copie a <strong>Project URL</strong> e <strong>Anon Key</strong> em Project Settings &gt; API e salve aqui.</li>
            </ol>
          </div>
        </div>

      </div>
    </div>
  );
};
