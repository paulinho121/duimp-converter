// Extrai os dados fiscais por item de um espelho no formato NF-e (modelo 55).
//
// A extração é feita por regex sobre os blocos <det> (mesmo estilo do
// parseDuimp). Optamos por NÃO usar a conversão para objeto do xmlbuilder2
// porque o empacotamento de texto varia entre versões da lib, o que causava
// itens vazios em produção (Vercel). Regex sobre os elementos-folha da NF-e
// é determinístico em qualquer ambiente.

// Converte texto numérico ("1.234,56" ou "1234.56") em Number
function num(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  if (/,\d+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

// Texto do primeiro elemento <name>...</name> dentro de um trecho
function tag(chunk, name) {
  if (!chunk) return '';
  const m = chunk.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : '';
}

// Conteúdo do primeiro bloco <name>...</name> (aceita atributos na abertura)
function block(chunk, name) {
  if (!chunk) return '';
  const m = chunk.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : '';
}

function parseXmlEspelho(buffer) {
  const xml = buffer.toString('utf8');

  // Cada item da NF-e é um bloco <det ...>...</det>
  const dets = xml.match(/<det\b[\s\S]*?<\/det>/g) || [];
  if (dets.length === 0) {
    throw new Error('XML não reconhecido como NF-e (nenhum item <det> encontrado).');
  }

  // UF de desembaraço (aparece na DI de cada item; usamos a do primeiro)
  const ufDesembaraco = (xml.match(/<UFDesemb>([A-Z]{2})<\/UFDesemb>/) || [])[1] || '';

  const itens = dets.map((det, idx) => {
    const prod = block(det, 'prod');
    const di   = block(prod, 'DI');

    const ncm    = tag(prod, 'NCM').replace(/\D/g, '').slice(0, 8);
    const qtd    = num(tag(prod, 'qCom'));
    const vlUnit = num(tag(prod, 'vUnCom'));
    const despesas = num(tag(prod, 'vOutro'));  // outras despesas (compõem a base do ICMS)
    const vProd    = num(tag(prod, 'vProd'));    // valor do produto (= aduaneiro + II)

    // II — valor do imposto
    const iiBlock = block(det, 'II');
    const vlII    = num(tag(iiBlock, 'vII'));

    // PIS / COFINS — pega o bloco inteiro (cobre PISOutr/PISAliq/PISNT etc.)
    const pisBlock  = block(det, 'PIS');
    const vlPIS     = num(tag(pisBlock, 'vPIS'));
    const aliqPIS   = num(tag(pisBlock, 'pPIS')) / 100;
    const basePIS   = num(tag(pisBlock, 'vBC'));  // base do PIS/COFINS-Imp = valor aduaneiro

    const cofBlock   = block(det, 'COFINS');
    const vlCOFINS   = num(tag(cofBlock, 'vCOFINS'));
    const aliqCOFINS = num(tag(cofBlock, 'pCOFINS')) / 100;

    // ICMS — alíquota do item (pICMS). A NF-e reparte as adições por alíquota
    // de ICMS (ex.: 18% / 12% / 8,8%); guardamos a alíquota real para o cálculo
    // "por dentro" usar a de cada item em vez de uma alíquota única.
    const icmsBlock = block(det, 'ICMS');
    const aliqICMS  = num(tag(icmsBlock, 'pICMS')) / 100;

    // Valor aduaneiro (base do II). Alguns espelhos de NF-e trazem <II><vBC>
    // zerado (mesmo com II devido); nesses casos derivamos o aduaneiro da base
    // do PIS/COFINS-Importação, que incide exatamente sobre o valor aduaneiro
    // (equivale a vProd − vII). Sem isso o item cai fora pelo filtro vlTotal>0.
    const baseIIRaw = num(tag(iiBlock, 'vBC'));
    const baseII    = baseIIRaw || basePIS || (vProd - vlII);
    const aliqII    = baseII > 0 ? vlII / baseII : 0;

    // IPI — base costuma ser valor aduaneiro + II (= vProd)
    const ipiTrib = block(det, 'IPITrib') || block(det, 'IPINT');
    const vlIPI   = num(tag(ipiTrib, 'vIPI'));
    const aliqIPI = num(tag(ipiTrib, 'pIPI')) / 100;
    const baseIPI = num(tag(ipiTrib, 'vBC')) || (baseII + vlII);

    // AFRMM e nº da adição vêm da DI vinculada ao item. Na NF-e o número
    // sequencial da adição é <adi><nSeqAdic>; casamos o item ao PDF por ele.
    const vlAFRMM = num(tag(di, 'vAFRMM'));
    const nAdicao = parseInt(tag(di, 'nSeqAdic') || tag(di, 'nAdicao') || '', 10) || (idx + 1);

    return {
      ncm,
      nAdicao,
      // Índice do item no PDF da DUIMP: nSeqAdic é 1-based e segue a ordem das
      // adições no extrato, então colIdx = nSeqAdic − 1 casa item-a-item.
      colIdx: nAdicao - 1,
      descricao: tag(prod, 'xProd'),
      vlUnit,
      qtd,
      vlTotal: baseII,   // valor aduaneiro = base do II
      baseII,
      vlII,   aliqII,
      baseIPI,
      vlIPI,  aliqIPI,
      vlPIS,  aliqPIS,
      vlCOFINS, aliqCOFINS,
      aliqICMS,
      vlAFRMM,
      despesas,
      vProd,
    };
  }).filter(i => i.ncm.length === 8 && i.vlTotal > 0);

  return { itens, ufDesembaraco };
}

module.exports = parseXmlEspelho;
