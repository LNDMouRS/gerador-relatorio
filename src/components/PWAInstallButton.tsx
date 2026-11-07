import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Apple,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [modalAberto, setModalAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'ios' | 'android'>(isIOS ? 'ios' : 'android');

  const handleCliqueInstalar = async () => {
    if (isInstallable) {
      const sucesso = await install();
      if (!sucesso) {
        setModalAberto(true);
      }
    } else {
      setModalAberto(true);
    }
  };

  return (
    <>
      {/* Botão de Instalação no Topo */}
      {!isInstalled ? (
        <button
          type="button"
          onClick={handleCliqueInstalar}
          className="flex items-center gap-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-all"
          title="Instalar Prontuário APH no celular (Android e iPhone)"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-200" />
          <span>Instalar no Celular</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>App Instalado</span>
        </div>
      )}

      {/* Modal Passo a Passo de Instalação para Android e iOS */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    Instalar Prontuário APH
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use como app nativo em tela cheia sem internet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador de Abas: iOS vs Android */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-4 font-bold text-xs">
              <button
                type="button"
                onClick={() => setAbaAtiva('android')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  abaAtiva === 'android'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🤖 Android</span>
              </button>
              <button
                type="button"
                onClick={() => setAbaAtiva('ios')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  abaAtiva === 'ios'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
            </div>

            {/* Instruções para Android */}
            {abaAtiva === 'android' && (
              <div className="space-y-3 text-xs text-slate-700">
                {isInstallable && (
                  <button
                    type="button"
                    onClick={async () => {
                      await install();
                      setModalAberto(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors cursor-pointer text-sm mb-3"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Agora no Android</span>
                  </button>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      1
                    </span>
                    <p>
                      Abra o site no navegador <strong>Google Chrome</strong> ou <strong>Samsung Internet</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      2
                    </span>
                    <p>
                      Toque no menu de <strong>três pontos (⋮)</strong> no canto superior direito.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      3
                    </span>
                    <p>
                      Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-[11px] leading-relaxed">
                  ✔️ O ícone oficial de ambulância aparecerá na sua tela de aplicativos. Ele abre instantaneamente em tela cheia e salva rascunhos mesmo offline!
                </div>
              </div>
            )}

            {/* Instruções para iOS (iPhone / iPad) */}
            {abaAtiva === 'ios' && (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      1
                    </span>
                    <p>
                      Abra este endereço no navegador <strong>Safari</strong> (padrão da Apple).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      2
                    </span>
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span>Toque no botão de</span>
                      <strong className="inline-flex items-center gap-1 bg-white border border-slate-300 px-1.5 py-0.5 rounded text-blue-700">
                        <Share2 className="w-3.5 h-3.5" /> Compartilhar
                      </strong>
                      <span>na barra inferior do Safari.</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      3
                    </span>
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span>Role as opções para cima e toque em</span>
                      <strong className="inline-flex items-center gap-1 bg-white border border-slate-300 px-1.5 py-0.5 rounded text-slate-900">
                        <PlusSquare className="w-3.5 h-3.5 text-blue-600" /> Adicionar à Tela de Início
                      </strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      4
                    </span>
                    <p>
                      Toque em <strong>"Adicionar"</strong> no canto superior direito para confirmar.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-[11px] leading-relaxed">
                  ✔️ Pronto! O app abrirá como um aplicativo nativo da Apple, sem barras de navegação do navegador e com suporte completo à câmera de fotos.
                </div>
              </div>
            )}

            {/* Rodapé com botão fechar */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-colors"
              >
                Entendi / Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
