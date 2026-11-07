import React, { useState, useEffect, useRef } from 'react';
import {
  Ambulance,
  Plus,
  Trash2,
  FileCheck,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Car,
  HeartPulse,
  Activity,
  MapPin,
  User,
  Stethoscope,
  ClipboardList,
  Building2,
} from 'lucide-react';
import type {
  ProntuarioData,
  ViaturaApoio,
  VeiculoAcidente,
  TipoRefeicao,
  ExtractedDocData,
} from './types/prontuario';
import {
  mascaraPA,
  mascaraCPF,
  mascaraData,
  calcularIdade,
  gerarRelatorioTexto,
} from './utils/prontuario';
import { DocumentCapture } from './components/DocumentCapture';
import { GlasgowCalculator } from './components/GlasgowCalculator';
import { ReportOutput } from './components/ReportOutput';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

const DADOS_INICIAIS: ProntuarioData = {
  despacho: '',
  endereco: '',
  paciente: '',
  idade: '',
  dn: '',
  cpf: '',
  mae: '',
  temFotoDoc: false,
  procedimentos: {
    nenhum: false,
    padrao: true,
    imobilizacao: false,
    oxigenio: false,
    interhospitalar: false,
    outro: false,
    outroTexto: '',
  },
  pa: '',
  sat: '',
  fc: '',
  fr: '',
  pupilasTipo: '',
  pupilasFotorreativas: true,
  pele: '',
  glasgow: { ocular: 0, verbal: 0, motora: 0 },
  refeicao: '',
  alergia: '',
  doencas: '',
  medicamentos: '',
  situacao: '',
  temApoio: false,
  viaturasApoio: [{ id: 'apoio_1', comandante: '', viatura: '' }],
  temAcidente: false,
  veiculosAcidente: [{ id: 'veiculo_1', veiculo: '', placa: '' }],
  reguladoPara: '',
  dr: '',
  senha: '',
  cuidados: '',
};

const STORAGE_KEY = 'prontuario_aph_draft_v1';

export default function App() {
  const [dados, setDados] = useState<ProntuarioData>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch {
      // Ignora erro de parsing
    }
    return DADOS_INICIAIS;
  });

  const [fotoDocumentoBase64, setFotoDocumentoBase64] = useState<string>('');
  const [relatorioGerado, setRelatorioGerado] = useState<string>('');
  const [camposDestacados, setCamposDestacados] = useState<Record<string, boolean>>({});

  const resultadoRef = useRef<HTMLDivElement>(null);

  // Auto-save no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    } catch {
      // Falha silenciosa se exceder quota
    }
  }, [dados]);

  // Alerta de beforeunload contra fechamento acidental
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const temConteudo =
        dados.paciente ||
        dados.despacho ||
        dados.endereco ||
        dados.situacao ||
        dados.pa;

      if (temConteudo) {
        e.preventDefault();
        e.returnValue =
          'ATENÇÃO: Todos os dados preenchidos serão apagados se você atualizar a página! Tem certeza que deseja sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dados]);

  // Destaque visual temporário nos campos preenchidos por OCR
  const destacarCampos = (campos: string[]) => {
    const novoDestaque: Record<string, boolean> = {};
    campos.forEach((c) => (novoDestaque[c] = true));
    setCamposDestacados((prev) => ({ ...prev, ...novoDestaque }));

    setTimeout(() => {
      setCamposDestacados((prev) => {
        const atual = { ...prev };
        campos.forEach((c) => delete atual[c]);
        return atual;
      });
    }, 3500);
  };

  // Handler de dados recebidos do OCR
  const handleDadosOCR = (ext: ExtractedDocData) => {
    const atualizados: string[] = [];
    setDados((prev) => {
      const novo = { ...prev };
      if (ext.paciente) {
        novo.paciente = ext.paciente;
        atualizados.push('paciente');
      }
      if (ext.dn) {
        novo.dn = ext.dn;
        atualizados.push('dn');
      }
      if (ext.idade !== undefined) {
        novo.idade = String(ext.idade);
        atualizados.push('idade');
      }
      if (ext.cpf) {
        novo.cpf = ext.cpf;
        atualizados.push('cpf');
      }
      if (ext.mae) {
        novo.mae = ext.mae;
        atualizados.push('mae');
      }
      return novo;
    });

    if (atualizados.length > 0) {
      destacarCampos(atualizados);
    }
  };

  // Alteração de foto
  const handleFotoChange = (base64: string) => {
    setFotoDocumentoBase64(base64);
    setDados((prev) => ({ ...prev, temFotoDoc: Boolean(base64) }));
  };

  // Atualização genérica de campos de texto
  const handleChange = (campo: keyof ProntuarioData, valor: any) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  };

  // Manipulação de máscaras
  const handleInputPA = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange('pa', mascaraPA(e.target.value));
  };

  const handleInputCPF = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange('cpf', mascaraCPF(e.target.value));
  };

  const handleInputDN = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = mascaraData(e.target.value);
    handleChange('dn', formatado);

    if (formatado.length === 10) {
      const calcIdade = calcularIdade(formatado);
      if (calcIdade !== null) {
        handleChange('idade', String(calcIdade));
        destacarCampos(['idade']);
      }
    }
  };

  // Procedimentos
  const handleCheckNenhum = (checked: boolean) => {
    if (checked) {
      setDados((prev) => ({
        ...prev,
        procedimentos: {
          nenhum: true,
          padrao: false,
          imobilizacao: false,
          oxigenio: false,
          interhospitalar: false,
          outro: false,
          outroTexto: '',
        },
      }));
    } else {
      setDados((prev) => ({
        ...prev,
        procedimentos: { ...prev.procedimentos, nenhum: false },
      }));
    }
  };

  const handleCheckProcedimento = (
    proc: keyof typeof DADOS_INICIAIS.procedimentos,
    checked: boolean
  ) => {
    setDados((prev) => ({
      ...prev,
      procedimentos: {
        ...prev.procedimentos,
        [proc]: checked,
        nenhum: false, // Ao marcar qualquer procedimento, desmarca 'nenhum'
      },
    }));
  };

  // Viaturas de Apoio
  const addApoio = () => {
    setDados((prev) => ({
      ...prev,
      viaturasApoio: [
        ...prev.viaturasApoio,
        { id: `apoio_${Date.now()}`, comandante: '', viatura: '' },
      ],
    }));
  };

  const removeApoio = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta viatura de apoio?')) {
      setDados((prev) => ({
        ...prev,
        viaturasApoio: prev.viaturasApoio.filter((a) => a.id !== id),
      }));
    }
  };

  const updateApoio = (id: string, campo: 'comandante' | 'viatura', valor: string) => {
    setDados((prev) => ({
      ...prev,
      viaturasApoio: prev.viaturasApoio.map((a) =>
        a.id === id ? { ...a, [campo]: valor } : a
      ),
    }));
  };

  // Veículos de Acidente
  const addVeiculo = () => {
    setDados((prev) => ({
      ...prev,
      veiculosAcidente: [
        ...prev.veiculosAcidente,
        { id: `veiculo_${Date.now()}`, veiculo: '', placa: '' },
      ],
    }));
  };

  const removeVeiculo = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
      setDados((prev) => ({
        ...prev,
        veiculosAcidente: prev.veiculosAcidente.filter((v) => v.id !== id),
      }));
    }
  };

  const updateVeiculo = (id: string, campo: 'veiculo' | 'placa', valor: string) => {
    setDados((prev) => ({
      ...prev,
      veiculosAcidente: prev.veiculosAcidente.map((v) =>
        v.id === id ? { ...v, [campo]: valor } : v
      ),
    }));
  };

  // Gerar Relatório
  const handleGerarRelatorio = () => {
    const texto = gerarRelatorioTexto(dados);
    setRelatorioGerado(texto);

    // Rolagem suave até a área de resultado
    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Resetar Formulário
  const handleLimparFormulario = () => {
    if (
      window.confirm(
        'ATENÇÃO: Deseja realmente limpar todos os campos do prontuário para um novo atendimento?'
      )
    ) {
      setDados(DADOS_INICIAIS);
      setFotoDocumentoBase64('');
      setRelatorioGerado('');
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Preencher Exemplo de Caso Completo
  const handlePreencherExemplo = () => {
    const exemplo: ProntuarioData = {
      despacho: 'B04',
      endereco: 'Av. Brasil, 1500 - Centro',
      paciente: 'MARCOS VINICIUS PEREIRA',
      idade: '34',
      dn: '18/04/1992',
      cpf: '345.678.901-22',
      mae: 'TERESA CRISTINA PEREIRA',
      temFotoDoc: false,
      procedimentos: {
        nenhum: false,
        padrao: true,
        imobilizacao: true,
        oxigenio: true,
        interhospitalar: false,
        outro: true,
        outroTexto: 'curativo oclusivo em MSD e colar cervical com prancha longa',
      },
      pa: '130/80',
      sat: '97',
      fc: '84',
      fr: '18',
      pupilasTipo: 'Isocóricas',
      pupilasFotorreativas: true,
      pele: 'corada, sudorética',
      glasgow: { ocular: 4, verbal: 5, motora: 6 },
      refeicao: 'almoço',
      alergia: 'Nega alergias medicamentosas',
      doencas: 'Nega comorbidades prévias',
      medicamentos: 'Nega uso de medicação contínua',
      situacao:
        'Colisão auto x anteparo em velocidade moderada. Vítima condutora usando cinto, deambulando na cena, queixando-se de dor torácica e escoriações em antebraço direito. Vias aéreas pérvias sem esforço ventilatório.',
      temApoio: true,
      viaturasApoio: [
        { id: 'apoio_1', comandante: '2º Sgt PM Rocha', viatura: 'M-22415' },
      ],
      temAcidente: true,
      veiculosAcidente: [
        { id: 'veiculo_1', veiculo: 'VW Gol Prata', placa: 'BRA-2E19' },
      ],
      reguladoPara: 'Hospital Regional Central',
      dr: 'Eduardo Medeiros',
      senha: '8492',
      cuidados: 'Dr. Fernando Augusto (Cirurgia Geral)',
    };

    setDados(exemplo);
    const texto = gerarRelatorioTexto(exemplo);
    setRelatorioGerado(texto);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-4 px-3 sm:py-6 sm:px-4">
      <main className="max-w-[620px] mx-auto bg-white p-4 sm:p-6 rounded-2xl shadow-md border border-slate-200">
        {/* Cabeçalho */}
        <header className="border-b-2 border-slate-200 pb-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Ambulance className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                  Registro de Atendimento
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Prontuário de Atendimento Pré-Hospitalar (APH)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <PWAInstallButton />

              <button
                type="button"
                onClick={handlePreencherExemplo}
                title="Preencher caso de exemplo"
                className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Exemplo</span>
              </button>

              <button
                type="button"
                onClick={handleLimparFormulario}
                title="Limpar formulário"
                className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-rose-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            </div>
          </div>
        </header>

        {/* 1. CHAMADO */}
        <section aria-labelledby="sec-chamado" className="mb-4">
          <div
            id="sec-chamado"
            className="bg-slate-200 text-slate-800 px-3 py-2 font-bold text-xs uppercase tracking-wider rounded border-l-4 border-blue-600 mb-3 flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-blue-700" />
            <span>1. Chamado</span>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="despacho" className="block text-sm font-semibold text-slate-700 mb-1">
                Despacho:
              </label>
              <input
                type="text"
                id="despacho"
                value={dados.despacho}
                onChange={(e) => handleChange('despacho', e.target.value)}
                placeholder="Ex: B01"
                className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="endereco" className="block text-sm font-semibold text-slate-700 mb-1">
                Endereço:
              </label>
              <input
                type="text"
                id="endereco"
                value={dados.endereco}
                onChange={(e) => handleChange('endereco', e.target.value)}
                placeholder="Rua, número, bairro ou ponto de referência"
                className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* 2. IDENTIFICAÇÃO + FOTO DO DOCUMENTO + OCR */}
        <section aria-labelledby="sec-identificacao" className="mb-4">
          <div
            id="sec-identificacao"
            className="bg-slate-200 text-slate-800 px-3 py-2 font-bold text-xs uppercase tracking-wider rounded border-l-4 border-blue-600 mb-3 flex items-center gap-1.5"
          >
            <User className="w-4 h-4 text-blue-700" />
            <span>2. Identificação</span>
          </div>

          {/* Componente de Captura de Documento com Leitura OCR */}
          <DocumentCapture
            fotoBase64={fotoDocumentoBase64}
            onFotoChange={handleFotoChange}
            onDadosExtraidos={handleDadosOCR}
            nomePaciente={dados.paciente}
          />

          <div className="space-y-3">
            <div>
              <label htmlFor="paciente" className="block text-sm font-semibold text-slate-700 mb-1">
                Paciente:
              </label>
              <input
                type="text"
                id="paciente"
                value={dados.paciente}
                onChange={(e) => handleChange('paciente', e.target.value)}
                placeholder="Nome completo do paciente"
                className={`w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors ${
                  camposDestacados.paciente ? 'campo-preenchido-ocr' : ''
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="idade" className="block text-sm font-semibold text-slate-700 mb-1">
                  Idade:
                </label>
                <input
                  type="text"
                  id="idade"
                  value={dados.idade}
                  onChange={(e) => handleChange('idade', e.target.value)}
                  placeholder="Ex: 35"
                  className={`w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors ${
                    camposDestacados.idade ? 'campo-preenchido-ocr' : ''
                  }`}
                />
              </div>

              <div>
                <label htmlFor="dn" className="block text-sm font-semibold text-slate-700 mb-1">
                  DN:
                </label>
                <input
                  type="text"
                  id="dn"
                  maxLength={10}
                  value={dados.dn}
                  onChange={handleInputDN}
                  placeholder="dd/mm/aaaa"
                  className={`w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors ${
                    camposDestacados.dn ? 'campo-preenchido-ocr' : ''
                  }`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-semibold text-slate-700 mb-1">
                CPF:
              </label>
              <input
                type="text"
                id="cpf"
                maxLength={14}
                value={dados.cpf}
                onChange={handleInputCPF}
                placeholder="000.000.000-00"
                className={`w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors ${
                  camposDestacados.cpf ? 'campo-preenchido-ocr' : ''
                }`}
              />
            </div>

            <div>
              <label htmlFor="mae" className="block text-sm font-semibold text-slate-700 mb-1">
                Mãe:
              </label>
              <input
                type="text"
                id="mae"
                value={dados.mae}
                onChange={(e) => handleChange('mae', e.target.value)}
                placeholder="Nome da mãe / filiação"
                className={`w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600 transition-colors ${
                  camposDestacados.mae ? 'campo-preenchido-ocr' : ''
                }`}
              />
            </div>
          </div>
        </section>

        {/* 3. PROCEDIMENTO REALIZADO */}
        <section aria-labelledby="sec-procedimentos" className="mb-4">
          <div
            id="sec-procedimentos"
            className="bg-slate-200 text-slate-800 px-3 py-2 font-bold text-xs uppercase tracking-wider rounded border-l-4 border-blue-600 mb-3 flex items-center gap-1.5"
          >
            <Stethoscope className="w-4 h-4 text-blue-700" />
            <span>3. Procedimento Realizado</span>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={dados.procedimentos.nenhum}
                onChange={(e) => handleCheckNenhum(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-800">Sem intervenção</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={dados.procedimentos.padrao}
                onChange={(e) => handleCheckProcedimento('padrao', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-800">
                Padrão (Abordagem, Exames, Sinais e Transporte)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={dados.procedimentos.imobilizacao}
                onChange={(e) => handleCheckProcedimento('imobilizacao', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-800">Imobilização / Contenção</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={dados.procedimentos.oxigenio}
                onChange={(e) => handleCheckProcedimento('oxigenio', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-800">Oxigênio Terapia</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={dados.procedimentos.interhospitalar}
                onChange={(e) => handleCheckProcedimento('interhospitalar', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-800">
                Transporte Interhospitalar
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={dados.procedimentos.outro}
                onChange={(e) => handleCheckProcedimento('outro', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-800">Outros...</span>
            </label>

            {dados.procedimentos.outro && (
              <div className="pt-2 pl-8">
                <label
                  htmlFor="outro_procedimento_texto"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Especifique o procedimento extra:
                </label>
                <input
                  type="text"
                  id="outro_procedimento_texto"
                  value={dados.procedimentos.outroTexto}
                  onChange={(e) =>
                    setDados((prev) => ({
                      ...prev,
                      procedimentos: { ...prev.procedimentos, outroTexto: e.target.value },
                    }))
                  }
                  placeholder="Digite os procedimentos adicionais"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
            )}
          </div>
        </section>

        {/* 4. SINAIS VITAIS & AVALIAÇÃO */}
        <section aria-labelledby="sec-sinais-vitais" className="mb-4">
          <div
            id="sec-sinais-vitais"
            className="bg-slate-200 text-slate-800 px-3 py-2 font-bold text-xs uppercase tracking-wider rounded border-l-4 border-blue-600 mb-3 flex items-center gap-1.5"
          >
            <HeartPulse className="w-4 h-4 text-blue-700" />
            <span>4. Sinais Vitais & Avaliação</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pa" className="block text-sm font-semibold text-slate-700 mb-1">
                  PA:
                </label>
                <input
                  type="text"
                  id="pa"
                  value={dados.pa}
                  onChange={handleInputPA}
                  placeholder="120/80 (ou 090/60)"
                  className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="sat" className="block text-sm font-semibold text-slate-700 mb-1">
                  SAT (%):
                </label>
                <input
                  type="text"
                  id="sat"
                  value={dados.sat}
                  onChange={(e) => handleChange('sat', e.target.value)}
                  placeholder="00"
                  className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="fc" className="block text-sm font-semibold text-slate-700 mb-1">
                  FC (bpm):
                </label>
                <input
                  type="text"
                  id="fc"
                  value={dados.fc}
                  onChange={(e) => handleChange('fc', e.target.value)}
                  placeholder="00"
                  className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="fr" className="block text-sm font-semibold text-slate-700 mb-1">
                  FR (mrpm):
                </label>
                <input
                  type="text"
                  id="fr"
                  value={dados.fr}
                  onChange={(e) => handleChange('fr', e.target.value)}
                  placeholder="00"
                  className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Pupilas */}
            <div>
              <label htmlFor="pupilas_tipo" className="block text-sm font-semibold text-slate-700 mb-1">
                Pupilas:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  id="pupilas_tipo"
                  value={dados.pupilasTipo}
                  onChange={(e) => handleChange('pupilasTipo', e.target.value)}
                  className="flex-1 p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Selecione...</option>
                  <option value="Isocóricas">Isocóricas</option>
                  <option value="Mióticas">Mióticas</option>
                  <option value="Midriáticas">Midriáticas</option>
                  <option value="Anisocóricas">Anisocóricas</option>
                </select>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-300 px-3 py-2.5 rounded-lg select-none">
                  <input
                    type="checkbox"
                    id="pupilas_reacao"
                    checked={dados.pupilasFotorreativas}
                    onChange={(e) => handleChange('pupilasFotorreativas', e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700">Fotorreativas</span>
                </label>
              </div>
            </div>

            {/* Pele */}
            <div>
              <label htmlFor="pele" className="block text-sm font-semibold text-slate-700 mb-1">
                Pele:
              </label>
              <input
                type="text"
                id="pele"
                value={dados.pele}
                onChange={(e) => handleChange('pele', e.target.value)}
                placeholder="Ex: corada, desidratada, fria, cianótica"
                className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Escala de Glasgow (GCS-P) */}
            <GlasgowCalculator
              parametros={dados.glasgow}
              onChange={(novos) => handleChange('glasgow', novos)}
              pupilasFotorreativas={dados.pupilasFotorreativas}
            />

            {/* Última Refeição */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Última Refeição:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ref_cafe', valor: 'café', label: 'Café' },
                  { id: 'ref_almoco', valor: 'almoço', label: 'Almoço' },
                  { id: 'ref_janta', valor: 'janta', label: 'Janta' },
                  { id: 'ref_nsabe', valor: 'não sabe informar', label: 'Não Sabe' },
                ].map((item) => {
                  const selecionado = dados.refeicao === item.valor;
                  return (
                    <label
                      key={item.id}
                      className={`text-center py-2.5 px-3 rounded-lg border text-sm font-semibold cursor-pointer transition-colors select-none ${
                        selecionado
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refeicao"
                        value={item.valor}
                        checked={selecionado}
                        onChange={() => handleChange('refeicao', item.valor as TipoRefeicao)}
                        className="hidden"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Alergia */}
            <div>
              <label htmlFor="alergia" className="block text-sm font-semibold text-slate-700 mb-1">
                Alergia:
              </label>
              <input
                type="text"
                id="alergia"
                value={dados.alergia}
                onChange={(e) => handleChange('alergia', e.target.value)}
                placeholder="Ex: Nega ou informe as alergias"
                className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Doenças */}
            <div>
              <label htmlFor="doencas" className="block text-sm font-semibold text-slate-700 mb-1">
                Doenças:
              </label>
              <input
                type="text"
                id="doencas"
                value={dados.doencas}
                onChange={(e) => handleChange('doencas', e.target.value)}
                placeholder="Ex: HAS, Diabetes, Cardiopatias..."
                className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Medicamentos */}
            <div>
              <label htmlFor="medicamentos" className="block text-sm font-semibold text-slate-700 mb-1">
                Medicamentos:
              </label>
              <input
                type="text"
                id="medicamentos"
                value={dados.medicamentos}
                onChange={(e) => handleChange('medicamentos', e.target.value)}
                placeholder="Medicamentos de uso contínuo"
                className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </section>

        {/* 5. CASO */}
        <section aria-labelledby="sec-caso" className="mb-4">
          <div
            id="sec-caso"
            className="bg-slate-200 text-slate-800 px-3 py-2 font-bold text-xs uppercase tracking-wider rounded border-l-4 border-blue-600 mb-3 flex items-center gap-1.5"
          >
            <ClipboardList className="w-4 h-4 text-blue-700" />
            <span>5. Caso</span>
          </div>

          <div>
            <label htmlFor="situacao" className="block text-sm font-semibold text-slate-700 mb-1">
              Situação:
            </label>
            <textarea
              id="situacao"
              rows={3}
              value={dados.situacao}
              onChange={(e) => handleChange('situacao', e.target.value)}
              placeholder="Descreva a dinâmica da ocorrência, queixas da vítima, achados do exame físico e condições no local..."
              className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600 resize-y"
            />
          </div>
        </section>

        {/* 6. CENÁRIO / APOIO */}
        <section aria-labelledby="sec-cenario" className="mb-4">
          <div
            id="sec-cenario"
            className="bg-slate-200 text-slate-800 px-3 py-2 font-bold text-xs uppercase tracking-wider rounded border-l-4 border-blue-600 mb-3 flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4 text-blue-700" />
            <span>6. Cenário / Apoio</span>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 space-y-4">
            {/* Viatura(s) de Apoio */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="check_pm"
                  checked={dados.temApoio}
                  onChange={(e) => handleChange('temApoio', e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-800">
                  🚨 Viatura(s) de Apoio
                </span>
              </label>

              {dados.temApoio && (
                <div className="mt-3 pl-2 sm:pl-4 space-y-3 border-l-2 border-blue-400">
                  {dados.viaturasApoio.map((apoio, idx) => (
                    <div
                      key={apoio.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-2"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Apoio {idx + 1}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Comandante:
                          </label>
                          <input
                            type="text"
                            value={apoio.comandante}
                            onChange={(e) => updateApoio(apoio.id, 'comandante', e.target.value)}
                            placeholder="Ex: Sgt Silva"
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Viatura:
                          </label>
                          <input
                            type="text"
                            value={apoio.viatura}
                            onChange={(e) => updateApoio(apoio.id, 'viatura', e.target.value)}
                            placeholder="Ex: M-12345"
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      {dados.viaturasApoio.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeApoio(apoio.id)}
                          className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer pt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Apoio</span>
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addApoio}
                    className="flex items-center justify-center gap-1.5 w-full sm:w-auto bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-lg cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Mais 1 Apoio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Acidente de Trânsito */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="check_acidente"
                  checked={dados.temAcidente}
                  onChange={(e) => handleChange('temAcidente', e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 border-slate-300 cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-800">
                  💥 Acidente de Trânsito
                </span>
              </label>

              {dados.temAcidente && (
                <div className="mt-3 pl-2 sm:pl-4 space-y-3 border-l-2 border-amber-400">
                  {dados.veiculosAcidente.map((veiculo, idx) => (
                    <div
                      key={veiculo.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-2"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-slate-600" />
                        <span>Veículo {idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Veículo:
                          </label>
                          <input
                            type="text"
                            value={veiculo.veiculo}
                            onChange={(e) => updateVeiculo(veiculo.id, 'veiculo', e.target.value)}
                            placeholder="Ex: Fiat Uno Preto"
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Placa:
                          </label>
                          <input
                            type="text"
                            value={veiculo.placa}
                            onChange={(e) => updateVeiculo(veiculo.id, 'placa', e.target.value)}
                            placeholder="Ex: ABC-1234"
                            className="w-full p-2 border border-slate-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      {dados.veiculosAcidente.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVeiculo(veiculo.id)}
                          className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer pt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Veículo</span>
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addVeiculo}
                    className="flex items-center justify-center gap-1.5 w-full sm:w-auto bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-lg cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Mais 1 Veículo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 7. REGULAÇÃO */}
        <section aria-labelledby="sec-regulacao" className="mb-4">
          <div
            id="sec-regulacao"
            className="bg-slate-200 text-slate-800 px-3 py-2 font-bold text-xs uppercase tracking-wider rounded border-l-4 border-blue-600 mb-3 flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4 text-blue-700" />
            <span>7. Regulação</span>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="regulado" className="block text-sm font-semibold text-slate-700 mb-1">
                Regulado para:
              </label>
              <input
                type="text"
                id="regulado"
                value={dados.reguladoPara}
                onChange={(e) => handleChange('reguladoPara', e.target.value)}
                placeholder="Ex: PS Central / UPA / Hospital Geral"
                className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dr" className="block text-sm font-semibold text-slate-700 mb-1">
                  Dr:
                </label>
                <input
                  type="text"
                  id="dr"
                  value={dados.dr}
                  onChange={(e) => handleChange('dr', e.target.value)}
                  placeholder="Médico regulador"
                  className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="senha" className="block text-sm font-semibold text-slate-700 mb-1">
                  Senha:
                </label>
                <input
                  type="text"
                  id="senha"
                  value={dados.senha}
                  onChange={(e) => handleChange('senha', e.target.value)}
                  placeholder="Número da regulação"
                  className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cuidados" className="block text-sm font-semibold text-slate-700 mb-1">
                Vítima admitida aos cuidados do(a):
              </label>
              <input
                type="text"
                id="cuidados"
                value={dados.cuidados}
                onChange={(e) => handleChange('cuidados', e.target.value)}
                placeholder="Nome do médico / enfermeiro que recebeu"
                className="w-full p-3 border border-slate-300 rounded-lg text-base bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </section>

        {/* Botão de Ação Primária: Gerar Relatório */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGerarRelatorio}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold py-4 px-6 rounded-xl shadow-md transition-all cursor-pointer text-lg tracking-wide"
          >
            <FileCheck className="w-6 h-6" />
            <span>Gerar Relatório</span>
          </button>
        </div>

        {/* Seção de Resultado e Cópia */}
        <div ref={resultadoRef}>
          <ReportOutput relatorioTexto={relatorioGerado} />
        </div>
      </main>

      <OfflineIndicator />
    </div>
  );
}
