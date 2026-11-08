import { createWorker } from 'tesseract.js';
import { extrairDadosDoTexto } from './prontuario';
import type { ExtractedDocData } from '../types/prontuario';

export type ModoOCR = 'gemini' | 'local';

export interface OCRProgressCallback {
  (status: string, progressPct: number): void;
}

export interface ResultadoLeituraDocumento {
  motorUtilizado: 'gemini' | 'tesseract';
  dadosExtraidos: ExtractedDocData;
  textoBruto?: string;
  dicaMelhoria?: string;
  qualidadeLeitura?: string;
  rg?: string;
  orgaoEmissor?: string;
}

/**
 * Gira a imagem em 90 graus no Canvas
 */
export async function rotacionarImagem(base64Str: string, graus: number = 90): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      if (graus === 90 || graus === 270 || graus === -90) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((graus * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
}

/**
 * Aplica filtro de imagem para melhorar a legibilidade de documentos
 * - 'alto_contraste': Remove fundo verde/guilhochê e escurece caracteres
 * - 'tons_cinza': Converte em escala de cinza suave
 */
export async function aplicarFiltroImagem(
  base64Str: string,
  tipo: 'alto_contraste' | 'tons_cinza' | 'nitidez'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const cinza = 0.299 * r + 0.587 * g + 0.114 * b;

          if (tipo === 'alto_contraste') {
            // Threshold adaptativo com corte para destacar texto impresso/datilografado
            const val = cinza < 135 ? Math.max(0, cinza - 35) : Math.min(255, cinza + 30);
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          } else if (tipo === 'tons_cinza') {
            data[i] = cinza;
            data[i + 1] = cinza;
            data[i + 2] = cinza;
          } else if (tipo === 'nitidez') {
            // Aumento leve de contraste nas bordas
            const val = cinza < 128 ? cinza * 0.85 : Math.min(255, cinza * 1.15);
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
}

/**
 * Pré-processamento em Canvas para otimização de OCR em Tesseract
 */
export async function preProcessarImagemDoc(base64Str: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const cinza = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const ajustado = cinza < 128 ? Math.max(0, cinza - 24) : Math.min(255, cinza + 24);
          data[i] = ajustado;
          data[i + 1] = ajustado;
          data[i + 2] = ajustado;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
}

/**
 * Executa o OCR utilizando Tesseract.js (Modo 100% Local / Offline)
 */
export async function executarTesseractLocal(
  base64Str: string,
  onProgress?: OCRProgressCallback
): Promise<ResultadoLeituraDocumento> {
  if (onProgress) {
    onProgress('Preparando imagem para OCR local...', 15);
  }

  const imagemOtimizada = await preProcessarImagemDoc(base64Str);

  if (onProgress) {
    onProgress('Carregando mecanismo Tesseract local...', 30);
  }

  const worker = await createWorker('por', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const pct = Math.round(35 + m.progress * 60);
        onProgress(`Lendo documento localmente... (${Math.round(m.progress * 100)}%)`, pct);
      }
    },
  });

  try {
    const res = await worker.recognize(imagemOtimizada);
    const textoBruto = res.data.text || '';
    const dadosExtraidos = extrairDadosDoTexto(textoBruto);

    if (onProgress) {
      onProgress('OCR local concluído!', 100);
    }

    await worker.terminate();
    return {
      motorUtilizado: 'tesseract',
      dadosExtraidos,
      textoBruto,
    };
  } catch (error) {
    await worker.terminate();
    throw error;
  }
}

/**
 * Executa OCR Inteligente com Gemini Vision via backend
 */
export async function executarGeminiOCR(
  base64Str: string,
  onProgress?: OCRProgressCallback
): Promise<ResultadoLeituraDocumento> {
  if (onProgress) {
    onProgress('Analisando documento com IA Gemini (Visão Computacional)...', 25);
  }

  const resposta = await fetch('/api/ocr-gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64Str }),
  });

  if (!resposta.ok) {
    const erroJson = await resposta.json().catch(() => ({}));
    throw new Error(erroJson.error || `Erro no servidor (${resposta.status})`);
  }

  const json = await resposta.json();
  const dados = json.dados || {};

  if (onProgress) {
    onProgress('Dados extraídos com sucesso pela IA!', 100);
  }

  let campos = 0;
  if (dados.paciente) campos++;
  if (dados.cpf) campos++;
  if (dados.dn) campos++;
  if (dados.idade !== undefined) campos++;
  if (dados.mae) campos++;

  const dadosExtraidos: ExtractedDocData = {
    paciente: dados.paciente || undefined,
    cpf: dados.cpf || undefined,
    dn: dados.dn || undefined,
    idade: typeof dados.idade === 'number' ? dados.idade : undefined,
    mae: dados.mae || undefined,
    camposPreenchidos: campos,
  };

  return {
    motorUtilizado: 'gemini',
    dadosExtraidos,
    dicaMelhoria: dados.dicaMelhoria,
    qualidadeLeitura: dados.qualidadeLeitura,
    rg: dados.rg,
    orgaoEmissor: dados.orgaoEmissor,
  };
}

/**
 * Leitor Unificado: Tenta Gemini primeiro (mais tolerante a rotação, sombras e reflexos),
 * e se falhar ou estiver offline, faz fallback automático para o Tesseract.js.
 */
export async function executarLeituraDocumento(
  base64Str: string,
  modoPreferido: ModoOCR = 'gemini',
  onProgress?: OCRProgressCallback
): Promise<ResultadoLeituraDocumento> {
  // GitHub Pages has no backend: read locally without a failing API request.
  if (modoPreferido === 'gemini' && !import.meta.env.VITE_STATIC_HOST) {
    try {
      return await executarGeminiOCR(base64Str, onProgress);
    } catch (err: any) {
      console.warn('Falha no Gemini OCR, aplicando fallback local Tesseract:', err);
      if (onProgress) {
        onProgress('Serviço de IA indisponível. Alternando para OCR local...', 10);
      }
      return await executarTesseractLocal(base64Str, onProgress);
    }
  }

  return await executarTesseractLocal(base64Str, onProgress);
}
