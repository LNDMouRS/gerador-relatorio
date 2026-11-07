import React from 'react';
import { Brain, AlertCircle } from 'lucide-react';
import type { GlasgowParametros } from '../types/prontuario';
import { calcularGlasgow } from '../utils/prontuario';

interface GlasgowCalculatorProps {
  parametros: GlasgowParametros;
  onChange: (novosParams: GlasgowParametros) => void;
  pupilasFotorreativas: boolean;
}

export const GlasgowCalculator: React.FC<GlasgowCalculatorProps> = ({
  parametros,
  onChange,
  pupilasFotorreativas,
}) => {
  const { ocular, verbal, motora } = parametros;
  const resultado = calcularGlasgow(parametros, pupilasFotorreativas);

  const handleSelect = (campo: keyof GlasgowParametros, valor: number) => {
    onChange({
      ...parametros,
      [campo]: valor,
    });
  };

  const getSeveridadeBadge = (total: number) => {
    if (total >= 13) {
      return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">Trauma Leve (13-15)</span>;
    }
    if (total >= 9) {
      return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">Trauma Moderado (9-12)</span>;
    }
    return <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2 py-0.5 rounded-full">Trauma Grave (3-8)</span>;
  };

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 mt-3 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5 cursor-default">
          <Brain className="w-4 h-4 text-blue-700" />
          <span>Escala de Glasgow (GCS-P)</span>
        </label>
        {resultado && getSeveridadeBadge(resultado.total)}
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Abertura Ocular:
          </label>
          <select
            value={ocular}
            onChange={(e) => handleSelect('ocular', Number(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value={0}>Selecione...</option>
            <option value={4}>Espontânea (4)</option>
            <option value={3}>Ao som / chamado (3)</option>
            <option value={2}>À pressão / estímulo doloroso (2)</option>
            <option value={1}>Ausente (1)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Resposta Verbal:
          </label>
          <select
            value={verbal}
            onChange={(e) => handleSelect('verbal', Number(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value={0}>Selecione...</option>
            <option value={5}>Orientada (5)</option>
            <option value={4}>Confusa (4)</option>
            <option value={3}>Palavras inapropriadas (3)</option>
            <option value={2}>Sons incompreensíveis (2)</option>
            <option value={1}>Ausente (1)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Resposta Motora:
          </label>
          <select
            value={motora}
            onChange={(e) => handleSelect('motora', Number(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value={0}>Selecione...</option>
            <option value={6}>Obedece a comandos (6)</option>
            <option value={5}>Localiza a dor (5)</option>
            <option value={4}>Flexão normal (retirada) (4)</option>
            <option value={3}>Flexão anormal (decorticação) (3)</option>
            <option value={2}>Extensão anormal (descerebração) (2)</option>
            <option value={1}>Ausente (1)</option>
          </select>
        </div>

        <div className="pt-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Total Calculado:
          </label>
          <input
            type="text"
            readOnly
            value={resultado ? resultado.textoFormatado : ''}
            placeholder="Aguardando seleção dos 3 parâmetros..."
            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold bg-slate-100 text-slate-800"
          />
          {!pupilasFotorreativas && resultado && (
            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Desconto de 2 pontos aplicado por pupilas não fotorreativas (GCS-Pupilas).</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
