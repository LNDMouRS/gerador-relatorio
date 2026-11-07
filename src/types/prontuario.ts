export interface ViaturaApoio {
  id: string;
  comandante: string;
  viatura: string;
}

export interface VeiculoAcidente {
  id: string;
  veiculo: string;
  placa: string;
}

export type TipoRefeicao = 'café' | 'almoço' | 'janta' | 'não sabe informar' | '';

export interface ProcedimentosRealizados {
  nenhum: boolean;
  padrao: boolean;
  imobilizacao: boolean;
  oxigenio: boolean;
  interhospitalar: boolean;
  outro: boolean;
  outroTexto: string;
}

export interface GlasgowParametros {
  ocular: number; // 0 (não selecionado) ou 1-4
  verbal: number; // 0 ou 1-5
  motora: number; // 0 ou 1-6
}

export interface ProntuarioData {
  // 1. Chamado
  despacho: string;
  endereco: string;

  // 2. Identificação
  paciente: string;
  idade: string;
  dn: string;
  cpf: string;
  mae: string;
  temFotoDoc: boolean;

  // 3. Procedimentos
  procedimentos: ProcedimentosRealizados;

  // 4. Sinais Vitais & Avaliação
  pa: string;
  sat: string;
  fc: string;
  fr: string;
  pupilasTipo: string; // Isocóricas | Mióticas | Midriáticas | Anisocóricas | ''
  pupilasFotorreativas: boolean;
  pele: string;
  glasgow: GlasgowParametros;
  glasgowTextoManual?: string;
  refeicao: TipoRefeicao;
  alergia: string;
  doencas: string;
  medicamentos: string;

  // 5. Caso
  situacao: string;

  // 6. Cenário / Apoio
  temApoio: boolean;
  viaturasApoio: ViaturaApoio[];
  temAcidente: boolean;
  veiculosAcidente: VeiculoAcidente[];

  // 7. Regulação
  reguladoPara: string;
  dr: string;
  senha: string;
  cuidados: string;
}

export interface ExtractedDocData {
  cpf?: string;
  dn?: string;
  idade?: number;
  paciente?: string;
  mae?: string;
  camposPreenchidos: number;
}
