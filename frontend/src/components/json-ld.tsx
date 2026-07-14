/**
 * JSON-LD strukturali ma'lumotni <script> sifatida chiqaradi (server component).
 * `<` belgisi < ga aylantiriladi — skriptdan chiqib ketish (XSS) oldini oladi.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
