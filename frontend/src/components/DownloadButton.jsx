import React, { useState } from 'react';

export default function DownloadButton({ xmlBase64, numeroDI, adicoes }) {
  const [aviso, setAviso] = useState('');

  function buildXmlComCodigos() {
    // Decodifica o XML original
    const bytes = atob(xmlBase64);
    let xml = new TextDecoder('utf-8').decode(
      Uint8Array.from(bytes, c => c.charCodeAt(0))
    );

    // Coleta todos os itens em ordem (mesma ordem em que o buildXml os gerou)
    const todoItens = adicoes.flatMap(a => a.itens);

    // Quantos itens têm código preenchido
    const semCodigo = todoItens.filter(i => !i._codigo || i._codigo.length < 4);
    if (semCodigo.length > 0) {
      setAviso(`⚠️ ${semCodigo.length} ite${semCodigo.length > 1 ? 'ns sem' : 'm sem'} código preenchido. O XML será baixado sem prefixo nesses itens.`);
    } else {
      setAviso('');
    }

    // Substitui cada <descricaoMercadoria> na ordem de aparição
    let idx = 0;
    xml = xml.replace(/<descricaoMercadoria>([^<]*)<\/descricaoMercadoria>/g, (match, descOriginal) => {
      const item = todoItens[idx++];
      if (!item) return match;
      const codigo = item._codigo || '';
      const prefixo = codigo.length === 4
        ? `${codigo}${item._tipoIP ? 'IP-' : '-'}`
        : '';
      // Se a descrição já começa com o prefixo (re-download), não duplicar
      const descLimpa = descOriginal.replace(/^\d{4}(IP)?-/, '');
      return `<descricaoMercadoria>${prefixo}${descLimpa}</descricaoMercadoria>`;
    });

    return xml;
  }

  function handleDownload() {
    const xml = buildXmlComCodigos();
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DI_${numeroDI || 'declaracao'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Contagem de itens com/sem código
  const todoItens = adicoes?.flatMap(a => a.itens) || [];
  const comCodigo = todoItens.filter(i => i._codigo?.length === 4).length;
  const total = todoItens.length;

  return (
    <div className="space-y-2">
      {/* Barra de progresso dos códigos */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 font-medium">Códigos preenchidos</span>
          <span className={`text-xs font-bold ${comCodigo === total ? 'text-green-600' : 'text-orange-600'}`}>
            {comCodigo} / {total} itens
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${comCodigo === total ? 'bg-green-500' : 'bg-orange-400'}`}
            style={{ width: `${total > 0 ? (comCodigo / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {aviso && (
        <p className="text-orange-600 text-sm bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
          {aviso}
        </p>
      )}

      <button
        onClick={handleDownload}
        className={`w-full py-4 font-bold text-lg rounded-xl shadow-md transition-colors flex items-center justify-center gap-2
          ${comCodigo === total
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
      >
        ⬇ BAIXAR XML {comCodigo === total ? '✓ todos os códigos preenchidos' : `(${total - comCodigo} sem código)`}
      </button>
    </div>
  );
}
