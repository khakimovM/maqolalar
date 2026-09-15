/**
 * Bir martalik migratsiya: maqola kontentidagi ESKI (blok) rasmlarni
 * paragraf ichiga o'raydi.
 *
 * NEGA: muharrirda rasm endi INLINE node — paragraf ichida yashaydi
 * (yonma-yon rasmlar va matn ichida ko'chirish uchun). Eski maqolalarda rasm
 * hujjat darajasida (paragrafsiz) saqlangan; ProseMirror bunday kontentni
 * ochganda sxemaga to'g'ri kelmagan node'ni tashlab yuborishi mumkin.
 *
 * Rasmning eski `align` qiymati paragrafning `textAlign` iga ko'chiriladi.
 *
 * ISHLATISH (serverda):
 *   # 1) AVVAL BACKUP oling (Telegram botda /backup → "Yangi backup yaratish")
 *   # 2) skriptni konteynerga nusxalang
 *   docker compose -f docker-compose.prod.yml cp \
 *     backend/scripts/migrate-inline-images.js backend:/app/migrate-inline-images.js
 *   # 3) avval QURUQ ishga tushiring (hech narsa yozilmaydi)
 *   docker compose -f docker-compose.prod.yml exec backend node /app/migrate-inline-images.js
 *   # 4) ro'yxat to'g'ri bo'lsa — haqiqiy yangilash
 *   docker compose -f docker-compose.prod.yml exec backend node /app/migrate-inline-images.js --apply
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

/** Ichida inline kontent turadigan node'lar. */
const TEXT_BLOCKS = ['paragraph', 'heading'];

/** Yolg'iz rasmni paragrafga o'raydi, `align` ni paragraf `textAlign` iga ko'chiradi. */
function wrapImage(node) {
  const align = String((node.attrs && node.attrs.align) || 'center');
  const textAlign =
    align === 'left' || align === 'center' || align === 'right' ? align : null;
  return { type: 'paragraph', attrs: { textAlign }, content: [node] };
}

/**
 * Daraxt bo'ylab yurib, matn blokidan TASHQARIDA turgan rasmlarni paragrafga
 * o'raydi: hujjat darajasi, sitata (blockquote), ro'yxat elementi va h.k.
 * Nechta rasm ko'chirilganini ham qaytaradi.
 */
function normalizeNode(node, stats) {
  if (!node || typeof node !== 'object' || !Array.isArray(node.content)) {
    return node;
  }
  const isTextBlock = TEXT_BLOCKS.includes(node.type);
  const content = node.content.map((child) => {
    const normalized = normalizeNode(child, stats);
    if (!isTextBlock && normalized && normalized.type === 'image') {
      stats.count += 1;
      return wrapImage(normalized);
    }
    return normalized;
  });
  return Object.assign({}, node, { content: content });
}

/** Maqola kontentini moslaydi. */
function convert(doc) {
  if (!doc || typeof doc !== 'object' || doc.type !== 'doc' || !Array.isArray(doc.content)) {
    return { changed: false, count: 0, doc: doc };
  }
  const stats = { count: 0 };
  const next = normalizeNode(doc, stats);
  return { changed: stats.count > 0, count: stats.count, doc: next };
}

async function main() {
  console.log(
    APPLY
      ? '⚠️  HAQIQIY REJIM — maqolalar yangilanadi\n'
      : 'ℹ️  QURUQ REJIM — hech narsa yozilmaydi (yozish uchun: --apply)\n',
  );

  const articles = await prisma.article.findMany({
    select: { id: true, title: true, content: true },
  });

  let touched = 0;
  let images = 0;

  for (const article of articles) {
    const result = convert(article.content);
    if (!result.changed) continue;

    touched += 1;
    images += result.count;
    console.log(`  • ${article.title} — ${result.count} ta rasm`);

    if (APPLY) {
      await prisma.article.update({
        where: { id: article.id },
        data: { content: result.doc },
      });
    }
  }

  console.log(
    `\nJami: ${articles.length} maqola tekshirildi, ${touched} tasida ${images} ta rasm ` +
      (APPLY ? 'ko\'chirildi ✅' : 'ko\'chiriladi'),
  );
  if (!APPLY && touched > 0) {
    console.log('Yozish uchun: node /app/migrate-inline-images.js --apply');
  }
}

main()
  .catch((e) => {
    console.error('Xato:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
