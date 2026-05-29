const pdfParse = require('pdf-parse');

// Converte "14/04/2026" ou "14/04/26" → "20260414"
function toYMD(strData) {
  if (!strData) return '';
  const m = strData.match(/(\d{2})[\/-](\d{2})[\/-](\d{2,4})/);
  if (!m) return '';
  const [, d, mo, y] = m;
  const ano = y.length === 2 ? '20' + y : y;
  return `${ano}${mo}${d}`;
}

async function parseDuimp(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text;

  const extract = (pattern, group = 1) => {
    const m = text.match(pattern);
    return m ? m[group].trim() : '';
  };

  const numeroDI       = extract(/(\d{2}BR\d{10})/);
  const cnpjRaw        = extract(/CNPJ do importador:\s*([\d.\/\-]+)/);
  const nomeImportador = extract(/Nome do importador:\s*(.+)/);
  const hbl            = extract(/HBL No\.:\s*([A-Z0-9]+)/i);
  const invoice        = extract(/INVOICE No\.:\s*([A-Z0-9]+)/i);
  const packingList    = extract(/PACKING LIST No\.:\s*([A-Z0-9]+)/i);
  const dataEmbarqueStr= extract(/EMBARQUE:\s*([\d\/]+)/);
  const dataChegadaStr = extract(/CHEGADA:\s*([\d\/]+)/);
  const urfDespacho    = extract(/URF DESPACHO:\s*(\d+)/);
  const urfNome        = extract(/URF DESPACHO:\s*\d+\s*-\s*([A-Z]+)/);
  const embarqueLocal  = extract(/EMBARQUE:.*?\(([A-Z]{4,6})\)/);
  const pesoBrutoStr   = extract(/Peso Bruto \(kg\):\s*([\d.,]+)/);
  const pesoLiqStr     = extract(/Peso L[íi]quido \(kg\):\s*([\d.,]+)/);
  const taxaSisStr     = extract(/TAXA SISCOMEX - R\$\s*([\d.,]+)/);
  const cpfDesp        = extract(/CPF sob o n[oº] ([\d.\-]+)/);
  const nomeDesp       = extract(/([A-Z][A-Z\s]+),\s*brasileiro.*Despachante/i);

  // Número do documento de chegada da carga (15 dígitos)
  const docChegada     = extract(/(\d{15})/);

  // Endereço do importador — padrão: "RUA X, NUM COMPL - CIDADE - CEP - UF"
  const endLogradouro  = extract(/(?:RUA|AV\.?|AVENIDA|ALAMEDA)\s+([A-ZÁÉÍÓÚÇÃÕ\s]+?)(?=,\s*\d)/i);
  const endNumero      = extract(/,\s*(\d+)\s*/i);
  const endCompl       = extract(/(SALA\s*[A-Z]\s*BOX\s*\d+)/i);
  // Padrão: "COMPL - CIDADE - CEP - UF"  ou  "COMPL - CIDADE - UF CEP"
  const addrM = text.match(/BOX\s*\d+\s*-\s*([A-ZÁÉÍÓÚ\s]+?)\s*-\s*(\d{7,8})\s*-\s*([A-Z]{2})/i)
             || text.match(/BOX\s*\d+\s*-\s*([A-ZÁÉÍÓÚ\s]+?)\s*-\s*([A-Z]{2})\s+(\d{7,8})/i);
  const endBairro    = '';  // não disponível no PDF, deixar vazio
  const endMunicipio = addrM ? addrM[1].trim() : '';
  const endCep       = addrM ? (addrM[2].replace(/\D/g,'').length === 8 ? addrM[2].replace(/\D/g,'') : addrM[3].replace(/\D/g,'')) : '';
  const endUf        = addrM ? (addrM[2].length === 2 ? addrM[2] : addrM[3]) : '';

  // Recinto / armazém
  const recintoCodigo  = extract(/(\d{7})\s*-\s*FORTE/);
  const recintoNome    = extract(/(\d{7})\s*-\s*(FORTE[^\/\n]+)/i, 2)?.trim() || '';

  // Telefone importador
  const telefone       = extract(/[Tt]el[:\s.]+(\d{2}[\s.]*\d{8,9})/);

  // Data de registro: "FORTALEZA, DD DE MÊS DE YYYY" — pegar a ÚLTIMA ocorrência
  const MESES = { JANEIRO:'01',FEVEREIRO:'02',MARÇO:'03',ABRIL:'04',MAIO:'05',JUNHO:'06',
                  JULHO:'07',AGOSTO:'08',SETEMBRO:'09',OUTUBRO:'10',NOVEMBRO:'11',DEZEMBRO:'12' };
  const regMatches = [...text.matchAll(/(\d{1,2})\s+DE\s+([A-ZÇÕÃ]+)\s+DE\s+(\d{4})/g)];
  let dataRegistro = '';
  // Preferir o match que está no bloco de assinatura (depois de "FORTALEZA" ou "AUTORIZO")
  const sigBlock = text.match(/FORTALEZA,?\s*(\d{1,2})\s+DE\s+([A-ZÇÕÃ]+)\s+DE\s+(\d{4})/i);
  const regMatch = sigBlock || (regMatches.length ? regMatches[regMatches.length - 1] : null);
  if (regMatch) {
    const [, dia, mes, ano] = sigBlock
      ? [null, sigBlock[1], sigBlock[2], sigBlock[3]]
      : [null, regMatch[1], regMatch[2], regMatch[3]];
    const mesNum = MESES[mes?.toUpperCase()] || '00';
    dataRegistro = `${ano}${mesNum}${String(dia).padStart(2,'0')}`;
  }

  // Container / volumes
  const containerQtd = extract(/(\d+)\s*(?:container|CONTAINER)/i) || '1';

  // localDescarga/Embarque: frete × taxa (estimativa)
  const freteUSD = parseFloat(extract(/VALOR DO FRETE[:\s]+([\d.,]+)\s+USD/i)?.replace(',', '.')) || 0;

  // Linha de informacaoComplementar — pegar o bloco de texto que começa com "/-USD"
  const infoMatch = text.match(/(\/-USD[\s\S]+?FORTALEZA[\s\S]+?\d{4})/);
  const informacaoComplementar = infoMatch ? infoMatch[1].replace(/\r/g, '').trim() : '';

  const parseBR = (s) => parseFloat(String(s || '0').replace(/\./g,'').replace(',','.')) || 0;

  return {
    numeroDI,
    cnpjImportador: cnpjRaw,
    cnpjImportadorNumero: cnpjRaw.replace(/\D/g, ''),
    nomeImportador,
    enderecoImportador: {
      logradouro:  endLogradouro?.replace(/RUA\s+/i,'').trim() || '',
      numero:      endNumero || '',
      complemento: endCompl?.replace(/\s+/g,' ').trim() || '',
      bairro:      endBairro?.trim() || '',
      municipio:   endMunicipio || '',
      uf:          endUf || '',
      cep:         endCep.slice(0,8),
    },
    hbl,
    invoice,
    packingList,
    dataEmbarque:    dataEmbarqueStr,
    dataEmbarqueYMD: toYMD(dataEmbarqueStr),
    dataChegada:     dataChegadaStr,
    dataChegadaYMD:  toYMD(dataChegadaStr),
    dataRegistro,
    urfDespacho,
    urfNome: urfNome || '',
    embarqueLocal,
    recintoCodigo,
    recintoNome,
    pesoBruto:   parseBR(pesoBrutoStr.replace('.', '').replace(',', '.')),
    pesoLiquido: parseBR(pesoLiqStr.replace('.', '').replace(',', '.')),
    taxaSiscomex: parseBR(taxaSisStr.replace('.', '').replace(',', '.')),
    cpfDespachante: cpfDesp?.replace(/\D/g,'') || '',
    nomeDespachante: nomeDesp?.trim() || '',
    telefone: telefone || '',
    docChegada,
    containerQtd: String(parseInt(containerQtd) || 1).padStart(5,'0'),
    freteUSD,
    informacaoComplementar,
    itens: parseDuimpItems(text),
  };
}

function parseDuimpItems(text) {
  const blocos = text.split(/Item \d{5}/);
  const itens = [];
  for (const bloco of blocos.slice(1)) {
    const ncm = bloco.match(/NCM:\s*([\d.]+)/)?.[1]?.replace(/\./g, '') || '';
    const qtdStr = bloco.match(/Quantidade na unidade estat[íi]stica:\s*([\d.,]+)/)?.[1] || '0';
    const qtd = parseFloat(qtdStr.replace(/\./g,'').replace(',','.')) || 0;
    const pesoStr = bloco.match(/Peso l[íi]quido \(kg\):\s*([\d.,]+)/)?.[1] || '0';
    const peso = parseFloat(pesoStr.replace(/\./g,'').replace(',','.')) || 0;
    const unid = bloco.match(/Unidade de medida estat[íi]stica:\s*(\S+)/)?.[1] ||
                 (bloco.includes('QUILOGRAMA') ? 'QUILOGRAMA LIQUIDO' : 'UNIDADE');
    const descricao = bloco.match(
      /Detalhamento do Produto:\s*(.+?)(?=Descri[çc][aã]o complementar|N[úu]mero de s[ée]rie|$)/s
    )?.[1]?.replace(/\s+/g,' ').trim() || '';
    if (ncm) itens.push({ ncm: ncm.slice(0, 8), qtd, peso, unidade: unid, descricao });
  }
  return itens;
}

module.exports = parseDuimp;
