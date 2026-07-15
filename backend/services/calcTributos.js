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

function formatAliquota(percentualDecimal) {
  return String(Math.floor(percentualDecimal * 10000)).padStart(5, '0');
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

function calcularTributosAdicao(itens, config, taxaCambio) {
  const totalBRL  = itens.reduce((s, i) => s + i.vlTotal, 0);
  const baseII    = itens.reduce((s, i) => s + i.baseII, 0);
  const vlII      = itens.reduce((s, i) => s + i.vlII, 0);
  const baseIPI   = itens.reduce((s, i) => s + i.baseIPI, 0);
  const vlIPI     = itens.reduce((s, i) => s + i.vlIPI, 0);
  const vlPIS     = itens.reduce((s, i) => s + i.vlPIS, 0);
  const vlCOFINS  = itens.reduce((s, i) => s + i.vlCOFINS, 0);
  const vlAFRMM   = itens.reduce((s, i) => s + i.vlAFRMM, 0);

  // Alíquotas para display no XML: usa config do NCM (valores oficiais)
  // Os VALORES (vlII, vlIPI, etc.) vêm do Excel diretamente
  // Fallback: alíquota real do primeiro item com valor > 0
  function aliqReal(campo) {
    for (const it of itens) {
      const v = it[campo];
      if (v && v > 0) return v;
    }
    return config[campo.replace('aliq', 'aliq')] || 0;
  }

  const aliqII  = config.aliqII  || aliqReal('aliqII');
  const aliqIPI = config.aliqIPI || aliqReal('aliqIPI');
  const aliqPIS = config.aliqPIS || aliqReal('aliqPIS');
  // COFINS: usa o menor valor de alíquota presente nos itens (alíquota de redução)
  // pois o XML real registra a alíquota base mesmo em regimes integrais
  const aliqCOFINSMenor = itens.reduce((min, i) => {
    const a = i.aliqCOFINS;
    return (a && a > 0 && a < min) ? a : min;
  }, config.aliqCOFINS || 1);
  const aliqCOFINS = aliqCOFINSMenor < 1 ? aliqCOFINSMenor : (config.aliqCOFINS || 0);
  const regimePIS     = config.regimePIS;
  const nomeRegimePIS = config.nomeRegimePIS;

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
    cofinsAliquotaAdValorem:             formatAliquota(aliqCOFINS),
    cofinsAliquotaValorDevido:           format15(vlCOFINS),
    cofinsAliquotaValorRecolher:         format15(vlCOFINS),
    pisPasepAliquotaAdValorem:           formatAliquota(aliqPIS),
    pisPasepAliquotaValorDevido:         format15(vlPIS),
    pisPasepAliquotaValorRecolher:       format15(vlPIS),
    valorReaisFreteInternacional:        format15(vlAFRMM),
    valorTotalCondicaoVenda:             formatValorTotalCV(totalBRL, taxaCambio),
    _totais: { totalBRL, vlII, vlIPI, vlPIS, vlCOFINS },
  };
}

// ICMS de importação — cálculo "por dentro" (gross-up).
// Base cheia = Valor Aduaneiro + II + IPI + PIS + COFINS + AFRMM + despesas.
// Base do ICMS = base cheia / (1 - alíquota); ICMS = base × alíquota.
// Alíquota padrão SP = 18%.
const ALIQUOTA_ICMS_SP = 0.18;

function calcularICMS(adicoes, aliquota = ALIQUOTA_ICMS_SP) {
  const baseBruta = adicoes.reduce((s, a) =>
    s + a.itens.reduce((x, i) =>
      x + i.vlTotal + i.vlII + i.vlIPI + i.vlPIS + i.vlCOFINS + (i.vlAFRMM || 0) + (i.despesas || 0), 0), 0);

  const baseCalculo = baseBruta / (1 - aliquota);
  const valor = Math.round(baseCalculo * aliquota * 100) / 100;
  return { aliquota, baseCalculo: Math.round(baseCalculo * 100) / 100, valor };
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
