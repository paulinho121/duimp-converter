import React, { useState, useCallback } from 'react';
import UploadZone from './components/UploadZone';
import ItemsTable from './components/ItemsTable';
import DownloadButton from './components/DownloadButton';
import { convertFiles, debugExcel } from './services/api';

const BRL = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '-';

export default function App() {
  const [mode, setMode] = useState('excel'); // 'excel' | 'xml'
  const [duimpFile, setDuimpFile] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [xmlFile, setXmlFile] = useState(null);
  const [taxaCambio, setTaxaCambio] = useState('');
  const [loading, setLoading] = useState(false);
  const [reprocessando, setReprocessando] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [adicoes, setAdicoes] = useState([]);
  const [reducaoOverrides, setReducaoOverrides] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);

  const espelhoFile = mode === 'xml' ? xmlFile : excelFile;
  const podeProcessar = duimpFile && espelhoFile && (mode !== 'xml' || taxaCambio.trim());

  // Preserva as edições do usuário (código ERP, tipo IP, descrição) ao reprocessar
  function mergeEdits(oldAd, newAd) {
    return newAd.map((a, ai) => ({
      ...a,
      itens: a.itens.map((item, ii) => {
        const old = oldAd?.[ai]?.itens?.[ii];
        return old ? { ...item, _codigo: old._codigo, _tipoIP: old._tipoIP, descricao: old.descricao } : item;
      }),
    }));
  }

  async function handleConvert() {
    if (!duimpFile || !espelhoFile) {
      setError('Selecione o PDF da DUIMP e o espelho antes de processar.');
      return;
    }
    if (mode === 'xml' && !taxaCambio.trim()) {
      setError('Informe a taxa de câmbio (Dólar Fiscal) para o espelho em XML.');
      return;
    }
    setError('');
    setLoading(true);
    setReducaoOverrides([]);
    try {
      const data = await convertFiles(duimpFile, espelhoFile, mode, taxaCambio, []);
      setResult(data);
      setAdicoes(data.adicoes);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Erro ao processar arquivos.');
    } finally {
      setLoading(false);
    }
  }

  // Liga/desliga a redução de PIS/COFINS de uma adição e reprocessa no backend,
  // preservando as edições feitas na tela.
  async function handleToggleReducao(ai, value) {
    const novos = [...reducaoOverrides];
    novos[ai] = value;
    setReducaoOverrides(novos);
    setReprocessando(true);
    setError('');
    try {
      const data = await convertFiles(duimpFile, espelhoFile, mode, taxaCambio, novos);
      setAdicoes(prev => mergeEdits(prev, data.adicoes));
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Erro ao reprocessar.');
    } finally {
      setReprocessando(false);
    }
  }

  function handleUpdateItem(ai, ii, field, value) {
    setAdicoes(prev => {
      const next = prev.map((a, aIdx) => {
        if (aIdx !== ai) return a;
        const itens = a.itens.map((item, iIdx) =>
          iIdx === ii ? { ...item, [field]: value } : item
        );
        return { ...a, itens };
      });
      return next;
    });
  }

  function handleReset() {
    setResult(null);
    setAdicoes([]);
    setDuimpFile(null);
    setExcelFile(null);
    setXmlFile(null);
    setTaxaCambio('');
    setReducaoOverrides([]);
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Conversor DUIMP → XML
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Gera o arquivo XML para importação no sistema de gestão aduaneira
          </p>
        </div>

        {!result ? (
          /* Upload screen */
          <div className="bg-white rounded-2xl shadow-xl p-8">

            {/* Seletor de formato do espelho */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Formato do espelho
              </p>
              <div className="inline-flex rounded-xl bg-gray-100 p-1">
                <button
                  onClick={() => { setMode('excel'); setError(''); }}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    mode === 'excel' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📊 Excel (XLSX)
                </button>
                <button
                  onClick={() => { setMode('xml'); setError(''); }}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    mode === 'xml' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🧾 XML (NF-e)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <UploadZone
                label="DUIMP (PDF)"
                accept=".pdf"
                icon="📄"
                file={duimpFile}
                onFile={setDuimpFile}
              />
              {mode === 'excel' ? (
                <UploadZone
                  label="Espelho NF (XLSX)"
                  accept=".xlsx,.xls"
                  icon="📊"
                  file={excelFile}
                  onFile={setExcelFile}
                />
              ) : (
                <UploadZone
                  label="Espelho NF (XML)"
                  accept=".xml"
                  icon="🧾"
                  file={xmlFile}
                  onFile={setXmlFile}
                />
              )}
            </div>

            {/* Taxa de câmbio — obrigatória no modo XML (a NF-e não a contém) */}
            {mode === 'xml' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Taxa de câmbio (Dólar Fiscal)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={taxaCambio}
                  onChange={e => setTaxaCambio(e.target.value)}
                  placeholder="Ex.: 5,0139"
                  className="w-full md:w-64 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  A NF-e não traz a taxa de câmbio — informe o mesmo Dólar Fiscal usado no espelho.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleConvert}
              disabled={loading || !podeProcessar}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-lg rounded-xl transition-colors"
            >
              {loading ? 'Processando...' : 'PROCESSAR'}
            </button>

            {mode === 'excel' && excelFile && (
              <button
                onClick={async () => {
                  try {
                    const d = await debugExcel(excelFile);
                    setDebugInfo(d);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
                className="mt-2 w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-xl"
              >
                🔍 Inspecionar estrutura do Excel
              </button>
            )}

            {debugInfo && (
              <div className="mt-4 bg-gray-900 text-green-300 rounded-xl p-4 text-xs overflow-auto max-h-96 font-mono">
                <p className="text-yellow-300 font-bold mb-2">Abas: {debugInfo.sheetNames.join(', ')} | Total linhas: {debugInfo.totalLinhas}</p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left pr-3">Linha</th>
                      <th className="text-left pr-3">Col A</th>
                      <th className="text-left pr-3">Col B</th>
                      <th className="text-left pr-3">Col C</th>
                      <th className="text-left pr-3">Col D</th>
                      <th className="text-left pr-3">Col E</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugInfo.preview.map((r, i) => (
                      <tr key={i} className={r.col0 ? 'text-green-200' : 'text-gray-500'}>
                        <td className="pr-3">{r.linha}</td>
                        <td className="pr-3 max-w-[180px] truncate">{String(r.col0 ?? '')}</td>
                        <td className="pr-3">{String(r.col1 ?? '')}</td>
                        <td className="pr-3">{String(r.col2 ?? '')}</td>
                        <td className="pr-3">{String(r.col3 ?? '')}</td>
                        <td className="pr-3">{String(r.col4 ?? '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Review screen */
          <div className="space-y-6">

            {/* Painel principal de totais */}
            <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-xl">

              {/* Linha 1: Valor Total NF em destaque */}
              <div className="bg-green-600 px-8 py-5 flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs font-semibold uppercase tracking-widest mb-1">
                    Valor Total da Nota Fiscal
                  </p>
                  <p className="text-white text-4xl font-extrabold tracking-tight">
                    {BRL(result.resumo.totalNF)}
                  </p>
                  <p className="text-green-200 text-xs mt-1">
                    Produto (Aduaneiro+II) + II + IPI + PIS + COFINS + AFRMM
                    {result.resumo.entrouPorSP && ' + ICMS'} + Despesas · igual ao vNF da NF-e
                  </p>
                </div>
                <div className="text-right">
                  {result.resumo.entrouPorSP && (
                    <span className="inline-block mb-2 px-2.5 py-1 rounded-full bg-green-800/60 text-green-100 text-[11px] font-semibold uppercase tracking-wider">
                      Entrada por SP · ICMS {Math.round((result.resumo.icmsAliquota || 0) * 100)}%
                    </span>
                  )}
                  <p className="text-green-100 text-xs uppercase tracking-widest mb-1">Valor Aduaneiro</p>
                  <p className="text-white text-2xl font-bold">{BRL(result.resumo.valorTotalBRL)}</p>
                </div>
              </div>

              {/* Linha 2: tributos em cards */}
              <div className={`grid ${result.resumo.entrouPorSP ? 'grid-cols-6' : 'grid-cols-5'} divide-x divide-gray-700`}>
                {[
                  { label: 'II',     value: result.resumo.iiTotal,     color: 'text-red-400' },
                  { label: 'IPI',    value: result.resumo.ipiTotal,    color: 'text-orange-400' },
                  { label: 'PIS',    value: result.resumo.pisTotal,    color: 'text-yellow-400' },
                  { label: 'COFINS', value: result.resumo.cofinsTotal, color: 'text-yellow-300' },
                  { label: 'AFRMM', value: result.resumo.afrmmTotal,  color: 'text-blue-400' },
                  ...(result.resumo.entrouPorSP
                    ? [{ label: 'ICMS', value: result.resumo.icmsTotal, color: 'text-green-400' }]
                    : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className="px-5 py-4 text-center">
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{label}</p>
                    <p className={`${color} text-lg font-bold`}>{BRL(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">DI</p>
                <p className="font-mono font-bold text-gray-800">{result.numeroDI}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Taxa Câmbio</p>
                <p className="font-bold text-gray-800">{BRL(result.taxaCambio)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Adições</p>
                <p className="font-bold text-gray-800">{result.resumo.totalAdicoes}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Valor Aduaneiro</p>
                <p className="font-bold text-gray-800">{BRL(result.resumo.valorTotalBRL)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">II Total</p>
                <p className="font-bold text-red-700">{BRL(result.resumo.iiTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">IPI Total</p>
                <p className="font-bold text-orange-700">{BRL(result.resumo.ipiTotal)}</p>
              </div>
              <button
                onClick={handleReset}
                className="ml-auto text-sm text-gray-500 hover:text-gray-800 underline"
              >
                ← Nova conversão
              </button>
            </div>

            {/* Items table */}
            <ItemsTable
              adicoes={adicoes}
              onUpdateItem={handleUpdateItem}
              onToggleReducao={handleToggleReducao}
              reprocessando={reprocessando}
            />

            {/* Download */}
            <DownloadButton xmlBase64={result.xmlBase64} numeroDI={result.numeroDI} adicoes={adicoes} />
          </div>
        )}
      </div>
    </div>
  );
}
