const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const router = express.Router();
const parseDuimp = require('../services/parseDuimp');
const parseExcel = require('../services/parseExcel');
const parseXmlEspelho = require('../services/parseXmlEspelho');
const { groupByNcm, groupByAdicao } = require('../services/groupByNcm');
const calcTributos = require('../services/calcTributos');
const buildXml = require('../services/buildXml');

const upload = multer({ storage: multer.memoryStorage() });

// Converte a taxa de câmbio informada na tela (aceita "5,0139" ou "5.0139")
function parseTaxa(v) {
  return parseFloat(String(v ?? '').trim().replace(',', '.')) || 0;
}

router.post('/convert', upload.fields([
  { name: 'duimp', maxCount: 1 },
  { name: 'excel', maxCount: 1 },
  { name: 'xml',   maxCount: 1 },
]), async (req, res) => {
  try {
    const temExcel = !!req.files?.excel;
    const temXml   = !!req.files?.xml;

    if (!req.files?.duimp || (!temExcel && !temXml)) {
      return res.status(400).json({
        success: false,
        error: 'Envie o PDF (duimp) e o espelho: XLSX (excel) ou XML (xml).',
      });
    }

    const dadosDuimp = await parseDuimp(req.files.duimp[0].buffer);

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
      adicoes = groupByAdicao(dadosDuimp.itens, dadosXml.itens, taxaCambio);
    } else {
      const dadosExcel = parseExcel(req.files.excel[0].buffer);
      taxaCambio = dadosExcel.taxaCambio;
      adicoes = groupByNcm(dadosDuimp.itens, dadosExcel.itens, taxaCambio);
    }

    const xmlString = buildXml(adicoes, dadosDuimp, taxaCambio);
    const xmlBase64 = Buffer.from(xmlString, 'utf8').toString('base64');

    const valorTotalBRL = adicoes.reduce((s, a) => s + a.totalBRL, 0);
    const iiTotal       = adicoes.reduce((s, a) => s + a.vlIITotal, 0);
    const ipiTotal      = adicoes.reduce((s, a) => s + a.vlIPITotal, 0);
    const pisTotal      = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlPIS, 0), 0);
    const cofinsTotal   = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlCOFINS, 0), 0);
    const afrmmTotal    = adicoes.reduce((s, a) => s + a.itens.reduce((x, i) => x + i.vlAFRMM, 0), 0);

    // ICMS: só é adicionado quando a importação entra por São Paulo
    const entrouPorSP = ufDesembaraco === 'SP';
    const icms        = entrouPorSP ? calcTributos.calcularICMS(adicoes) : { valor: 0, aliquota: 0, baseCalculo: 0 };
    const icmsTotal   = icms.valor;

    const totalNF = valorTotalBRL + iiTotal + ipiTotal + pisTotal + cofinsTotal + afrmmTotal + icmsTotal;

    const resumo = {
      totalItens:   adicoes.reduce((s, a) => s + a.itens.length, 0),
      totalAdicoes: adicoes.length,
      valorTotalBRL,
      iiTotal,
      ipiTotal,
      pisTotal,
      cofinsTotal,
      afrmmTotal,
      icmsTotal,
      icmsBase: icms.baseCalculo,
      icmsAliquota: icms.aliquota,
      ufDesembaraco,
      entrouPorSP,
      totalNF,
    };

    res.json({
      success: true,
      numeroDI: dadosDuimp.numeroDI,
      taxaCambio,
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
