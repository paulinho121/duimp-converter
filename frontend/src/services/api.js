import axios from 'axios';

// Em desenvolvimento usa o proxy do Vite (localhost:3001)
// Em produção (Vercel) usa a URL relativa /api/...
const BASE = import.meta.env.VITE_API_URL || '';

// mode: 'excel' | 'xml'. No modo 'xml' o espelho é uma NF-e e a taxa de
// câmbio (Dólar Fiscal) é informada manualmente.
export async function convertFiles(duimpFile, espelhoFile, mode = 'excel', taxaCambio = '', reducaoOverrides = []) {
  const form = new FormData();
  form.append('duimp', duimpFile);
  if (mode === 'xml') {
    form.append('xml', espelhoFile);
    form.append('taxaCambio', taxaCambio);
  } else {
    form.append('excel', espelhoFile);
  }
  if (reducaoOverrides?.length) {
    form.append('reducaoOverrides', JSON.stringify(reducaoOverrides));
  }

  const { data } = await axios.post(`${BASE}/api/convert`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function debugExcel(excelFile) {
  const form = new FormData();
  form.append('excel', excelFile);
  const { data } = await axios.post(`${BASE}/api/debug-excel`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
