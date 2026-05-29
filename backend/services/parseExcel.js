const XLSX = require('xlsx');

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets['Minuta NF Importação'] || wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Taxa de câmbio: procura linha com "Dolar Fiscal" na coluna 0
  let taxaCambio = 0;
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const label = String(data[i]?.[0] || '').toLowerCase();
    if (label.includes('dolar fiscal') || label.includes('dólar fiscal')) {
      taxaCambio = parseFloat(data[i][1]) || 0;
      break;
    }
  }

  // Linha dos NCMs: procura linha que contém "VALOR EM R$" em alguma coluna
  // Essa linha é L23; os NCMs estão 2 linhas acima = L21
  const valorEmRsRowIdx = data.findIndex(r =>
    r && r.some(cell => String(cell || '').trim() === 'VALOR EM R$')
  );
  if (valorEmRsRowIdx < 0) return { taxaCambio, itens: [] };

  const ncmRowIdx = valorEmRsRowIdx - 2; // linha dos NCMs (L21)
  const adRowIdx  = valorEmRsRowIdx - 2; // AD labels estão na mesma linha dos NCMs
  const ncmRow    = data[ncmRowIdx] || [];

  // Mapa de rótulos → índice de linha
  // Rótulos podem estar na col 0 (C2) ou col 1 (C5)
  const rowMap = {};
  data.forEach((row, idx) => {
    const label0 = String(row?.[0] || '').trim();
    const label1 = String(row?.[1] || '').trim();
    const label  = label0 || label1;
    if (label.startsWith('Valor Aduaneiro'))              rowMap.valorAduaneiro = idx;
    if (label.startsWith('I.I'))                          rowMap.ii = idx;
    if (label.startsWith('IPI'))                          rowMap.ipi = idx;
    if (label.startsWith('PIS'))                          rowMap.pis = idx;
    if (label.startsWith('COFINS'))                       rowMap.cofins = idx;
    if (label.includes('AFRMM'))                          rowMap.afrmm = idx;
    if (label.includes('VALOR UNIT'))                     rowMap.vlUnit = idx;
    if (label.includes('QUANTIDADE DOS PRODUTOS'))        rowMap.qtd = idx;
    if (label.includes('VALOR TOTAL DOS PRODUTOS'))       rowMap.vlTotalNF = idx;
  });

  // Colunas dos itens: 4, 6, 8, 10... (passo 2)
  // Na linha do NCM, col par = NCM, col ímpar = label AD (AD1, AD2, AD3...)
  const itens = [];
  const iiRow = data[rowMap.ii];
  if (!iiRow) return { taxaCambio, itens };

  for (let col = 4; col < iiRow.length; col += 2) {
    const ncmRaw = String(ncmRow[col] || '').trim();
    const adLabel = String(ncmRow[col + 1] || '').trim(); // ex: "AD1", "AD2"

    // Parar se NCM inválido ou é coluna de totalização
    if (!ncmRaw || ncmRaw.length < 8) continue;
    if (ncmRaw === '0' || !ncmRaw.match(/^\d/)) continue;

    const ncm = ncmRaw.replace(/\./g, '').slice(0, 8);
    if (ncm.length < 8) continue;

    const vlTotal  = parseFloat(data[rowMap.valorAduaneiro]?.[col]) || 0;
    const vlII     = parseFloat(data[rowMap.ii]?.[col])             || 0;
    const aliqII   = parseFloat(data[rowMap.ii]?.[col + 1])         || 0;
    const vlIPI    = parseFloat(data[rowMap.ipi]?.[col])            || 0;
    const aliqIPI  = parseFloat(data[rowMap.ipi]?.[col + 1])        || 0;
    const vlPIS    = parseFloat(data[rowMap.pis]?.[col])            || 0;
    const aliqPIS  = parseFloat(data[rowMap.pis]?.[col + 1])        || 0;
    const vlCOFINS = parseFloat(data[rowMap.cofins]?.[col])         || 0;
    const aliqCOFINS = parseFloat(data[rowMap.cofins]?.[col + 1])   || 0;
    const vlAFRMM  = parseFloat(data[rowMap.afrmm]?.[col])          || 0;
    const vlUnit   = parseFloat(data[rowMap.vlUnit]?.[col])         || 0;
    const qtd      = parseFloat(data[rowMap.qtd]?.[col])            || 0;
    const baseIPI  = vlTotal + vlII;

    if (vlTotal > 0) {
      itens.push({
        ncm,
        adLabel,
        colIdx: itens.length,
        vlUnit,
        qtd,
        vlTotal,
        baseII: vlTotal,
        vlII,   aliqII,
        baseIPI,
        vlIPI,  aliqIPI,
        vlPIS,  aliqPIS,
        vlCOFINS, aliqCOFINS,
        vlAFRMM,
      });
    }
  }

  return { taxaCambio, itens };
}

module.exports = parseExcel;
