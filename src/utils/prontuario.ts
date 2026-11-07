import type { ProntuarioData, ExtractedDocData, GlasgowParametros } from '../types/prontuario';

/**
 * Máscara para Pressão Arterial (PA): Formato 120/80 ou 090/60
 */
export function mascaraPA(valor: string): string {
  let limpo = valor.replace(/\D/g, '').substring(0, 6);
  if (limpo.length > 3) {
    limpo = limpo.replace(/^(\d{3})(\d)/, '$1/$2');
  }
  return limpo;
}

/**
 * Máscara para CPF: Formato 000.000.000-00
 */
export function mascaraCPF(valor: string): string {
  let limpo = valor.replace(/\D/g, '').substring(0, 11);
  limpo = limpo.replace(/(\d{3})(\d)/, '$1.$2');
  limpo = limpo.replace(/(\d{3})(\d)/, '$1.$2');
  limpo = limpo.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return limpo;
}

/**
 * Máscara para Data de Nascimento (DN): Formato dd/mm/aaaa
 */
export function mascaraData(valor: string): string {
  let limpo = valor.replace(/\D/g, '').substring(0, 8);
  if (limpo.length > 4) {
    limpo = limpo.replace(/^(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
  } else if (limpo.length > 2) {
    limpo = limpo.replace(/^(\d{2})(\d{1,2})/, '$1/$2');
  }
  return limpo;
}

/**
 * Calcula idade em anos a partir de uma data no formato dd/mm/aaaa
 */
export function calcularIdade(dataStr: string, dataReferencia: Date = new Date()): number | null {
  if (!dataStr || dataStr.length !== 10) return null;

  const partes = dataStr.split('/');
  if (partes.length !== 3) return null;

  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const ano = parseInt(partes[2], 10);

  if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
  if (ano < 1900 || ano > dataReferencia.getFullYear()) return null;
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;

  const dataNasc = new Date(ano, mes, dia);
  if (
    dataNasc.getFullYear() !== ano ||
    dataNasc.getMonth() !== mes ||
    dataNasc.getDate() !== dia
  ) {
    return null;
  }

  let idade = dataReferencia.getFullYear() - dataNasc.getFullYear();
  const diferencaMes = dataReferencia.getMonth() - dataNasc.getMonth();

  if (diferencaMes < 0 || (diferencaMes === 0 && dataReferencia.getDate() < dataNasc.getDate())) {
    idade--;
  }

  if (!isNaN(idade) && idade >= 0 && idade <= 130) {
    return idade;
  }

  return null;
}

/**
 * Cálculo da Escala de Glasgow (GCS-P)
 * Soma dos escores (Ocular 1-4, Verbal 1-5, Motora 1-6)
 * Se pupilas não fotorreativas, aplica desconto de -2 (mínimo 1)
 */
export function calcularGlasgow(
  params: GlasgowParametros,
  fotorreativas: boolean = true
): { total: number; textoFormatado: string } | null {
  const { ocular, verbal, motora } = params;

  if (ocular >= 1 && ocular <= 4 && verbal >= 1 && verbal <= 5 && motora >= 1 && motora <= 6) {
    let total = ocular + verbal + motora;
    const descontoPupila = !fotorreativas ? 2 : 0;

    total = total - descontoPupila;
    if (total < 1) total = 1;

    let textoFinal = String(total);
    if (descontoPupila > 0) {
      textoFinal += ' (-2 Pupilas não fotorreativas)';
    }

    return { total, textoFormatado: textoFinal };
  }

  return null;
}

const PALAVRAS_IGNORADAS = [
  'REPUBLICA',
  'FEDERATIVA',
  'BRASIL',
  'GOVERNO',
  'ESTADO',
  'SECRETARIA',
  'CARTEIRA',
  'NACIONAL',
  'HABILITACAO',
  'IDENTIDADE',
  'REGISTRO',
  'GERAL',
  'DEPARTAMENTO',
  'TRANSITO',
  'DETRAN',
  'MINISTERIO',
  'INFRAESTRUTURA',
  'VALIDADE',
  'EMISSAO',
  'LOCAL',
  'DATA',
  'NASCIMENTO',
  'ASSINATURA',
  'PORTADOR',
  'OBSERVACOES',
  'CATEGORIA',
  'PERMISSAO',
  'PROIBIDO',
  'PLASTIFICAR',
  'NATURALIDADE',
  'DOC',
  'ORIGEM',
  'CPF',
  'FILIACAO',
  'SSP',
  'SEGURANCA',
  'PUBLICA',
];

function ehLinhaDeNomeValida(str: string): string | false {
  const limpa = str.replace(/[^A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]/g, '').trim();
  if (limpa.length < 5) return false;
  const partes = limpa.split(/\s+/).filter(Boolean);
  if (partes.length < 2) return false;
  for (const p of PALAVRAS_IGNORADAS) {
    if (limpa.includes(p)) return false;
  }
  return limpa;
}

/**
 * Extração de dados a partir do texto lido via OCR (RG, CNH, Certidões)
 */
export function extrairDadosDoTexto(texto: string, anoReferencia: number = new Date().getFullYear()): ExtractedDocData {
  let camposPreenchidos = 0;
  const textoLimpo = (texto || '').toUpperCase();
  const linhas = textoLimpo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const resultado: ExtractedDocData = { camposPreenchidos: 0 };

  // 1. EXTRAIR CPF
  const regexCPF = /\b(\d{3})[\.\s]?(\d{3})[\.\s]?(\d{3})[-\/\.\s](\d{2})\b/;
  let matchCPF = textoLimpo.match(regexCPF);
  if (!matchCPF) {
    const matchCpfSemMascara = textoLimpo.match(/CPF[:\s\.\-]*(\d{11})\b/);
    if (matchCpfSemMascara) {
      const num = matchCpfSemMascara[1];
      matchCPF = [num, num.slice(0, 3), num.slice(3, 6), num.slice(6, 9), num.slice(9, 11)];
    }
  }

  if (matchCPF) {
    resultado.cpf = `${matchCPF[1]}.${matchCPF[2]}.${matchCPF[3]}-${matchCPF[4]}`;
    camposPreenchidos++;
  }

  // 2. EXTRAIR DATA DE NASCIMENTO (dd/mm/aaaa)
  const regexData = /\b(0[1-9]|[12][0-9]|3[01])[\/\-\.](0[1-9]|1[012])[\/\-\.](19\d{2}|20\d{2})\b/g;
  const datasEncontradas: { formatada: string; ano: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = regexData.exec(textoLimpo)) !== null) {
    const dia = m[1];
    const mes = m[2];
    const ano = parseInt(m[3], 10);
    if (ano >= 1900 && ano <= anoReferencia) {
      datasEncontradas.push({ formatada: `${dia}/${mes}/${ano}`, ano });
    }
  }

  if (datasEncontradas.length > 0) {
    // Data de nascimento em documentos é a data com ano mais antigo (comparado a emissão/validade)
    datasEncontradas.sort((a, b) => a.ano - b.ano);
    resultado.dn = datasEncontradas[0].formatada;
    const idade = calcularIdade(resultado.dn);
    if (idade !== null) {
      resultado.idade = idade;
    }
    camposPreenchidos++;
  }

  // 3. EXTRAIR NOME DO PACIENTE E MÃE
  let nomeEncontrado = '';
  let maeEncontrada = '';

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Procura marcador de NOME
    if (!nomeEncontrado && /\b(NOME|N0ME)\b/.test(linha) && !linha.includes('SOCIAL')) {
      const posNome = linha.replace(/.*?\b(NOME|N0ME)\b[:\.\-\s]*/, '').trim();
      const validoMesmaLinha = ehLinhaDeNomeValida(posNome);
      if (validoMesmaLinha) {
        nomeEncontrado = validoMesmaLinha;
      } else if (i + 1 < linhas.length) {
        const validoProxLinha = ehLinhaDeNomeValida(linhas[i + 1]);
        if (validoProxLinha) nomeEncontrado = validoProxLinha;
      }
    }

    // Procura marcador de FILIAÇÃO / MÃE
    if (!maeEncontrada && /\b(FILIACAO|FILIAÇÃO|MAE|MÃE)\b/.test(linha)) {
      const candidatosFiliacao: string[] = [];
      for (let j = i + 1; j <= Math.min(i + 3, linhas.length - 1); j++) {
        const cand = ehLinhaDeNomeValida(linhas[j]);
        if (cand) candidatosFiliacao.push(cand);
      }
      if (candidatosFiliacao.length >= 2) {
        maeEncontrada = candidatosFiliacao[1]; // Tradicionalmente o 2º nome listado na filiação é a mãe
      } else if (candidatosFiliacao.length === 1) {
        maeEncontrada = candidatosFiliacao[0];
      }
    }
  }

  // Fallback se não achou "NOME:" explícito, procura a primeira linha que parece um nome próprio válido
  if (!nomeEncontrado) {
    for (let i = 0; i < Math.min(linhas.length, 6); i++) {
      const cand = ehLinhaDeNomeValida(linhas[i]);
      if (cand && !cand.includes('ESTADO') && !cand.includes('SSP')) {
        nomeEncontrado = cand;
        break;
      }
    }
  }

  if (nomeEncontrado) {
    resultado.paciente = nomeEncontrado;
    camposPreenchidos++;
  }

  if (maeEncontrada) {
    resultado.mae = maeEncontrada;
    camposPreenchidos++;
  }

  resultado.camposPreenchidos = camposPreenchidos;
  return resultado;
}

/**
 * GERAÇÃO COMPLETA DO TEXTO DO RELATÓRIO / PRONTUÁRIO
 * Segue rigorosamente o padrão APH / SAMU / Resgate
 */
export function gerarRelatorioTexto(dados: ProntuarioData): string {
  const linhas: string[] = [];

  function add(label: string, valor: string | undefined) {
    const val = (valor || '').trim();
    if (val !== '') {
      linhas.push(`${label}: ${val}`);
    }
  }

  // 1. CHAMADO
  add('Despacho', dados.despacho);
  add('Endereço', dados.endereco);

  // 2. IDENTIFICAÇÃO
  const temIdentificacao =
    dados.paciente.trim() !== '' ||
    dados.idade.trim() !== '' ||
    dados.dn.trim() !== '' ||
    dados.cpf.trim() !== '' ||
    dados.mae.trim() !== '' ||
    dados.temFotoDoc;

  if (temIdentificacao && linhas.length > 0) {
    linhas.push('');
  }

  add('Paciente', dados.paciente);
  add('Idade', dados.idade);
  add('DN', dados.dn);
  add('CPF', dados.cpf);
  add('Mãe', dados.mae);
  if (dados.temFotoDoc) {
    linhas.push('Documento: Foto capturada em anexo');
  }

  // 3. PROCEDIMENTO REALIZADO
  const procs: string[] = [];
  const p = dados.procedimentos;
  if (p.nenhum) {
    procs.push('sem intervenção');
  } else {
    if (p.padrao) {
      procs.push('abordagem, exame primário e secundário, avaliação e monitoramento dos sinais vitais e transporte');
    }
    if (p.imobilizacao) {
      procs.push('imobilização, contenção');
    }
    if (p.oxigenio) {
      procs.push('oxigênio terapia');
    }
    if (p.interhospitalar) {
      procs.push('transporte interhospitalar');
    }
    if (p.outro && p.outroTexto.trim()) {
      procs.push(p.outroTexto.trim());
    }
  }

  if (procs.length > 0) {
    if (linhas.length > 0) linhas.push('');
    linhas.push('Procedimento realizado: ' + procs.join(', '));
  }

  // 4. SINAIS VITAIS & AVALIAÇÃO
  const pa = dados.pa.trim();
  const sat = dados.sat.trim();
  const fc = dados.fc.trim();
  const fr = dados.fr.trim();
  const pupilaTipo = dados.pupilasTipo.trim();
  const pele = dados.pele.trim();

  // Glasgow calculado ou manual
  let glasgowTexto = '';
  const glasgowCalc = calcularGlasgow(dados.glasgow, dados.pupilasFotorreativas);
  if (glasgowCalc) {
    glasgowTexto = glasgowCalc.textoFormatado;
  } else if (dados.glasgowTextoManual?.trim()) {
    glasgowTexto = dados.glasgowTextoManual.trim();
  }

  const refeicao = dados.refeicao;
  const alergia = dados.alergia.trim();
  const doencas = dados.doencas.trim();
  const medicamentos = dados.medicamentos.trim();

  const temSinais =
    pa !== '' ||
    sat !== '' ||
    fc !== '' ||
    fr !== '' ||
    pupilaTipo !== '' ||
    pele !== '' ||
    glasgowTexto !== '' ||
    refeicao !== '' ||
    alergia !== '' ||
    doencas !== '' ||
    medicamentos !== '';

  if (temSinais && linhas.length > 0) {
    linhas.push('');
  }

  if (pa !== '') linhas.push('PA: ' + pa);
  if (sat !== '') linhas.push('SAT: ' + sat + '% a.a');
  if (fc !== '') linhas.push('FC: ' + fc + ' bpm');
  if (fr !== '') linhas.push('FR: ' + fr + ' mrpm');

  if (pupilaTipo !== '') {
    const pupilaReacao = dados.pupilasFotorreativas ? 'fotorreativas' : 'não fotorreativas';
    linhas.push('Pupilas: ' + pupilaTipo + ', ' + pupilaReacao);
  }

  add('Pele', pele);
  if (glasgowTexto !== '') {
    linhas.push('Glasgow: ' + glasgowTexto);
  }

  if (refeicao) {
    linhas.push('Última refeição: ' + refeicao);
  }
  add('Alergia', alergia);
  add('Doenças', doencas);
  add('Medicamentos', medicamentos);

  // 5. CASO
  const situacao = dados.situacao.trim();
  if (situacao !== '') {
    if (linhas.length > 0) linhas.push('');
    linhas.push('Situação: ' + situacao);
  }

  // 6. CENÁRIO / APOIO
  const linhasCenario: string[] = [];

  if (dados.temApoio && dados.viaturasApoio.length > 0) {
    dados.viaturasApoio.forEach((apoio, idx) => {
      const cmd = apoio.comandante.trim();
      const vtr = apoio.viatura.trim();
      if (cmd || vtr) {
        linhasCenario.push(
          `Apoio ${idx + 1} -> Comandante: ${cmd || 'N/I'} | Viatura: ${vtr || 'N/I'}`
        );
      }
    });
  }

  if (dados.temAcidente && dados.veiculosAcidente.length > 0) {
    const blocoVeiculos: string[] = ['Acidente de Trânsito:'];
    let temVeiculoValido = false;

    dados.veiculosAcidente.forEach((item, idx) => {
      const veiculo = item.veiculo.trim();
      const placa = item.placa.trim();
      if (veiculo || placa) {
        blocoVeiculos.push(
          `  - Veículo ${idx + 1}: ${veiculo || 'N/I'} | Placa: ${placa || 'N/I'}`
        );
        temVeiculoValido = true;
      }
    });

    if (temVeiculoValido) {
      linhasCenario.push(...blocoVeiculos);
    }
  }

  if (linhasCenario.length > 0) {
    if (linhas.length > 0) linhas.push('');
    linhas.push(...linhasCenario);
  }

  // 7. REGULAÇÃO
  const regulado = dados.reguladoPara.trim();
  const dr = dados.dr.trim();
  const senha = dados.senha.trim();
  const cuidados = dados.cuidados.trim();

  if (regulado !== '' || dr !== '' || senha !== '' || cuidados !== '') {
    if (linhas.length > 0) linhas.push('');
  }

  if (regulado !== '') linhas.push('Regulado para: ' + regulado);
  if (dr !== '') linhas.push('Dr: ' + dr);
  if (senha !== '') linhas.push('Senha: ' + senha);
  if (cuidados !== '') linhas.push('Vítima admitida aos cuidados do(a) ' + cuidados);

  return linhas.join('\n').trim();
}
