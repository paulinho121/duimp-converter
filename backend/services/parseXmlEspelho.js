const { create } = require('xmlbuilder2');

// Converte texto numérico ("1.234,56" ou "1234.56") em Number
function num(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  // Formato pt-BR "1.234,56" → remove milhar, troca vírgula por ponto
  if (/,\d+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

// Primeiro filho existente entre várias chaves possíveis (ex.: PISOutr, PISAliq, PISNT)
function firstOf(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return {};
}

/**
 * Extrai os dados fiscais por item de um espelho no formato NF-e (modelo 55).
 * Devolve a MESMA estrutura de item que o parseExcel produz, para que o
 * agrupamento e o cálculo de tributos reaproveitem a mesma lógica.
 *
 * Observação: a taxa de câmbio NÃO existe na NF-e — ela é informada
 * manualmente na tela e passada adiante pela rota.
 */
function parseXmlEspelho(buffer) {
  const xml = buffer.toString('utf8');

  let obj;
  try {
    obj = create(xml).end({ format: 'object' });
  } catch (e) {
    throw new Error('Arquivo XML inválido ou corrompido.');
  }

  const infNFe = obj?.nfeProc?.NFe?.infNFe || obj?.NFe?.infNFe;
  if (!infNFe) {
    throw new Error('XML não reconhecido como NF-e (elemento infNFe não encontrado).');
  }

  let dets = infNFe.det;
  if (!dets) throw new Error('NF-e sem itens (nenhum elemento <det>).');
  if (!Array.isArray(dets)) dets = [dets];

  const itens = dets.map((det, idx) => {
    const prod = det.prod || {};
    const imp  = det.imposto || {};

    const ncm    = String(prod.NCM || '').replace(/\D/g, '').slice(0, 8);
    const qtd    = num(prod.qCom);
    const vlUnit = num(prod.vUnCom);

    // II — a base do II é o valor aduaneiro do item
    const ii     = imp.II || {};
    const baseII = num(ii.vBC);
    const vlII   = num(ii.vII);
    const aliqII = baseII > 0 ? vlII / baseII : 0;

    // IPI — base costuma ser valor aduaneiro + II
    const ipiTrib = firstOf(imp.IPI, ['IPITrib', 'IPINT']);
    const vlIPI   = num(ipiTrib.vIPI);
    const aliqIPI = num(ipiTrib.pIPI) / 100;
    const baseIPI = num(ipiTrib.vBC) || (baseII + vlII);

    // PIS / COFINS
    const pis      = firstOf(imp.PIS, ['PISOutr', 'PISAliq', 'PISNT', 'PISQtde']);
    const vlPIS    = num(pis.vPIS);
    const aliqPIS  = num(pis.pPIS) / 100;

    const cof       = firstOf(imp.COFINS, ['COFINSOutr', 'COFINSAliq', 'COFINSNT', 'COFINSQtde']);
    const vlCOFINS  = num(cof.vCOFINS);
    const aliqCOFINS = num(cof.pCOFINS) / 100;

    // AFRMM e nº da adição vêm da DI vinculada ao item
    const di  = prod.DI || {};
    const vlAFRMM = num(di.vAFRMM);
    const adiRaw  = di.adi ? (Array.isArray(di.adi) ? di.adi[0] : di.adi) : {};
    const nAdicao = parseInt(String(adiRaw.nAdicao || '1'), 10) || 1;

    return {
      ncm,
      nAdicao,
      colIdx: idx,
      descricao: String(prod.xProd || '').trim(),
      vlUnit,
      qtd,
      vlTotal: baseII,   // valor aduaneiro = base do II
      baseII,
      vlII,   aliqII,
      baseIPI,
      vlIPI,  aliqIPI,
      vlPIS,  aliqPIS,
      vlCOFINS, aliqCOFINS,
      vlAFRMM,
    };
  }).filter(i => i.ncm.length === 8 && i.vlTotal > 0);

  return { itens };
}

module.exports = parseXmlEspelho;
