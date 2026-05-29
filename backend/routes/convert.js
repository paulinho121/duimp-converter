const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const router = express.Router();
const parseDuimp = require('../services/parseDuimp');
const parseExcel = require('../services/parseExcel');
const { groupByNcm } = require('../services/groupByNcm');
const calcTributos = require('../services/calcTributos');
const buildXml = require('../services/buildXml');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/convert', upload.fields([
  { name: 'duimp', maxCount: 1 },
  { name: 'excel', maxCount: 1 },
]), async (req, res) => {
  try {
    if (!req.files?.duimp || !req.files?.excel) {
      return res.status(400).json({ success: false, error: 'Envie os arquivos PDF (duimp) e XLSX (excel).' });
    }

    const duimpBuffer = req.files.duimp[0].buffer;
    const excelBuffer = req.files.excel[0].buffer;

    const dadosDuimp = await parseDuimp(duimpBuffer);
    const dadosExcel = parseExcel(excelBuffer);

    const adicoes = groupByNcm(dadosDuimp.itens, dadosExcel.itens, dadosExcel.taxaCambio);

    const xmlString = buildXml(adicoes, dadosDuimp, dadosExcel.taxaCambio);
    const xmlBase64 = Buffer.from(xmlString, 'utf8').toString('base64');

    const valorTotalBRL = adicoes.reduce((s, a) => s + a.totalBRL, 0);
    const iiTotal       = adicoes.reduce((s, a) => s + a.vlIITotal, 0);
    const ipiTotal      = adicoes.reduce((s, a) => s + a.vlIPITotal, 0);
    const pisTotal      = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlPIS, 0), 0);
    const cofinsTotal   = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlCOFINS, 0), 0);
    const afrmmTotal    = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlAFRMM, 0), 0);
    const totalNF       = valorTotalBRL + iiTotal + ipiTotal + pisTotal + cofinsTotal + afrmmTotal;

    const resumo = {
      totalItens:   adicoes.reduce((s, a) => s + a.itens.length, 0),
      totalAdicoes: adicoes.length,
      valorTotalBRL,
      iiTotal,
      ipiTotal,
      pisTotal,
      cofinsTotal,
      afrmmTotal,
      totalNF,
    };

    res.json({
      success: true,
      numeroDI: dadosDuimp.numeroDI,
      taxaCambio: dadosExcel.taxaCambio,
      adicoes,
      xmlBase64,
      resumo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Debug: inspeciona estrutura do Excel sem processar
router.post('/debug-excel', upload.fields([{ name: 'excel', maxCount: 1 }]), (req, res) => {
  try {
    const buf = req.files?.excel?.[0]?.buffer;
    if (!buf) return res.status(400).json({ error: 'Envie o arquivo excel' });

    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheetNames = wb.SheetNames;
    const ws = wb.Sheets['Minuta NF Importação'] || wb.Sheets[sheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Primeiras 50 linhas com seus rótulos (coluna 0)
    const preview = data.slice(0, 60).map((row, i) => ({
      linha: i,
      col0: row[0],
      col1: row[1],
      col2: row[2],
      col3: row[3],
      col4: row[4],
      col5: row[5],
      col6: row[6],
    }));

    res.json({ sheetNames, totalLinhas: data.length, preview });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
