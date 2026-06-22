import { slugify } from './slugify';

describe('slugify', () => {
  it('lotin matnni slugga aylantiradi', () => {
    expect(slugify('Python Asoslari')).toBe('python-asoslari');
  });

  it("o'zbekcha apostroflarni olib tashlaydi", () => {
    expect(slugify("O'zbek tili")).toBe('ozbek-tili');
  });

  it('maxsus belgilar va probellarni bitta tire bilan almashtiradi', () => {
    expect(slugify('Salom,  Dunyo!!! 123')).toBe('salom-dunyo-123');
  });

  it('chetlardagi tirelarni kesadi', () => {
    expect(slugify('  --Test--  ')).toBe('test');
  });

  it("matn bo'sh qolsa 'maqola' qaytaradi", () => {
    expect(slugify('!!!')).toBe('maqola');
    expect(slugify('')).toBe('maqola');
  });
});
