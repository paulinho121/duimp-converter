// valorUnitario — 20 dígitos, USD × 10^7
// O ERP divide por 10^7 para obter USD e converte para BRL internamente
function formatValorUnitario(valorBRL, taxaCambio) {
  const taxa = Math.round(taxaCambio * 1000) / 1000;
  return String(Math.round((valorBRL / taxa) * 10_000_000)).padStart(20, '0');
}

function formatValorMoeda(totalBRL, taxaCambio) {
  return String(Math.round((totalBRL / taxaCambio) * 100)).padStart(15, '0');
}

function formatValorReais(totalBRL) {
  return String(Math.round(totalBRL * 100)).padStart(15, '0');
}

function format15(valorBRL) {
  return String(Math.round(valorBRL * 100)).padStart(15, '0');
}

function formatValorTotalCV(totalBRL, taxaCambio) {
  // Arredonda taxa para 3 decimais (5.0139999 → 5.014) para consistência com o ERP
  const taxa = Math.round(taxaCambio * 1000) / 1000;
  return String(Math.round((totalBRL / taxa) * 10_000_000));
}

// Alíquota — 5 dígitos, percentual × 10000 (9,65% -> "00965").
// Arredonda (não trunca): as alíquotas costumam vir de uma divisão
// valor/base (9,65% chega como 0,0964995...) e o floor gerava 00964.
function formatAliquota(percentualDecimal) {
  return String(Math.round(percentualDecimal * 10000)).padStart(5, '0');
}

// Quantidade — 14 dígitos, qty × 10^5 (ERP divide por 10^5 para obter unidades)
function formatQuantidade(qtd) {
  return String(Math.round(qtd * 100_000)).padStart(14, '0');
}

// Quantidade estatística em KG — 14 dígitos, kg × 10^3
function formatQtdKg(kg) {
  return String(Math.round(kg * 1000)).padStart(14, '0');
}

function formatPeso(kg) {
  return String(Math.round(kg * 1000)).padStart(15, '0');
}

// Alíquotas nominais (cheias) de PIS/COFINS-Importação
const PIS_ALIQ_CHEIA = 0.021;      // 2,10%
const COFINS_ALIQ_CHEIA = 0.0965;  // 9,65%

function calcularTributosAdicao(itens, config, taxaCambio, reducaoOverride) {
  const totalBRL  = itens.reduce((s, i) => s + i.vlTotal, 0);
  const baseII    = itens.reduce((s, i) => s + i.baseII, 0);
  const vlII      = itens.reduce((s, i) => s + i.vlII, 0);
  const baseIPI   = itens.reduce((s, i) => s + i.baseIPI, 0);
  const vlIPI     = itens.reduce((s, i) => s + i.vlIPI, 0);
  const vlPIS     = itens.reduce((s, i) => s + i.vlPIS, 0);
  const vlCOFINS  = itens.reduce((s, i) => s + i.vlCOFINS, 0);
  const vlAFRMM   = itens.reduce((s, i) => s + i.vlAFRMM, 0);

  // Alíquotas para display no XML: prioriza a alíquota REAL do espelho
  // (NF-e/Excel), por item; a tabela fixa (config) é só fallback quando o
  // espelho não informa. Os VALORES (vlII, vlIPI, etc.) já vêm do espelho.
  // Normaliza para decimal (aceita 10,8% vindo como 10.8 ou como 0.108).
  function normAliq(a) {
    const v = parseFloat(a) || 0;
    if (v <= 0) return 0;
    return v > 1 ? v / 100 : v;
  }
  // Primeira alíquota > 0 informada pelos itens do espelho, já normalizada
  function aliqEspelho(campo) {
    for (const it of itens) {
      const v = normAliq(it[campo]);
      if (v > 0) return v;
    }
    return 0;
  }

  const aliqII     = aliqEspelho('aliqII')     || config.aliqII     || 0;
  // IPI: quando o espelho não traz alíquota mas há IPI devido, cai na tabela.
  // Se não há IPI devido (item isento/IPINT), a alíquota é 0 — sem isso o
  // fallback da tabela faria o ERP recalcular IPI sobre item isento.
  const aliqIPI    = aliqEspelho('aliqIPI')    || (vlIPI > 0 ? config.aliqIPI : 0) || 0;

  // PIS/COFINS: alíquota EFETIVA aplicada (valor devido ÷ base). Se estiver
  // bem abaixo da nominal, há redução. O usuário pode sobrepor a detecção.
  const aliqPisAplicada    = baseII > 0 ? vlPIS / baseII : 0;
  const aliqCofinsAplicada = baseII > 0 ? vlCOFINS / baseII : 0;
  const reducaoAuto = aliqPisAplicada > 0 && aliqPisAplicada < PIS_ALIQ_CHEIA * 0.5;
  const reducao = (reducaoOverride === undefined || reducaoOverride === null)
    ? reducaoAuto
    : !!reducaoOverride;

  // Sem redução o ad valorem é a alíquota NOMINAL. Prioriza a declarada no
  // espelho (pPIS/pCOFINS = 2,10 / 9,65) em vez da efetiva calculada por
  // valor÷base, que chega com ruído (2,0999... / 9,6499...) e viraria 2,09/9,64.
  const aliqPisDeclarada = aliqEspelho('aliqPIS');
  const aliqCofDeclarada = aliqEspelho('aliqCOFINS');

  // Com redução (padrão do extrato da DUIMP): ad valorem = alíquota CHEIA,
  // e a alíquota reduzida vai no campo próprio. Sem redução: ad valorem = a
  // própria alíquota nominal e reduzida zerada.
  const aliqPisAdVal    = reducao ? PIS_ALIQ_CHEIA    : (aliqPisDeclarada || aliqPisAplicada    || PIS_ALIQ_CHEIA);
  const aliqPisReduzida = reducao ? aliqPisAplicada   : 0;
  const aliqCofAdVal    = reducao ? COFINS_ALIQ_CHEIA : (aliqCofDeclarada || aliqCofinsAplicada || COFINS_ALIQ_CHEIA);
  const aliqCofReduzida = reducao ? aliqCofinsAplicada : 0;
  const regimePIS     = reducao ? '6' : '1';
  const nomeRegimePIS = reducao ? 'REDUCAO' : 'RECOLHIMENTO INTEGRAL';

  return {
    condicaoVendaValorMoeda:             formatValorMoeda(totalBRL, taxaCambio),
    condicaoVendaValorReais:             formatValorReais(totalBRL),
    iiAliquotaAdValorem:                 formatAliquota(aliqII),
    iiBaseCalculo:                       format15(baseII),
    iiAliquotaValorCalculado:            format15(vlII),
    iiAliquotaValorDevido:               format15(vlII),
    iiAliquotaValorRecolher:             format15(vlII),
    ipiAliquotaAdValorem:                formatAliquota(aliqIPI),
    ipiBaseCalculo:                      format15(baseIPI),
    ipiAliquotaValorDevido:              format15(vlIPI),
    ipiAliquotaValorRecolher:            format15(vlIPI),
    pisCofinsBaseCalculoValor:           format15(baseII),
    pisCofinsRegimeTributacaoCodigo:     regimePIS,
    pisCofinsRegimeTributacaoNome:       nomeRegimePIS,
    cofinsAliquotaAdValorem:             formatAliquota(aliqCofAdVal),
    cofinsAliquotaReduzida:              formatAliquota(aliqCofReduzida),
    cofinsAliquotaValorDevido:           format15(vlCOFINS),
    cofinsAliquotaValorRecolher:         format15(vlCOFINS),
    pisPasepAliquotaAdValorem:           formatAliquota(aliqPisAdVal),
    pisPasepAliquotaReduzida:            formatAliquota(aliqPisReduzida),
    pisPasepAliquotaValorDevido:         format15(vlPIS),
    pisPasepAliquotaValorRecolher:       format15(vlPIS),
    valorReaisFreteInternacional:        format15(vlAFRMM),
    valorTotalCondicaoVenda:             formatValorTotalCV(totalBRL, taxaCambio),
    _reducao: reducao,
    _reducaoAuto: reducaoAuto,
    _totais: { totalBRL, vlII, vlIPI, vlPIS, vlCOFINS },
  };
}

// ICMS de importação — cálculo "por dentro" (gross-up), item a item.
// Base cheia do item = Valor Aduaneiro + II + IPI + PIS + COFINS + AFRMM + despesas.
// Base do ICMS = base cheia / (1 - alíquota); ICMS = base × alíquota.
// A alíquota é a de CADA item (pICMS do espelho); quando o item não a informa
// (ex.: espelho em Excel), usa a padrão de SP (18%).
const ALIQUOTA_ICMS_SP = 0.18;

function calcularICMS(adicoes, aliquotaPadrao = ALIQUOTA_ICMS_SP) {
  let baseCalculo = 0;
  let valor = 0;
  for (const a of adicoes) {
    for (const i of a.itens) {
      const aliq = i.aliqICMS > 0 ? i.aliqICMS : aliquotaPadrao;
      const bruta = i.vlTotal + i.vlII + i.vlIPI + i.vlPIS + i.vlCOFINS + (i.vlAFRMM || 0) + (i.despesas || 0);
      const base = bruta / (1 - aliq);
      baseCalculo += base;
      valor += base * aliq;
    }
  }
  baseCalculo = Math.round(baseCalculo * 100) / 100;
  valor = Math.round(valor * 100) / 100;
  // Alíquota efetiva (para exibição), já que pode haver alíquotas diferentes.
  const aliquota = baseCalculo > 0 ? valor / baseCalculo : aliquotaPadrao;
  return { aliquota, baseCalculo, valor };
}

module.exports = {
  formatValorUnitario,
  calcularICMS,
  ALIQUOTA_ICMS_SP,
  formatQtdKg,
  formatValorMoeda,
  formatValorReais,
  format15,
  formatValorTotalCV,
  formatAliquota,
  formatQuantidade,
  formatPeso,
  calcularTributosAdicao,
};
