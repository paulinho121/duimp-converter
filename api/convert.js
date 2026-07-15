// Vercel Serverless Function — POST /api/convert
const multer  = require('multer');
const parseDuimp                   = require('../backend/services/parseDuimp');
const parseExcel                   = require('../backend/services/parseExcel');
const parseXmlEspelho              = require('../backend/services/parseXmlEspelho');
const { groupByNcm, groupByAdicao } = require('../backend/services/groupByNcm');
const buildXml                     = require('../backend/services/buildXml');
const { calcularICMS }             = require('../backend/services/calcTributos');

const upload = multer({ storage: multer.memoryStorage() }).fields([
  { name: 'duimp', maxCount: 1 },
  { name: 'excel', maxCount: 1 },
  { name: 'xml',   maxCount: 1 },
]);

// Converte a taxa de câmbio informada na tela (aceita "5,0139" ou "5.0139")
function parseTaxa(v) {
  return parseFloat(String(v ?? '').trim().replace(',', '.')) || 0;
}

// Override de redução PIS/COFINS por adição: array com true/false/null (JSON)
function parseOverrides(v) {
  if (!v) return [];
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Helper: promisify multer para serverless
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await runMiddleware(req, res, upload);

    const temExcel = !!req.files?.excel;
    const temXml   = !!req.files?.xml;

    if (!req.files?.duimp || (!temExcel && !temXml)) {
      return res.status(400).json({ success: false, error: 'Envie o PDF (duimp) e o espelho: XLSX (excel) ou XML (xml).' });
    }

    const dadosDuimp = await parseDuimp(req.files.duimp[0].buffer);
    const reducaoOverrides = parseOverrides(req.body.reducaoOverrides);

    let adicoes;
    let taxaCambio;
    let ufDesembaraco = dadosDuimp.ufDesembaraco || '';

    if (temXml) {
      taxaCambio = parseTaxa(req.body.taxaCambio);
      if (!taxaCambio) {
        return res.status(400).json({ success: false, error: 'Informe a taxa de câmbio (Dólar Fiscal) para o espelho em XML.' });
      }
      const dadosXml = parseXmlEspelho(req.files.xml[0].buffer);
      ufDesembaraco = dadosXml.ufDesembaraco || ufDesembaraco;
      adicoes = groupByAdicao(dadosDuimp.itens, dadosXml.itens, taxaCambio, reducaoOverrides);
    } else {
      const dadosExcel = parseExcel(req.files.excel[0].buffer);
      taxaCambio = dadosExcel.taxaCambio;
      adicoes = groupByNcm(dadosDuimp.itens, dadosExcel.itens, taxaCambio, reducaoOverrides);
    }

    const xmlString  = buildXml(adicoes, dadosDuimp, taxaCambio);
    const xmlBase64  = Buffer.from(xmlString, 'utf8').toString('base64');

    const valorTotalBRL = adicoes.reduce((s, a) => s + a.totalBRL, 0);
    const iiTotal       = adicoes.reduce((s, a) => s + a.vlIITotal, 0);
    const ipiTotal      = adicoes.reduce((s, a) => s + a.vlIPITotal, 0);
    const pisTotal      = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlPIS, 0), 0);
    const cofinsTotal   = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlCOFINS, 0), 0);
    const afrmmTotal    = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlAFRMM, 0), 0);

    // ICMS: só é adicionado quando a importação entra por São Paulo
    const entrouPorSP = ufDesembaraco === 'SP';
    const icms        = entrouPorSP ? calcularICMS(adicoes) : { valor: 0, aliquota: 0, baseCalculo: 0 };
    const icmsTotal   = icms.valor;
    const totalNF     = valorTotalBRL + iiTotal + ipiTotal + pisTotal + cofinsTotal + afrmmTotal + icmsTotal;

    return res.json({
      success: true,
      numeroDI:   dadosDuimp.numeroDI,
      taxaCambio,
      adicoes,
      xmlBase64,
      resumo: {
        totalItens:   adicoes.reduce((s, a) => s + a.itens.length, 0),
        totalAdicoes: adicoes.length,
        valorTotalBRL,
        iiTotal, ipiTotal, pisTotal, cofinsTotal, afrmmTotal,
        icmsTotal,
        icmsBase: icms.baseCalculo,
        icmsAliquota: icms.aliquota,
        ufDesembaraco,
        entrouPorSP,
        totalNF,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
