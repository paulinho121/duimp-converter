const {
  formatValorUnitario,
  formatAliquota,
  formatQuantidade,
  formatPeso,
  format15,
} = require('../services/calcTributos');

// formatValorUnitario: USD × 10^7 (taxa 5.014 para os testes)
describe('formatValorUnitario', () => {
  const taxa = 5.014;
  test('R$ 875,01 a 5.014 → USD 174,52 × 10^7', () => {
    // 875.01 / 5.014 × 10^7 = 1745250.7... ≈ 1745251 → padded 20
    const expected = String(Math.round((875.01 / taxa) * 10_000_000)).padStart(20, '0');
    expect(formatValorUnitario(875.01, taxa)).toBe(expected);
  });
  test('R$ 27.601,65 a 5.014 → USD 5.503,89 × 10^7', () => {
    const expected = String(Math.round((27601.65 / taxa) * 10_000_000)).padStart(20, '0');
    expect(formatValorUnitario(27601.65, taxa)).toBe(expected);
  });
});

describe('formatAliquota', () => {
  test('10,8% → 01080',  () => expect(formatAliquota(0.108)).toBe('01080'));
  test('16,2% → 01620',  () => expect(formatAliquota(0.162)).toBe('01620'));
  test('9,75% → 00975',  () => expect(formatAliquota(0.0975)).toBe('00975'));
  test('0,21% → 00021',  () => expect(formatAliquota(0.0021)).toBe('00021'));
  test('2,10% → 00210',  () => expect(formatAliquota(0.021)).toBe('00210'));
  test('0,965% → 00096', () => expect(formatAliquota(0.00965)).toBe('00096')); // ERP usa floor
  test('9,65% → 00965',  () => expect(formatAliquota(0.0965)).toBe('00965'));
});

// formatQuantidade: qty × 10^5 (ERP divide por 10^5)
describe('formatQuantidade', () => {
  test('8 unidades → 00000000800000',  () => expect(formatQuantidade(8)).toBe('00000000800000'));
  test('70 unidades → 00000007000000', () => expect(formatQuantidade(70)).toBe('00000007000000'));
  test('10 unidades → 00000001000000', () => expect(formatQuantidade(10)).toBe('00000001000000'));
});

describe('formatPeso', () => {
  test('962,4 kg → 000000000962400', () => expect(formatPeso(962.4)).toBe('000000000962400'));
});

describe('format15', () => {
  test('R$ 1000,00 → 000000000100000', () => expect(format15(1000)).toBe('000000000100000'));
});
