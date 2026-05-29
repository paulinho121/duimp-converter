// Vercel Serverless Function — POST /api/debug-excel
const multer = require('multer');
const XLSX   = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() }).fields([{ name: 'excel', maxCount: 1 }]);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await runMiddleware(req, res, upload);
    const buf = req.files?.excel?.[0]?.buffer;
    if (!buf) return res.status(400).json({ error: 'Envie o arquivo excel' });

    const wb   = XLSX.read(buf, { type: 'buffer' });
    const ws   = wb.Sheets['Minuta NF Importação'] || wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    const preview = data.slice(0, 60).map((row, i) => ({
      linha: i, col0: row[0], col1: row[1], col2: row[2], col3: row[3], col4: row[4],
    }));

    return res.json({ sheetNames: wb.SheetNames, totalLinhas: data.length, preview });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
