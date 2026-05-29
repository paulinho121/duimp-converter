const express = require('express');
const cors    = require('cors');
const path    = require('path');
const net     = require('net');
const { exec } = require('child_process');
const convertRouter = require('./routes/convert');

const app = express();

// Quando empacotado com pkg, process.pkg existe e o exe fica em process.execPath
const isPackaged = Boolean(process.pkg);
const appRoot    = isPackaged ? path.dirname(process.execPath) : __dirname;
const publicPath = path.join(appRoot, 'public');

app.use(cors());
app.use(express.json());

// API
app.use('/api', convertRouter);

// Frontend estático (build do React)
app.use(express.static(publicPath));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Encontra porta disponível a partir de 3001
function findPort(start) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(findPort(start + 1)));
    srv.once('listening', () => { srv.close(); resolve(start); });
    srv.listen(start);
  });
}

findPort(3001).then(PORT => {
  app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║      DUIMP Converter  v1.0.0         ║');
    console.log(`  ║   Rodando em: ${url.padEnd(22)}║`);
    console.log('  ║   Feche esta janela para encerrar.   ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');

    // Abre o browser automaticamente após 1,5s
    setTimeout(() => {
      const cmd = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
      exec(cmd, err => { if (err) console.error('Não foi possível abrir o browser:', err.message); });
    }, 1500);
  });
});
