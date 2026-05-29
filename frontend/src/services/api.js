import axios from 'axios';

// Em desenvolvimento usa o proxy do Vite (localhost:3001)
// Em produção (Vercel) usa a URL relativa /api/...
const BASE = import.meta.env.VITE_API_URL || '';

export async function convertFiles(duimpFile, excelFile) {
  const form = new FormData();
  form.append('duimp', duimpFile);
  form.append('excel', excelFile);

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
