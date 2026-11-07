import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mascaraPA,
  mascaraCPF,
  mascaraData,
  calcularIdade,
  calcularGlasgow,
  extrairDadosDoTexto,
  gerarRelatorioTexto,
} from './prontuario';
import type { ProntuarioData } from '../types/prontuario';

test('mascaraPA formats blood pressure with 3-digit systolic and 2-3 digit diastolic', () => {
  assert.equal(mascaraPA('12080'), '120/80');
  assert.equal(mascaraPA('09060'), '090/60');
  assert.equal(mascaraPA('140100'), '140/100');
  assert.equal(mascaraPA('abc12080xyz'), '120/80');
});

test('mascaraCPF formats 11 numeric digits with standard punctuation', () => {
  assert.equal(mascaraCPF('12345678901'), '123.456.789-01');
  assert.equal(mascaraCPF('00011122233'), '000.111.222-33');
});

test('mascaraData formats 8 digits as dd/mm/aaaa', () => {
  assert.equal(mascaraData('15081992'), '15/08/1992');
  assert.equal(mascaraData('01012000'), '01/01/2000');
});

test('calcularIdade accurately computes age considering months and days', () => {
  const refDate = new Date(2026, 10, 7); // 07 Nov 2026

  // Birthday already passed this year (born 15/05/1990) -> 36 years
  assert.equal(calcularIdade('15/05/1990', refDate), 36);

  // Birthday hasn't happened yet this year (born 25/12/1990) -> 35 years
  assert.equal(calcularIdade('25/12/1990', refDate), 35);

  // Born today exactly 20 years ago (07/11/2006) -> 20 years
  assert.equal(calcularIdade('07/11/2006', refDate), 20);

  // Invalid date format or future year
  assert.equal(calcularIdade('99/99/9999', refDate), null);
  assert.equal(calcularIdade('15/05/2099', refDate), null);
});

test('calcularGlasgow correctly handles GCS-P and pupil reactivity penalty', () => {
  // GCS 15 with photoreactive pupils
  const normal = calcularGlasgow({ ocular: 4, verbal: 5, motora: 6 }, true);
  assert.deepEqual(normal, { total: 15, textoFormatado: '15' });

  // GCS 15 with non-photoreactive pupils (penalty of -2 => 13)
  const nonPhoto = calcularGlasgow({ ocular: 4, verbal: 5, motora: 6 }, false);
  assert.deepEqual(nonPhoto, {
    total: 13,
    textoFormatado: '13 (-2 Pupilas não fotorreativas)',
  });

  // Severe trauma: 1, 1, 1 with penalty -> min clamped to 1
  const severe = calcularGlasgow({ ocular: 1, verbal: 1, motora: 1 }, false);
  assert.equal(severe?.total, 1);
  assert.ok(severe?.textoFormatado.includes('Pupilas não fotorreativas'));

  // Incomplete parameters should return null
  assert.equal(calcularGlasgow({ ocular: 0, verbal: 5, motora: 6 }, true), null);
});

test('extrairDadosDoTexto parses CPF, birth date, name, and mother from raw OCR text', () => {
  const sampleOCR = `
    REPUBLICA FEDERATIVA DO BRASIL
    CARTEIRA DE IDENTIDADE
    REGISTRO GERAL 12.345.678-9
    NOME
    CARLOS EDUARDO SILVA SANTOS
    FILIACAO
    JOSE PEREIRA SANTOS
    MARIA APARECIDA DA SILVA
    NATURALIDADE SAO PAULO - SP
    DATA NASCIMENTO
    14/06/1988
    DOC ORIGEM
    CPF 456.789.012-34
    EMISSAO 20/10/2020
  `;

  const extraido = extrairDadosDoTexto(sampleOCR, 2026);
  assert.equal(extraido.cpf, '456.789.012-34');
  assert.equal(extraido.dn, '14/06/1988');
  assert.equal(extraido.paciente, 'CARLOS EDUARDO SILVA SANTOS');
  assert.equal(extraido.mae, 'MARIA APARECIDA DA SILVA');
  assert.equal(extraido.idade, 38);
  assert.ok(extraido.camposPreenchidos >= 4);
});

test('gerarRelatorioTexto produces the exact expected structure for ambulance records', () => {
  const dadosMock: ProntuarioData = {
    despacho: 'B01',
    endereco: 'Av. Paulista, 1000 - Bela Vista',
    paciente: 'JOAO DA SILVA',
    idade: '35',
    dn: '10/02/1991',
    cpf: '123.456.789-00',
    mae: 'ANA DA SILVA',
    temFotoDoc: true,
    procedimentos: {
      nenhum: false,
      padrao: true,
      imobilizacao: true,
      oxigenio: false,
      interhospitalar: false,
      outro: true,
      outroTexto: 'curativo compressivo em MSE',
    },
    pa: '120/80',
    sat: '98',
    fc: '78',
    fr: '16',
    pupilasTipo: 'Isocóricas',
    pupilasFotorreativas: true,
    pele: 'corada, aquecida',
    glasgow: { ocular: 4, verbal: 5, motora: 6 },
    refeicao: 'almoço',
    alergia: 'Dipirona',
    doencas: 'HAS controlada',
    medicamentos: 'Losartana 50mg',
    situacao: 'Queda de nível, vítima consciente e orientada referindo dor em MSE.',
    temApoio: true,
    viaturasApoio: [
      { id: '1', comandante: 'Sgt Souza', viatura: 'M-12345' },
    ],
    temAcidente: true,
    veiculosAcidente: [
      { id: '1', veiculo: 'Honda Civic Prata', placa: 'ABC-1234' },
    ],
    reguladoPara: 'PS Central',
    dr: 'Carlos Albuquerque',
    senha: '9841',
    cuidados: 'Dra. Fernanda (plantonista emergência)',
  };

  const relatorio = gerarRelatorioTexto(dadosMock);

  assert.ok(relatorio.includes('Despacho: B01'));
  assert.ok(relatorio.includes('Endereço: Av. Paulista, 1000 - Bela Vista'));
  assert.ok(relatorio.includes('Paciente: JOAO DA SILVA'));
  assert.ok(relatorio.includes('Documento: Foto capturada em anexo'));
  assert.ok(relatorio.includes('Procedimento realizado: abordagem, exame primário e secundário, avaliação e monitoramento dos sinais vitais e transporte, imobilização, contenção, curativo compressivo em MSE'));
  assert.ok(relatorio.includes('PA: 120/80'));
  assert.ok(relatorio.includes('SAT: 98% a.a'));
  assert.ok(relatorio.includes('FC: 78 bpm'));
  assert.ok(relatorio.includes('FR: 16 mrpm'));
  assert.ok(relatorio.includes('Pupilas: Isocóricas, fotorreativas'));
  assert.ok(relatorio.includes('Glasgow: 15'));
  assert.ok(relatorio.includes('Última refeição: almoço'));
  assert.ok(relatorio.includes('Apoio 1 -> Comandante: Sgt Souza | Viatura: M-12345'));
  assert.ok(relatorio.includes('Acidente de Trânsito:'));
  assert.ok(relatorio.includes('  - Veículo 1: Honda Civic Prata | Placa: ABC-1234'));
  assert.ok(relatorio.includes('Regulado para: PS Central'));
  assert.ok(relatorio.includes('Senha: 9841'));
});
