import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Suporte a payloads de fotos em base64 (até 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Inicialização segura do cliente Gemini
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint de OCR inteligente com Gemini Vision
app.post('/api/ocr-gemini', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Chave do Gemini não configurada no servidor.',
        fallbackToLocal: true,
      });
    }

    // Extrai dados e tipo mime
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const base64Data = match ? match[2] : imageBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: `Você é um perito em leitura e análise de documentos oficiais de identificação civil brasileiros (RG novo CIN, RG clássico, CNH antiga e nova, Certidão de Nascimento/Casamento, Carteira de Trabalho) para uso em serviços de emergência médica (SAMU 192, Resgate, Bombeiros, APH).

Analise atentamente a foto do documento anexado, mesmo que esteja:
- Girada ou deitada (90°, 180° ou 270°)
- Com reflexo de plástico protetor
- Com sombras, inclinação ou desgaste

Extraia os campos com a máxima exatidão:
1. Nome do Paciente (Nome completo do titular, sem títulos governamentais)
2. CPF formatado como 000.000.000-00 (ou informe se não localizado)
3. Data de Nascimento no formato DD/MM/AAAA
4. Idade calculada em anos inteiros com base na data de nascimento
5. Nome da Mãe (filiação materna completa)
6. Nome do Pai (se constar)
7. Número do RG / Registro Geral
8. Órgão Emissor (Ex: SSP/SP, DETRAN, etc.)
9. Dica de melhoria caso a imagem esteja ilegível ou cortada.`,
        },
      ],
      config: {
        systemInstruction:
          'Você é um leitor óptico de documentos civis brasileiros de alta precisão para emergências médicas. Seja rigoroso, nunca invente dados ilegíveis e retorne estritamente o JSON especificado.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            paciente: { type: Type.STRING, description: 'Nome completo do paciente/titular' },
            cpf: { type: Type.STRING, description: 'CPF no formato 000.000.000-00' },
            dn: { type: Type.STRING, description: 'Data de nascimento DD/MM/AAAA' },
            idade: { type: Type.INTEGER, description: 'Idade calculada em anos' },
            mae: { type: Type.STRING, description: 'Nome da mãe / filiação materna' },
            pai: { type: Type.STRING, description: 'Nome do pai / filiação paterna' },
            rg: { type: Type.STRING, description: 'Número do RG ou CNH' },
            orgaoEmissor: { type: Type.STRING, description: 'Órgão emissor do documento' },
            qualidadeLeitura: {
              type: Type.STRING,
              description: 'Qualidade percebida: Alta, Média ou Baixa',
            },
            dicaMelhoria: {
              type: Type.STRING,
              description: 'Dica para o usuário caso algo esteja ilegível',
            },
          },
          required: ['paciente'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    return res.json({
      success: true,
      dados: parsed,
    });
  } catch (error: any) {
    console.error('Erro na extração OCR Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar documento com IA.',
      fallbackToLocal: true,
    });
  }
});

// Endpoint de status
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Prontuário APH Server rodando em http://localhost:${PORT}`);
  });
}

startServer();
