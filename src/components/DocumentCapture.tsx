import React, { useState, useRef } from 'react';
import {
  Camera,
  RefreshCw,
  Download,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCw,
  SlidersHorizontal,
  HelpCircle,
  Sparkles,
  WifiOff,
  Sun,
  Maximize2,
} from 'lucide-react';
import {
  executarLeituraDocumento,
  rotacionarImagem,
  aplicarFiltroImagem,
  type ModoOCR,
  type ResultadoLeituraDocumento,
} from '../utils/ocrService';
import type { ExtractedDocData } from '../types/prontuario';

interface DocumentCaptureProps {
  fotoBase64: string;
  onFotoChange: (base64: string) => void;
  onDadosExtraidos: (dados: ExtractedDocData) => void;
  nomePaciente?: string;
}

export const DocumentCapture: React.FC<DocumentCaptureProps> = ({
  fotoBase64,
  onFotoChange,
  onDadosExtraidos,
  nomePaciente,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [estaProcessando, setEstaProcessando] = useState(false);
  const [statusTexto, setStatusTexto] = useState('');
  const [progressoPct, setProgressoPct] = useState(0);
  const [textoBruto, setTextoBruto] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [dicaMelhoria, setDicaMelhoria] = useState<string | null>(null);
  const [motorUtilizado, setMotorUtilizado] = useState<'gemini' | 'tesseract' | null>(null);
  const [modoOCR, setModoOCR] = useState<ModoOCR>(import.meta.env.VITE_STATIC_HOST ? 'local' : 'gemini');
  const [mostrarDicas, setMostrarDicas] = useState(false);
  const [fotoOriginal, setFotoOriginal] = useState<string>('');

  const processarLeitura = async (imagemParaProcessar: string, modo: ModoOCR = modoOCR) => {
    setEstaProcessando(true);
    setMensagemSucesso(null);
    setDicaMelhoria(null);

    try {
      const resultado: ResultadoLeituraDocumento = await executarLeituraDocumento(
        imagemParaProcessar,
        modo,
        (status, pct) => {
          setStatusTexto(status);
          setProgressoPct(pct);
        }
      );

      setMotorUtilizado(resultado.motorUtilizado);
      if (resultado.textoBruto) {
        setTextoBruto(resultado.textoBruto);
      }
      if (resultado.dicaMelhoria) {
        setDicaMelhoria(resultado.dicaMelhoria);
      }

      onDadosExtraidos(resultado.dadosExtraidos);

      if (resultado.dadosExtraidos.camposPreenchidos > 0) {
        const motorNome =
          resultado.motorUtilizado === 'gemini' ? 'IA Gemini' : 'OCR Local (Tesseract)';
        setMensagemSucesso(
          `✅ Leitura concluída via ${motorNome}! ${resultado.dadosExtraidos.camposPreenchidos} campo(s) preenchido(s) com sucesso.`
        );
      } else {
        setMensagemSucesso(
          '⚠️ Leitura finalizada, mas poucos dados foram reconhecidos. Tente girar a foto ou aplicar o filtro de Alto Contraste abaixo.'
        );
      }
    } catch (err: any) {
      console.error('Erro na leitura:', err);
      setStatusTexto('❌ Não foi possível ler a imagem. Ajuste o enquadramento ou preencha manualmente.');
    } finally {
      setEstaProcessando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFotoOriginal(base64);
      onFotoChange(base64);
      processarLeitura(base64, modoOCR);
    };
    reader.readAsDataURL(file);
  };

  const handleGirar = async () => {
    if (!fotoBase64 || estaProcessando) return;
    setEstaProcessando(true);
    setStatusTexto('Girando imagem...');
    try {
      const girada = await rotacionarImagem(fotoBase64, 90);
      onFotoChange(girada);
      setEstaProcessando(false);
      // Dispara leitura na foto corrigida
      processarLeitura(girada, modoOCR);
    } catch {
      setEstaProcessando(false);
    }
  };

  const handleFiltro = async (tipo: 'alto_contraste' | 'tons_cinza' | 'nitidez') => {
    if (!fotoBase64 || estaProcessando) return;
    setEstaProcessando(true);
    setStatusTexto('Aplicando filtro de contraste no documento...');
    try {
      const base = fotoOriginal || fotoBase64;
      const filtrada = await aplicarFiltroImagem(base, tipo);
      onFotoChange(filtrada);
      setEstaProcessando(false);
      processarLeitura(filtrada, modoOCR);
    } catch {
      setEstaProcessando(false);
    }
  };

  const handleRestaurarOriginal = () => {
    if (fotoOriginal) {
      onFotoChange(fotoOriginal);
      processarLeitura(fotoOriginal, modoOCR);
    }
  };

  const handleRemoverFoto = () => {
    if (window.confirm('Deseja remover a foto do documento?')) {
      onFotoChange('');
      setFotoOriginal('');
      setTextoBruto('');
      setMensagemSucesso(null);
      setDicaMelhoria(null);
      setStatusTexto('');
      setProgressoPct(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBaixarFoto = () => {
    if (!fotoBase64) return;
    const nomeLimpo = (nomePaciente || 'vitima').trim().replace(/\s+/g, '_').toLowerCase();
    const nomeArquivo = `doc_${nomeLimpo}.jpg`;

    const link = document.createElement('a');
    link.href = fotoBase64;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3.5 sm:p-4 text-center mb-4 transition-all">
      <input
        type="file"
        ref={fileInputRef}
        id="foto_doc"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Seletor de Modo & Dicas */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModoOCR('gemini')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              modoOCR === 'gemini'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>IA Gemini (Alta Precisão)</span>
          </button>
          <button
            type="button"
            onClick={() => setModoOCR('local')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              modoOCR === 'local'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline (Local)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMostrarDicas((v) => !v)}
          className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold p-1 rounded hover:bg-blue-50 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dicas de Leitura</span>
        </button>
      </div>

      {/* Caixa Expansível de Dicas para Socorristas */}
      {mostrarDicas && (
        <div className="mb-3 p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-left text-xs text-slate-800 space-y-2 animate-fadeIn">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Como obter 100% de precisão na leitura:</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-slate-700">
            <li>
              <strong>Evite reflexo no plástico:</strong> Incline levemente o celular (5° a 10°) para desviar o reflexo das luzes do teto da ambulância ou do flash.
            </li>
            <li>
              <strong>Gire se sair deitada:</strong> Use o botão <em>"Girar 90°"</em> para alinhar o texto na horizontal caso a foto fique de lado.
            </li>
            <li>
              <strong>Filtro Alto Contraste:</strong> Documentos antigos ou com fundo esverdeado (RG/CNH) ficam muito mais fáceis de ler com o botão <em>"Alto Contraste P&B"</em>.
            </li>
            <li>
              <strong>Modo IA vs Offline:</strong> O modo <em>IA Gemini</em> decifra até documentos amassados, com sombra ou inclinados. O modo <em>Offline</em> é ideal para zonas rurais ou sem sinal.
            </li>
          </ul>
        </div>
      )}

      {!fotoBase64 ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition-colors text-base cursor-pointer"
          >
            <Camera className="w-5 h-5 flex-shrink-0" />
            <span>Tirar Foto do Documento (Leitura Automática)</span>
          </button>
          <p className="text-[11px] text-slate-500">
            Lê RG Novo (CIN), RG clássico, CNH e Certidão com preenchimento automático
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Imagem capturada com badge de status */}
          <div className="relative inline-block max-w-full">
            <img
              src={fotoBase64}
              alt="Documento do paciente"
              className="max-h-72 max-w-full rounded-xl border border-slate-300 mx-auto object-contain shadow-sm bg-black"
            />
          </div>

          {/* Barra de Ferramentas de Correção Rápida de Imagem */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              disabled={estaProcessando}
              onClick={handleGirar}
              title="Girar documento 90 graus"
              className="flex items-center gap-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-800 text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-300 cursor-pointer transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-700" />
              <span>Girar 90°</span>
            </button>

            <button
              type="button"
              disabled={estaProcessando}
              onClick={() => handleFiltro('alto_contraste')}
              title="Realçar letras escuras e remover fundo do RG/CNH"
              className="flex items-center gap-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-800 text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-300 cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
              <span>Alto Contraste P&B</span>
            </button>

            {fotoOriginal && fotoOriginal !== fotoBase64 && (
              <button
                type="button"
                disabled={estaProcessando}
                onClick={handleRestaurarOriginal}
                className="text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1 underline cursor-pointer"
              >
                Original
              </button>
            )}
          </div>

          {/* Ações Primárias: Reler, Salvar e Excluir */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              disabled={estaProcessando}
              onClick={() => processarLeitura(fotoBase64, modoOCR)}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold py-2 px-3 rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${estaProcessando ? 'animate-spin' : ''}`} />
              <span>Reler Documento</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarFoto}
              className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold py-2 px-3 rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Salvar Foto</span>
            </button>

            <button
              type="button"
              onClick={handleRemoverFoto}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold py-2 px-3 rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remover</span>
            </button>
          </div>

          {/* Status do Processamento */}
          {estaProcessando && (
            <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-medium animate-pulse">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                <span>{statusTexto || 'Iniciando leitura inteligente...'}</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${progressoPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Feedback de Sucesso */}
          {!estaProcessando && mensagemSucesso && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {/* Dica de Melhoria retornada pela IA */}
          {dicaMelhoria && !estaProcessando && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-left text-xs text-amber-900 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Dica de melhoria:</strong> {dicaMelhoria}
              </span>
            </div>
          )}

          {/* Detalhes de Texto Bruto */}
          {textoBruto && (
            <details className="mt-2 text-left bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
              <summary className="cursor-pointer font-bold text-blue-700 flex items-center gap-1 select-none">
                <FileText className="w-3.5 h-3.5" />
                <span>Ver texto bruto extraído</span>
              </summary>
              <textarea
                value={textoBruto}
                readOnly
                rows={4}
                className="w-full mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono resize-y text-slate-800"
              />
            </details>
          )}
        </div>
      )}
    </div>
  );
};
