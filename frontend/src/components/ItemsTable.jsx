import React from 'react';

const BRL = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '-';

export default function ItemsTable({ adicoes, onUpdateItem, onToggleReducao, reprocessando }) {
  return (
    <div className="space-y-6">
      {reprocessando && (
        <div className="text-center text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-2">
          Atualizando redução de PIS/COFINS…
        </div>
      )}
      {adicoes.map((adicao, ai) => (
        <div key={ai} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-800 text-white px-4 py-3 flex items-center gap-3">
            <span className="font-bold text-lg">ADIÇÃO {String(ai + 1).padStart(3, '0')}</span>
            <span className="text-gray-300 text-sm">NCM {adicao.ncm}</span>
            <span className="text-blue-300 text-sm font-medium truncate max-w-[40%]">{adicao.config.descricao}</span>

            {/* Toggle de redução PIS/COFINS */}
            {onToggleReducao && (
              <label className="ml-auto flex items-center gap-2 text-xs cursor-pointer select-none">
                <span className={adicao.reducao ? 'text-green-300 font-semibold' : 'text-gray-400'}>
                  PIS/COFINS c/ redução
                </span>
                <button
                  type="button"
                  disabled={reprocessando}
                  onClick={() => onToggleReducao(ai, !adicao.reducao)}
                  className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50
                    ${adicao.reducao ? 'bg-green-500' : 'bg-gray-600'}`}
                  title={adicao.reducao !== adicao.reducaoAuto ? 'Ajustado manualmente' : 'Detectado automaticamente'}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform
                    ${adicao.reducao ? 'translate-x-5' : ''}`} />
                </button>
                {adicao.reducao !== adicao.reducaoAuto && (
                  <span className="text-yellow-300" title="Diferente do detectado automaticamente">●</span>
                )}
              </label>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left w-24">Código ERP</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-right w-16">Qtd</th>
                  <th className="px-3 py-2 text-right w-36">Vl. Unitário</th>
                  <th className="px-3 py-2 text-right w-32">Vl. Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adicao.itens.map((item, ii) => {
                  const prefixo = item._codigo
                    ? `${item._codigo}${item._tipoIP ? 'IP-' : '-'}`
                    : '';
                  const prefixoOk = item._codigo?.length === 4;

                  return (
                    <tr key={ii} className="hover:bg-gray-50">

                      {/* Coluna código */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="0000"
                              value={item._codigo || ''}
                              onChange={e => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                                onUpdateItem(ai, ii, '_codigo', v);
                              }}
                              className={`w-14 border rounded px-1 py-0.5 text-sm font-mono outline-none text-center
                                ${prefixoOk ? 'border-green-400 bg-green-50' : 'border-gray-300 focus:border-blue-400'}`}
                            />
                            <span className="text-gray-400 font-mono text-xs">
                              {item._tipoIP ? 'IP-' : '-'}
                            </span>
                          </div>

                          {/* Toggle existente / novo */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => onUpdateItem(ai, ii, '_tipoIP', false)}
                              className={`text-xs px-1.5 py-0.5 rounded border transition-colors
                                ${!item._tipoIP
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'}`}
                            >
                              Exist.
                            </button>
                            <button
                              onClick={() => onUpdateItem(ai, ii, '_tipoIP', true)}
                              className={`text-xs px-1.5 py-0.5 rounded border transition-colors
                                ${item._tipoIP
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-white text-gray-500 border-gray-300 hover:border-purple-400'}`}
                            >
                              Novo IP
                            </button>
                          </div>

                          {/* Preview do prefixo */}
                          {prefixoOk && (
                            <span className={`text-xs font-mono font-bold ${item._tipoIP ? 'text-purple-600' : 'text-blue-600'}`}>
                              {prefixo}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Descrição editável */}
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-1">
                          {prefixoOk && (
                            <span className={`mt-0.5 text-xs font-mono font-bold shrink-0 ${item._tipoIP ? 'text-purple-600' : 'text-blue-600'}`}>
                              {prefixo}
                            </span>
                          )}
                          <textarea
                            rows={2}
                            className="w-full border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-1 py-0.5 text-sm outline-none resize-none"
                            value={item.descricao}
                            onChange={e => onUpdateItem(ai, ii, 'descricao', e.target.value)}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2 text-right text-gray-600 align-top pt-3">{item.qtd}</td>

                      <td className="px-3 py-2 text-right align-top pt-3">
                        <input
                          type="number"
                          className="w-32 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-1 py-0.5 text-sm outline-none text-right"
                          value={item.vlUnit}
                          step="0.01"
                          onChange={e => onUpdateItem(ai, ii, 'vlUnit', parseFloat(e.target.value) || 0)}
                        />
                      </td>

                      <td className="px-3 py-2 text-right font-medium align-top pt-3">
                        {BRL(item.vlTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TributosPanel tributos={adicao.tributos} />
        </div>
      ))}
    </div>
  );
}

function TributosPanel({ tributos }) {
  const fmt = v => (parseInt(v, 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-600">
      <span><b>II:</b> {fmt(tributos.iiAliquotaValorDevido)}</span>
      <span><b>IPI:</b> {fmt(tributos.ipiAliquotaValorDevido)}</span>
      <span><b>PIS:</b> {fmt(tributos.pisPasepAliquotaValorDevido)}</span>
      <span><b>COFINS:</b> {fmt(tributos.cofinsAliquotaValorDevido)}</span>
      <span><b>AFRMM:</b> {fmt(tributos.valorReaisFreteInternacional)}</span>
      <span className="ml-auto font-semibold text-gray-700">
        Total BRL: {(parseInt(tributos.condicaoVendaValorReais) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  );
}
