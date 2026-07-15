const { calcularTributosAdicao } = require('./calcTributos');

const ADICOES_CONFIG = {
  '85395100': {
    descricao: 'Módulos LED',
    nomeNcm: '-- Módulos de diodos emissores de luz (LED)',
    unidadeEstatistica: 'UNIDADE',
    aliqII: 0.108,
    aliqIPI: 0.0975,
    aliqPIS: 0.0021,
    aliqCOFINS: 0.00965,
    regimePIS: '6',
    nomeRegimePIS: 'REDUCAO',
  },
  '85399090': {
    descricao: 'Partes de lâmpadas (Fresnels/Barndoors)',
    nomeNcm: 'Outras',
    unidadeEstatistica: 'QUILOGRAMA LIQUIDO',
    aliqII: 0.126,
    aliqIPI: 0.0975,
    aliqPIS: 0.0021,
    aliqCOFINS: 0.00965,
    regimePIS: '6',
    nomeRegimePIS: 'REDUCAO',
  },
  '94059900': {
    descricao: 'Partes de aparelho de iluminação',
    nomeNcm: '-- Outras',
    unidadeEstatistica: 'QUILOGRAMA LIQUIDO',
    aliqII: 0.162,
    aliqIPI: 0.0975,
    aliqPIS: 0.021,
    aliqCOFINS: 0.0965,
    regimePIS: '1',
    nomeRegimePIS: 'RECOLHIMENTO INTEGRAL',
  },
  '94054200': {
    descricao: 'Luminárias LED completas',
    nomeNcm: '-- Outros, concebidos para serem utilizados unicamente',
    unidadeEstatistica: 'QUILOGRAMA LIQUIDO',
    aliqII: 0.162,
    aliqIPI: 0.0975,
    aliqPIS: 0.0021,
    aliqCOFINS: 0.00965,
    regimePIS: '6',
    nomeRegimePIS: 'REDUCAO',
  },
};

function getConfig(ncm, aliqIIReal) {
  if (ADICOES_CONFIG[ncm]) return ADICOES_CONFIG[ncm];
  const usaIntegral = ncm.startsWith('9405');
  return {
    descricao: `NCM ${ncm}`,
    nomeNcm: ncm,
    unidadeEstatistica: 'UNIDADE',
    aliqII: aliqIIReal || 0,
    aliqIPI: 0.0975,
    aliqPIS: usaIntegral ? 0.021 : 0.0021,
    aliqCOFINS: usaIntegral ? 0.0965 : 0.00965,
    regimePIS: usaIntegral ? '1' : '6',
    nomeRegimePIS: usaIntegral ? 'RECOLHIMENTO INTEGRAL' : 'REDUCAO',
  };
}

/**
 * Regra de agrupamento (baseada no padrão do XML real):
 *
 * 1. Escaneia itens do Excel em ordem de coluna.
 * 2. Para cada NCM, verifica se a PRIMEIRA ocorrência tem adLabel "AD1".
 *    - Se sim → itens AD1 formam um grupo (adição), itens AD2/AD3 formam outro grupo separado.
 *    - Se não → todos os itens desse NCM vão para o mesmo grupo.
 * 3. A ordem das adições no XML segue a primeira aparição de cada grupo.
 */
function groupByNcm(itensDuimp, itensExcel, taxaCambio, reducaoOverrides = []) {
  // Detectar se a primeira ocorrência de cada NCM é AD1
  const ncmPrimeiroAd = {};
  for (const item of itensExcel) {
    if (!(item.ncm in ncmPrimeiroAd)) {
      ncmPrimeiroAd[item.ncm] = item.adLabel;
    }
  }

  // Gerar chave de agrupamento para cada item
  // Se NCM tem primeiro item AD1: (ncm, 'AD1') vs (ncm, 'AD2+')
  // Caso contrário: apenas (ncm, 'ALL')
  function chaveGrupo(item) {
    const primeiroAd = ncmPrimeiroAd[item.ncm];
    if (primeiroAd === 'AD1') {
      return item.adLabel === 'AD1' ? `${item.ncm}|AD1` : `${item.ncm}|AD2+`;
    }
    return `${item.ncm}|ALL`;
  }

  // Agrupar mantendo ordem de primeira aparição
  const grupos = new Map(); // chave → { ncm, config, itensExcel: [] }
  const ordemChaves = [];

  for (const item of itensExcel) {
    const chave = chaveGrupo(item);
    if (!grupos.has(chave)) {
      grupos.set(chave, { ncm: item.ncm, itensExcel: [] });
      ordemChaves.push(chave);
    }
    grupos.get(chave).itensExcel.push(item);
  }

  const adicoes = [];

  for (const chave of ordemChaves) {
    const { ncm, itensExcel: excelItens } = grupos.get(chave);
    const aliqIIReal = excelItens[0]?.aliqII || 0;
    const config = getConfig(ncm, aliqIIReal);

    // Combina dados financeiros (Excel) com dados descritivos (DUIMP) por colIdx
    const itensCombinados = excelItens.map((exItem) => {
      const duimpItem = itensDuimp[exItem.colIdx] || {};
      return {
        ...exItem,
        qtd: exItem.qtd || duimpItem.qtd || 0,
        peso: duimpItem.peso || 0,
        unidade: duimpItem.unidade || config.unidadeEstatistica,
        descricao: duimpItem.descricao || config.descricao,
      };
    });

    // Quantidade estatística da adição
    const isKg = config.unidadeEstatistica === 'QUILOGRAMA LIQUIDO';
    const qtdEstatistica = itensCombinados.reduce((s, i) => {
      return s + (isKg ? (i.peso || 0) : (i.qtd || 0));
    }, 0);

    const tributos = calcularTributosAdicao(itensCombinados, config, taxaCambio, reducaoOverrides[adicoes.length]);
    const totalBRL   = itensCombinados.reduce((s, i) => s + i.vlTotal, 0);
    const vlIITotal  = itensCombinados.reduce((s, i) => s + i.vlII, 0);
    const vlIPITotal = itensCombinados.reduce((s, i) => s + i.vlIPI, 0);
    const pesoLiquido = itensCombinados.reduce((s, i) => s + i.peso, 0);

    adicoes.push({
      ncm,
      config,
      itens: itensCombinados,
      tributos,
      reducao: tributos._reducao,
      reducaoAuto: tributos._reducaoAuto,
      totalBRL,
      vlIITotal,
      vlIPITotal,
      pesoLiquido,
      qtdEstatistica,
    });
  }

  return adicoes;
}

/**
 * Agrupamento para o espelho em XML (NF-e).
 *
 * A NF-e já traz o número da adição (`nAdicao`) por item, que é o campo
 * oficial da DI — então o agrupamento é direto: itens com o mesmo `nAdicao`
 * formam uma adição, preservando a ordem de primeira aparição.
 *
 * Os dados descritivos (peso, unidade) continuam vindo da DUIMP (PDF),
 * casados por posição (`colIdx`), igual ao fluxo do Excel.
 */
function groupByAdicao(itensDuimp, itensXml, taxaCambio, reducaoOverrides = []) {
  const grupos = new Map(); // nAdicao → itens[]
  const ordem = [];

  for (const item of itensXml) {
    const chave = String(item.nAdicao);
    if (!grupos.has(chave)) {
      grupos.set(chave, []);
      ordem.push(chave);
    }
    grupos.get(chave).push(item);
  }

  const adicoes = [];

  for (const chave of ordem) {
    const xmlItens = grupos.get(chave);
    const ncm = xmlItens[0].ncm;
    const aliqIIReal = xmlItens[0]?.aliqII || 0;
    const config = getConfig(ncm, aliqIIReal);

    const itensCombinados = xmlItens.map((exItem) => {
      const duimpItem = itensDuimp[exItem.colIdx] || {};
      return {
        ...exItem,
        qtd: exItem.qtd || duimpItem.qtd || 0,
        peso: duimpItem.peso || 0,
        unidade: duimpItem.unidade || config.unidadeEstatistica,
        descricao: duimpItem.descricao || exItem.descricao || config.descricao,
      };
    });

    const isKg = config.unidadeEstatistica === 'QUILOGRAMA LIQUIDO';
    const qtdEstatistica = itensCombinados.reduce((s, i) => {
      return s + (isKg ? (i.peso || 0) : (i.qtd || 0));
    }, 0);

    const tributos = calcularTributosAdicao(itensCombinados, config, taxaCambio, reducaoOverrides[adicoes.length]);
    const totalBRL    = itensCombinados.reduce((s, i) => s + i.vlTotal, 0);
    const vlIITotal   = itensCombinados.reduce((s, i) => s + i.vlII, 0);
    const vlIPITotal  = itensCombinados.reduce((s, i) => s + i.vlIPI, 0);
    const pesoLiquido = itensCombinados.reduce((s, i) => s + i.peso, 0);

    adicoes.push({
      ncm,
      config,
      itens: itensCombinados,
      tributos,
      reducao: tributos._reducao,
      reducaoAuto: tributos._reducaoAuto,
      totalBRL,
      vlIITotal,
      vlIPITotal,
      pesoLiquido,
      qtdEstatistica,
    });
  }

  return adicoes;
}

module.exports = { groupByNcm, groupByAdicao, getConfig, ADICOES_CONFIG };
