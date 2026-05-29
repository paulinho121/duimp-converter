// Vercel Serverless Function — POST /api/convert
const multer  = require('multer');
const parseDuimp         = require('../backend/services/parseDuimp');
const parseExcel         = require('../backend/services/parseExcel');
const { groupByNcm }     = require('../backend/services/groupByNcm');
const buildXml           = require('../backend/services/buildXml');

const upload = multer({ storage: multer.memoryStorage() }).fields([
  { name: 'duimp', maxCount: 1 },
  { name: 'excel', maxCount: 1 },
]);

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

    if (!req.files?.duimp || !req.files?.excel) {
      return res.status(400).json({ success: false, error: 'Envie os arquivos PDF (duimp) e XLSX (excel).' });
    }

    const dadosDuimp = await parseDuimp(req.files.duimp[0].buffer);
    const dadosExcel = parseExcel(req.files.excel[0].buffer);
    const adicoes    = groupByNcm(dadosDuimp.itens, dadosExcel.itens, dadosExcel.taxaCambio);
    const xmlString  = buildXml(adicoes, dadosDuimp, dadosExcel.taxaCambio);
    const xmlBase64  = Buffer.from(xmlString, 'utf8').toString('base64');

    const valorTotalBRL = adicoes.reduce((s, a) => s + a.totalBRL, 0);
    const iiTotal       = adicoes.reduce((s, a) => s + a.vlIITotal, 0);
    const ipiTotal      = adicoes.reduce((s, a) => s + a.vlIPITotal, 0);
    const pisTotal      = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlPIS, 0), 0);
    const cofinsTotal   = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlCOFINS, 0), 0);
    const afrmmTotal    = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlAFRMM, 0), 0);

    return res.json({
      success: true,
      numeroDI:   dadosDuimp.numeroDI,
      taxaCambio: dadosExcel.taxaCambio,
      adicoes,
      xmlBase64,
      resumo: {
        totalItens:   adicoes.reduce((s, a) => s + a.itens.length, 0),
        totalAdicoes: adicoes.length,
        valorTotalBRL,
        iiTotal, ipiTotal, pisTotal, cofinsTotal, afrmmTotal,
        totalNF: valorTotalBRL + iiTotal + ipiTotal + pisTotal + cofinsTotal + afrmmTotal,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
