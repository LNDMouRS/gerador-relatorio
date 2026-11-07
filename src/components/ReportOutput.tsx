import React, { useState } from 'react';
import { Copy, Check, Share2, ZoomIn, ZoomOut, MessageSquare } from 'lucide-react';

interface ReportOutputProps {
  relatorioTexto: string;
}

export const ReportOutput: React.FC<ReportOutputProps> = ({ relatorioTexto }) => {
  const [tamanhoFonte, setTamanhoFonte] = useState(15);
  const [mostrandoToast, setMostrandoToast] = useState(false);
  const [copiadoRecente, setCopiadoRecente] = useState(false);

  const ajustarFonte = (delta: number) => {
    setTamanhoFonte((atual) => Math.min(28, Math.max(10, atual + delta)));
  };

  const mostrarFeedbackCopiado = () => {
    setCopiadoRecente(true);
    setMostrandoToast(true);
    setTimeout(() => {
      setCopiadoRecente(false);
      setMostrandoToast(false);
    }, 2500);
  };

  const copiarTexto = async () => {
    if (!relatorioTexto) return;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(relatorioTexto);
        mostrarFeedbackCopiado();
        return;
      } catch (e) {
        // Fallback below
      }
    }

    // Fallback para navegadores sem permissão ou contextos HTTP/iFrame
    try {
      const textarea = document.createElement('textarea');
      textarea.value = relatorioTexto;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const sucesso = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (sucesso) {
        mostrarFeedbackCopiado();
      } else {
        throw new Error('Fallback failed');
      }
    } catch {
      window.alert(
        'Não foi possível copiar automaticamente. Selecione o texto abaixo e copie manualmente.'
      );
    }
  };

  const compartilharWhatsApp = () => {
    if (!relatorioTexto) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(relatorioTexto)}`;
    window.open(url, '_blank');
  };

  const compartilharNativo = async () => {
    if (!relatorioTexto) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Registro de Atendimento APH',
          text: relatorioTexto,
        });
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      copiarTexto();
    }
  };

  return (
    <div id="resultado_secao" className="mt-6 pt-2">
      <div className="bg-slate-200 text-slate-800 px-3 py-2 font-bold text-sm uppercase tracking-wider rounded border-l-4 border-blue-600 mb-3 flex items-center justify-between">
        <span>Resultado</span>
        <span className="text-xs text-slate-500 font-normal normal-case">
          {relatorioTexto ? `${relatorioTexto.split('\n').length} linhas formatadas` : 'Aguardando geração'}
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={copiarTexto}
          disabled={!relatorioTexto}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all cursor-pointer text-base"
        >
          {copiadoRecente ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5" />}
          <span>{copiadoRecente ? 'Copiado!' : 'Copiar Texto'}</span>
        </button>

        <button
          type="button"
          onClick={compartilharWhatsApp}
          disabled={!relatorioTexto}
          title="Compartilhar via WhatsApp"
          className="flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-white font-bold py-3 px-3.5 rounded-xl shadow-sm transition-all cursor-pointer text-sm"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={compartilharNativo}
            disabled={!relatorioTexto}
            title="Compartilhar com outros apps"
            className="flex items-center justify-center p-3 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-1 bg-slate-100 p-1 border border-slate-300 rounded-xl ml-auto">
          <button
            type="button"
            onClick={() => ajustarFonte(-1)}
            title="Diminuir tamanho da fonte"
            className="w-9 h-9 flex items-center justify-center font-bold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 w-11 text-center select-none">
            {tamanhoFonte}px
          </span>
          <button
            type="button"
            onClick={() => ajustarFonte(1)}
            title="Aumentar tamanho da fonte"
            className="w-9 h-9 flex items-center justify-center font-bold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Relatório formatado */}
      <div
        id="output"
        style={{ fontSize: `${tamanhoFonte}px` }}
        className="bg-white border-2 border-slate-300 rounded-xl p-4 min-h-[90px] text-slate-900 font-mono leading-relaxed whitespace-pre-wrap break-words select-text shadow-inner transition-[font-size] duration-150"
      >
        {relatorioTexto ? (
          relatorioTexto
        ) : (
          <span className="text-slate-400 italic font-sans text-sm">
            Clique em "Gerar Relatório" para exibir o texto formatado aqui...
          </span>
        )}
      </div>

      {/* Toast Feedback */}
      {mostrandoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-5 py-3 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2 z-50 animate-bounce"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Copiado com sucesso! ✔️</span>
        </div>
      )}
    </div>
  );
};
