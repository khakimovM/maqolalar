/**
 * Sarlavhadan URL uchun slug yasaydi:
 * "Python Asoslari — 1-dars" → "python-asoslari-1-dars"
 * O'zbekcha apostroflar (o', g') to'g'ri ishlanadi.
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/['ʻʼ’`]/g, '') // o'zbekcha apostroflar olib tashlanadi
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // diakritik belgilar
    .replace(/[^a-z0-9]+/g, '-') // qolgan hamma narsa → "-"
    .replace(/^-+|-+$/g, ''); // chetlardagi "-"

  return slug || 'maqola';
}
