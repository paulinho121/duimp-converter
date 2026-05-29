const { create } = require('xmlbuilder2');
const { formatQuantidade, formatQtdKg, formatPeso, formatValorUnitario, format15 } = require('./calcTributos');

const FIXOS_ADICAO = {
  cideValorAliquotaEspecifica: '00000000000',
  cideValorDevido: '000000000000000',
  cideValorRecolher: '000000000000000',
  codigoRelacaoCompradorVendedor: '2',
  codigoVinculoCompradorVendedor: '1',
  cofinsAliquotaEspecificaQuantidadeUnidade: '000000000',
  cofinsAliquotaEspecificaValor: '0000000000',
  cofinsAliquotaReduzida: '00000',
  condicaoVendaIncoterm: 'EXW',
  condicaoVendaLocal: 'Armazem - Shenzhen',
  condicaoVendaMetodoValoracaoCodigo: '01',
  condicaoVendaMetodoValoracaoNome: "METODO 1 - ART. 1 DO ACORDO (DECRETO 92930/86)",
  condicaoVendaMoedaCodigo: '220',
  condicaoVendaMoedaNome: 'DOLAR DOS EUA',
  dadosCambiaisCoberturaCambialCodigo: '1',
  dadosCambiaisCoberturaCambialNome: "COM COBERTURA CAMBIAL E PAGAMENTO FINAL A PRAZO DE ATE' 180",
  dadosCambiaisInstituicaoFinanciadoraCodigo: '00',
  dadosCambiaisInstituicaoFinanciadoraNome: 'N/I',
  dadosCambiaisMotivoSemCoberturaCodigo: '00',
  dadosCambiaisMotivoSemCoberturaNome: 'N/I',
  dadosCambiaisValorRealCambio: '000000000000000',
  dadosCargaPaisProcedenciaCodigo: '000',
  dadosCargaUrfEntradaCodigo: '0000000',
  dadosCargaViaTransporteCodigo: '00',
  dadosMercadoriaAplicacao: 'REVENDA',
  dadosMercadoriaCodigoNaladiNCCA: '0000000',
  dadosMercadoriaCodigoNaladiSH: '00000000',
  dadosMercadoriaCondicao: 'NOVA',
  dcrCoeficienteReducao: '00000',
  dcrIdentificacao: '00000000',
  dcrValorDevido: '000000000000000',
  dcrValorDolar: '000000000000000',
  dcrValorReal: '000000000000000',
  dcrValorRecolher: '000000000000000',
  fabricanteNome: 'APUTURE IMAGING INDUSTRIES CO., LTD',
  fabricanteLogradouro: 'Building 21',
  fabricanteComplemento: 'Longjun Ind. State',
  fabricanteEstado: 'Longhua',
  fabricanteCidade: 'Shenzhen',
  fabricanteNumero: '21',
  fornecedorNome: 'AMGREAT HONG KONG LIMITED',
  fornecedorLogradouro: 'Building 21',
  fornecedorComplemento: 'Longjun Ind. State',
  fornecedorEstado: 'Longhua',
  fornecedorCidade: 'Shenzhen',
  fornecedorNumero: '21',
  freteMoedaNegociadaCodigo: '000',
  freteValorMoedaNegociada: '000000000000000',
  freteValorReais: '000000000000000',
  iiAcordoTarifarioTipoCodigo: '0',
  iiAliquotaAcordo: '00000',
  iiAliquotaPercentualReducao: '00000',
  iiAliquotaReduzida: '00000',
  iiAliquotaValorReduzido: '000000000000000',
  iiFundamentoLegalCodigo: '00',
  iiMotivoAdmissaoTemporariaCodigo: '00',
  iiRegimeTributacaoCodigo: '1',
  iiRegimeTributacaoNome: 'RECOLHIMENTO INTEGRAL',
  ipiAliquotaEspecificaCapacidadeRecipciente: '00000',
  ipiAliquotaEspecificaQuantidadeUnidadeMedida: '000000000',
  ipiAliquotaEspecificaTipoRecipienteCodigo: '00',
  ipiAliquotaEspecificaValorUnidadeMedida: '0000000000',
  ipiAliquotaNotaComplementarTIPI: '00',
  ipiAliquotaReduzida: '00000',
  ipiRegimeTributacaoCodigo: '4',
  ipiRegimeTributacaoNome: 'SEM BENEFICIO',
  numeroLI: '0000000000',
  paisAquisicaoMercadoriaCodigo: '160',
  paisAquisicaoMercadoriaNome: 'CHINA, REPUBLICA POPULAR',
  paisOrigemMercadoriaCodigo: '160',
  paisOrigemMercadoriaNome: 'CHINA, REPUBLICA POPULAR',
  pisCofinsBaseCalculoAliquotaICMS: '00000',
  pisCofinsBaseCalculoFundamentoLegalCodigo: '00',
  pisCofinsBaseCalculoPercentualReducao: '00000',
  pisCofinsFundamentoLegalReducaoCodigo: '00',
  pisPasepAliquotaEspecificaQuantidadeUnidade: '000000000',
  pisPasepAliquotaEspecificaValor: '0000000000',
  pisPasepAliquotaReduzida: '00000',
  relacaoCompradorVendedor: 'Fabricante não é o Exportador',
  seguroMoedaNegociadaCodigo: '000',
  seguroValorMoedaNegociada: '000000000000000',
  seguroValorReais: '000000000000000',
  sequencialRetificacao: '00',
  valorMultaARecolher: '000000000000000',
  valorMultaARecolherAjustado: '000000000000000',
  valorReaisSeguroInternacional: '000000000000000',
  vinculoCompradorVendedor: 'Não há vinculação entre comprador e vendedor.',
};

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function t(el, val) { el.txt(esc(val)); }

function buildXml(adicoes, d, taxaCambio) {
  const root = create({ version: '1.0', encoding: 'UTF-8', standalone: true })
    .ele('ListaDeclaracoes');
  const decl = root.ele('declaracaoImportacao');

  adicoes.forEach((adicao, idx) => {
    const ad = decl.ele('adicao');
    const tr = adicao.tributos;
    const f  = FIXOS_ADICAO;
    const isKg = adicao.config.unidadeEstatistica === 'QUILOGRAMA LIQUIDO';

    t(ad.ele('cideValorAliquotaEspecifica'),               f.cideValorAliquotaEspecifica);
    t(ad.ele('cideValorDevido'),                           f.cideValorDevido);
    t(ad.ele('cideValorRecolher'),                         f.cideValorRecolher);
    t(ad.ele('codigoRelacaoCompradorVendedor'),            f.codigoRelacaoCompradorVendedor);
    t(ad.ele('codigoVinculoCompradorVendedor'),            f.codigoVinculoCompradorVendedor);
    t(ad.ele('cofinsAliquotaAdValorem'),                   tr.cofinsAliquotaAdValorem);
    t(ad.ele('cofinsAliquotaEspecificaQuantidadeUnidade'), f.cofinsAliquotaEspecificaQuantidadeUnidade);
    t(ad.ele('cofinsAliquotaEspecificaValor'),             f.cofinsAliquotaEspecificaValor);
    t(ad.ele('cofinsAliquotaReduzida'),                    f.cofinsAliquotaReduzida);
    t(ad.ele('cofinsAliquotaValorDevido'),                 tr.cofinsAliquotaValorDevido);
    t(ad.ele('cofinsAliquotaValorRecolher'),               tr.cofinsAliquotaValorRecolher);
    t(ad.ele('condicaoVendaIncoterm'),                     f.condicaoVendaIncoterm);
    t(ad.ele('condicaoVendaLocal'),                        f.condicaoVendaLocal);
    t(ad.ele('condicaoVendaMetodoValoracaoCodigo'),        f.condicaoVendaMetodoValoracaoCodigo);
    t(ad.ele('condicaoVendaMetodoValoracaoNome'),          f.condicaoVendaMetodoValoracaoNome);
    t(ad.ele('condicaoVendaMoedaCodigo'),                  f.condicaoVendaMoedaCodigo);
    t(ad.ele('condicaoVendaMoedaNome'),                    f.condicaoVendaMoedaNome);
    t(ad.ele('condicaoVendaValorMoeda'),                   tr.condicaoVendaValorMoeda);
    t(ad.ele('condicaoVendaValorReais'),                   tr.condicaoVendaValorReais);
    t(ad.ele('dadosCambiaisCoberturaCambialCodigo'),       f.dadosCambiaisCoberturaCambialCodigo);
    t(ad.ele('dadosCambiaisCoberturaCambialNome'),         f.dadosCambiaisCoberturaCambialNome);
    t(ad.ele('dadosCambiaisInstituicaoFinanciadoraCodigo'),f.dadosCambiaisInstituicaoFinanciadoraCodigo);
    t(ad.ele('dadosCambiaisInstituicaoFinanciadoraNome'),  f.dadosCambiaisInstituicaoFinanciadoraNome);
    t(ad.ele('dadosCambiaisMotivoSemCoberturaCodigo'),     f.dadosCambiaisMotivoSemCoberturaCodigo);
    t(ad.ele('dadosCambiaisMotivoSemCoberturaNome'),       f.dadosCambiaisMotivoSemCoberturaNome);
    t(ad.ele('dadosCambiaisValorRealCambio'),              f.dadosCambiaisValorRealCambio);
    t(ad.ele('dadosCargaPaisProcedenciaCodigo'),           f.dadosCargaPaisProcedenciaCodigo);
    t(ad.ele('dadosCargaUrfEntradaCodigo'),                f.dadosCargaUrfEntradaCodigo);
    t(ad.ele('dadosCargaViaTransporteCodigo'),             f.dadosCargaViaTransporteCodigo);
    t(ad.ele('dadosMercadoriaAplicacao'),                  f.dadosMercadoriaAplicacao);
    t(ad.ele('dadosMercadoriaCodigoNaladiNCCA'),           f.dadosMercadoriaCodigoNaladiNCCA);
    t(ad.ele('dadosMercadoriaCodigoNaladiSH'),             f.dadosMercadoriaCodigoNaladiSH);
    t(ad.ele('dadosMercadoriaCodigoNcm'),                  adicao.ncm);
    t(ad.ele('dadosMercadoriaCondicao'),                   f.dadosMercadoriaCondicao);
    // Qtd estatística: UNIDADE usa ×10^5, QUILOGRAMA LIQUIDO usa ×10^3
    t(ad.ele('dadosMercadoriaMedidaEstatisticaQuantidade'),
      isKg ? formatQtdKg(adicao.qtdEstatistica) : formatQuantidade(adicao.qtdEstatistica));
    t(ad.ele('dadosMercadoriaMedidaEstatisticaUnidade'),   adicao.config.unidadeEstatistica);
    t(ad.ele('dadosMercadoriaNomeNcm'),                    adicao.config.nomeNcm);
    t(ad.ele('dadosMercadoriaPesoLiquido'),                formatPeso(adicao.pesoLiquido));
    t(ad.ele('dcrCoeficienteReducao'),                     f.dcrCoeficienteReducao);
    t(ad.ele('dcrIdentificacao'),                          f.dcrIdentificacao);
    t(ad.ele('dcrValorDevido'),                            f.dcrValorDevido);
    t(ad.ele('dcrValorDolar'),                             f.dcrValorDolar);
    t(ad.ele('dcrValorReal'),                              f.dcrValorReal);
    t(ad.ele('dcrValorRecolher'),                          f.dcrValorRecolher);

    t(ad.ele('destaqueNcm').ele('numeroDestaque'), '999');

    t(ad.ele('fabricanteCidade'),      f.fabricanteCidade);
    t(ad.ele('fabricanteComplemento'), f.fabricanteComplemento);
    t(ad.ele('fabricanteEstado'),      f.fabricanteEstado);
    t(ad.ele('fabricanteLogradouro'),  f.fabricanteLogradouro);
    t(ad.ele('fabricanteNome'),        f.fabricanteNome);
    t(ad.ele('fabricanteNumero'),      f.fabricanteNumero);
    t(ad.ele('fornecedorCidade'),      f.fornecedorCidade);
    t(ad.ele('fornecedorComplemento'), f.fornecedorComplemento);
    t(ad.ele('fornecedorEstado'),      f.fornecedorEstado);
    t(ad.ele('fornecedorLogradouro'),  f.fornecedorLogradouro);
    t(ad.ele('fornecedorNome'),        f.fornecedorNome);
    t(ad.ele('fornecedorNumero'),      f.fornecedorNumero);
    t(ad.ele('freteMoedaNegociadaCodigo'),   f.freteMoedaNegociadaCodigo);
    t(ad.ele('freteValorMoedaNegociada'),    f.freteValorMoedaNegociada);
    t(ad.ele('freteValorReais'),             f.freteValorReais);
    t(ad.ele('iiAcordoTarifarioTipoCodigo'), f.iiAcordoTarifarioTipoCodigo);
    t(ad.ele('iiAliquotaAcordo'),            f.iiAliquotaAcordo);
    t(ad.ele('iiAliquotaAdValorem'),         tr.iiAliquotaAdValorem);
    t(ad.ele('iiAliquotaPercentualReducao'), f.iiAliquotaPercentualReducao);
    t(ad.ele('iiAliquotaReduzida'),          f.iiAliquotaReduzida);
    t(ad.ele('iiAliquotaValorCalculado'),    tr.iiAliquotaValorCalculado);
    t(ad.ele('iiAliquotaValorDevido'),       tr.iiAliquotaValorDevido);
    t(ad.ele('iiAliquotaValorRecolher'),     tr.iiAliquotaValorRecolher);
    t(ad.ele('iiAliquotaValorReduzido'),     f.iiAliquotaValorReduzido);
    t(ad.ele('iiBaseCalculo'),               tr.iiBaseCalculo);
    t(ad.ele('iiFundamentoLegalCodigo'),     f.iiFundamentoLegalCodigo);
    t(ad.ele('iiMotivoAdmissaoTemporariaCodigo'), f.iiMotivoAdmissaoTemporariaCodigo);
    t(ad.ele('iiRegimeTributacaoCodigo'),    f.iiRegimeTributacaoCodigo);
    t(ad.ele('iiRegimeTributacaoNome'),      f.iiRegimeTributacaoNome);
    t(ad.ele('ipiAliquotaAdValorem'),        tr.ipiAliquotaAdValorem);
    t(ad.ele('ipiAliquotaEspecificaCapacidadeRecipciente'), f.ipiAliquotaEspecificaCapacidadeRecipciente);
    t(ad.ele('ipiAliquotaEspecificaQuantidadeUnidadeMedida'), f.ipiAliquotaEspecificaQuantidadeUnidadeMedida);
    t(ad.ele('ipiAliquotaEspecificaTipoRecipienteCodigo'), f.ipiAliquotaEspecificaTipoRecipienteCodigo);
    t(ad.ele('ipiAliquotaEspecificaValorUnidadeMedida'), f.ipiAliquotaEspecificaValorUnidadeMedida);
    t(ad.ele('ipiAliquotaNotaComplementarTIPI'), f.ipiAliquotaNotaComplementarTIPI);
    t(ad.ele('ipiAliquotaReduzida'),         f.ipiAliquotaReduzida);
    t(ad.ele('ipiBaseCalculo'),              tr.ipiBaseCalculo);
    t(ad.ele('ipiAliquotaValorDevido'),      tr.ipiAliquotaValorDevido);
    t(ad.ele('ipiAliquotaValorRecolher'),    tr.ipiAliquotaValorRecolher);
    t(ad.ele('ipiRegimeTributacaoCodigo'),   f.ipiRegimeTributacaoCodigo);
    t(ad.ele('ipiRegimeTributacaoNome'),     f.ipiRegimeTributacaoNome);

    // Mercadorias — quantidade sempre em UNIDADES (×10^5), unitário em USD×10^7
    adicao.itens.forEach((item, seq) => {
      const merc = ad.ele('mercadoria');
      t(merc.ele('descricaoMercadoria'),  item.descricao);
      t(merc.ele('numeroSequencialItem'), String(seq + 1).padStart(2, '0'));
      t(merc.ele('quantidade'),           formatQuantidade(item.qtd));
      t(merc.ele('unidadeMedida'),        'UN                  ');
      t(merc.ele('valorUnitario'),        formatValorUnitario(item.vlUnit, taxaCambio));
    });

    t(ad.ele('numeroAdicao'),  String(idx + 1).padStart(3, '0'));
    t(ad.ele('numeroDI'),      d.numeroDI);
    t(ad.ele('numeroLI'),      f.numeroLI);
    t(ad.ele('paisAquisicaoMercadoriaCodigo'), f.paisAquisicaoMercadoriaCodigo);
    t(ad.ele('paisAquisicaoMercadoriaNome'),   f.paisAquisicaoMercadoriaNome);
    t(ad.ele('paisOrigemMercadoriaCodigo'),    f.paisOrigemMercadoriaCodigo);
    t(ad.ele('paisOrigemMercadoriaNome'),      f.paisOrigemMercadoriaNome);
    t(ad.ele('pisCofinsBaseCalculoAliquotaICMS'),       f.pisCofinsBaseCalculoAliquotaICMS);
    t(ad.ele('pisCofinsBaseCalculoFundamentoLegalCodigo'), f.pisCofinsBaseCalculoFundamentoLegalCodigo);
    t(ad.ele('pisCofinsBaseCalculoPercentualReducao'),  f.pisCofinsBaseCalculoPercentualReducao);
    t(ad.ele('pisCofinsBaseCalculoValor'),              tr.pisCofinsBaseCalculoValor);
    t(ad.ele('pisCofinsFundamentoLegalReducaoCodigo'),  f.pisCofinsFundamentoLegalReducaoCodigo);
    t(ad.ele('pisCofinsRegimeTributacaoCodigo'),        tr.pisCofinsRegimeTributacaoCodigo);
    t(ad.ele('pisCofinsRegimeTributacaoNome'),          tr.pisCofinsRegimeTributacaoNome);
    t(ad.ele('pisPasepAliquotaAdValorem'),              tr.pisPasepAliquotaAdValorem);
    t(ad.ele('pisPasepAliquotaEspecificaQuantidadeUnidade'), f.pisPasepAliquotaEspecificaQuantidadeUnidade);
    t(ad.ele('pisPasepAliquotaEspecificaValor'),        f.pisPasepAliquotaEspecificaValor);
    t(ad.ele('pisPasepAliquotaReduzida'),               f.pisPasepAliquotaReduzida);
    t(ad.ele('pisPasepAliquotaValorDevido'),            tr.pisPasepAliquotaValorDevido);
    t(ad.ele('pisPasepAliquotaValorRecolher'),          tr.pisPasepAliquotaValorRecolher);
    t(ad.ele('relacaoCompradorVendedor'),               f.relacaoCompradorVendedor);
    t(ad.ele('seguroMoedaNegociadaCodigo'),             f.seguroMoedaNegociadaCodigo);
    t(ad.ele('seguroValorMoedaNegociada'),              f.seguroValorMoedaNegociada);
    t(ad.ele('seguroValorReais'),                       f.seguroValorReais);
    t(ad.ele('sequencialRetificacao'),                  f.sequencialRetificacao);
    t(ad.ele('valorMultaARecolher'),                    f.valorMultaARecolher);
    t(ad.ele('valorMultaARecolherAjustado'),            f.valorMultaARecolherAjustado);
    t(ad.ele('valorReaisFreteInternacional'),           tr.valorReaisFreteInternacional);
    t(ad.ele('valorReaisSeguroInternacional'),          f.valorReaisSeguroInternacional);
    t(ad.ele('valorTotalCondicaoVenda'),                tr.valorTotalCondicaoVenda);
    t(ad.ele('vinculoCompradorVendedor'),               f.vinculoCompradorVendedor);
  });

  buildDadosGerais(decl, d, adicoes);

  return root.end({ prettyPrint: true });
}

function pad15kg(kg) {
  return String(Math.round((kg || 0) * 1000)).padStart(15, '0');
}

function buildDadosGerais(decl, d, adicoes) {
  const e = d.enderecoImportador || {};

  // localDescarga/Embarque: frete total em USD (valor aduaneiro total / taxaCambio × 10^4)
  // Usa os valores da secao de frete do DUIMP se disponível
  const freteUSDCentavos = String(Math.round((d.freteUSD || 0) * 100)).padStart(15,'0');
  const freteReaisCentavos = '000000000000000';

  const arm = decl.ele('armazem');
  t(arm.ele('nomeArmazem'), 'FORTE DISTRIBUICAO');

  t(decl.ele('armazenamentoRecintoAduaneiroCodigo'), d.recintoCodigo || '9103002');
  t(decl.ele('armazenamentoRecintoAduaneiroNome'), d.recintoNome || 'FORTE DISTRIBUIÇÃO E LOGÍSTICA DO BRASIL LTDA.');
  t(decl.ele('armazenamentoSetor'), '001');
  t(decl.ele('canalSelecaoParametrizada'), '001');
  t(decl.ele('caracterizacaoOperacaoCodigoTipo'), '1');
  t(decl.ele('caracterizacaoOperacaoDescricaoTipo'), 'Importação Própria');
  t(decl.ele('cargaDataChegada'), d.dataChegadaYMD || '');
  t(decl.ele('cargaNumeroAgente'), 'N/I');
  t(decl.ele('cargaPaisProcedenciaCodigo'), '160');
  t(decl.ele('cargaPaisProcedenciaNome'), 'CHINA, REPUBLICA POPULAR');
  t(decl.ele('cargaPesoBruto'), pad15kg(d.pesoBruto));
  t(decl.ele('cargaPesoLiquido'), pad15kg(d.pesoLiquido));
  t(decl.ele('cargaUrfEntradaCodigo'), d.urfDespacho || '0927800');
  t(decl.ele('cargaUrfEntradaNome'), d.urfNome || 'ITAJAI');
  t(decl.ele('conhecimentoCargaEmbarqueData'), d.dataEmbarqueYMD || '');
  t(decl.ele('conhecimentoCargaEmbarqueLocal'), d.embarqueLocal || '');
  t(decl.ele('conhecimentoCargaId'), d.hbl || '');
  t(decl.ele('conhecimentoCargaIdMaster'), d.hbl || '');
  t(decl.ele('conhecimentoCargaTipoCodigo'), '02');
  t(decl.ele('conhecimentoCargaTipoNome'), 'HBL - House Bill of Lading');
  t(decl.ele('conhecimentoCargaUtilizacao'), '1');
  t(decl.ele('conhecimentoCargaUtilizacaoNome'), 'Total');
  t(decl.ele('dataRegistro'), d.dataRegistro || '');
  t(decl.ele('documentoChegadaCargaCodigoTipo'), '1');
  t(decl.ele('documentoChegadaCargaNome'), 'Conhecimento de Carga');
  t(decl.ele('documentoChegadaCargaNumero'), d.docChegada || '');

  // Documentos de instrução de despacho
  const docs = [
    { cod: '28', nome: 'CONHECIMENTO DE CARGA', num: d.hbl || '' },
    { cod: '01', nome: 'FATURA COMERCIAL', num: d.invoice || '' },
    { cod: '29', nome: 'ROMANEIO DE CARGA', num: d.packingList || 'SN' },
  ];
  docs.forEach(doc => {
    const el = decl.ele('documentoInstrucaoDespacho');
    t(el.ele('codigoTipoDocumentoDespacho'), doc.cod);
    t(el.ele('nomeDocumentoDespacho'), doc.nome.padEnd(60, ' '));
    t(el.ele('numeroDocumentoDespacho'), doc.num.padEnd(25, ' '));
  });

  // Embalagem
  const emb = decl.ele('embalagem');
  t(emb.ele('codigoTipoEmbalagem'), '20');
  t(emb.ele('nomeEmbalagem'), 'CONTAINER'.padEnd(60, ' '));
  t(emb.ele('quantidadeVolume'), d.containerQtd || '00001');

  t(decl.ele('freteCollect'), '000000000000000');
  t(decl.ele('freteEmTerritorioNacional'), '000000000000000');
  t(decl.ele('freteMoedaNegociadaCodigo'), '220');
  t(decl.ele('freteMoedaNegociadaNome'), 'DOLAR DOS EUA');
  t(decl.ele('fretePrepaid'), '000000000000000');
  t(decl.ele('freteTotalDolares'), '000000000000000');
  t(decl.ele('freteTotalMoeda'), '0');
  t(decl.ele('freteTotalReais'), '000000000000000');

  decl.ele('icms'); // elemento vazio <icms/>

  t(decl.ele('importadorCodigoTipo'), '1');
  t(decl.ele('importadorCpfRepresentanteLegal'), d.cpfDespachante || '');
  t(decl.ele('importadorEnderecoBairro'), e.bairro || '');
  t(decl.ele('importadorEnderecoCep'), (e.cep || '').replace(/\D/g,''));
  t(decl.ele('importadorEnderecoComplemento'), e.complemento || '');
  t(decl.ele('importadorEnderecoLogradouro'), e.logradouro || '');
  t(decl.ele('importadorEnderecoMunicipio'), e.municipio || '');
  t(decl.ele('importadorEnderecoNumero'), e.numero || '');
  t(decl.ele('importadorEnderecoUf'), e.uf || '');
  t(decl.ele('importadorNome'), esc(d.nomeImportador || ''));
  t(decl.ele('importadorNomeRepresentanteLegal'), d.nomeDespachante || '');
  t(decl.ele('importadorNumero'), (d.cnpjImportadorNumero || '').replace(/\D/g,''));
  t(decl.ele('importadorNumeroTelefone'), d.telefone || '');
  t(decl.ele('informacaoComplementar'), d.informacaoComplementar || '');
  t(decl.ele('localDescargaTotalDolares'), freteUSDCentavos);
  t(decl.ele('localDescargaTotalReais'), freteReaisCentavos);
  t(decl.ele('localEmbarqueTotalDolares'), freteUSDCentavos);
  t(decl.ele('localEmbarqueTotalReais'), freteReaisCentavos);
  t(decl.ele('modalidadeDespachoCodigo'), '1');
  t(decl.ele('modalidadeDespachoNome'), 'Normal');
  t(decl.ele('numeroDI'), d.numeroDI || '');
  t(decl.ele('operacaoFundap'), 'N');
  t(decl.ele('seguroMoedaNegociadaCodigo'), '220');
  t(decl.ele('seguroMoedaNegociadaNome'), 'DOLAR DOS EUA');
  t(decl.ele('seguroTotalDolares'), '000000000000000');
  t(decl.ele('seguroTotalMoedaNegociada'), '000000000000000');
  t(decl.ele('seguroTotalReais'), '000000000000000');
  t(decl.ele('sequencialRetificacao'), '00');
  t(decl.ele('situacaoEntregaCarga'), 'ENTREGA NAO AUTORIZADA');
  t(decl.ele('tipoDeclaracaoCodigo'), '01');
  t(decl.ele('tipoDeclaracaoNome'), 'CONSUMO');
  t(decl.ele('totalAdicoes'), String(adicoes.length).padStart(3,'0'));
  t(decl.ele('urfDespachoCodigo'), d.urfDespacho || '');
  t(decl.ele('urfDespachoNome'), d.urfNome || '');
  t(decl.ele('valorTotalMultaARecolherAjustado'), '000000000000000');
  t(decl.ele('viaTransporteCodigo'), '07');
  t(decl.ele('viaTransporteMultimodal'), 'N');
  t(decl.ele('viaTransporteNome'), 'MARÍTIMA');
  t(decl.ele('viaTransporteNomeTransportador'), 'N/I');
  t(decl.ele('viaTransportePaisTransportadorCodigo'), '000');
  t(decl.ele('viaTransportePaisTransportadorNome'), 'N/I');
}

module.exports = buildXml;
