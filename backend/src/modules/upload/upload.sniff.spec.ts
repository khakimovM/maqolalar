import { sniffImage } from './upload.service';

/**
 * Magic-byte sniffing: client MIME yoki fayl nomiga ishonmaydi, faqat
 * faylning haqiqiy boshlang'ich baytlariga qaraydi. Bu — upload xavfsizligining
 * birinchi qatlami (soxta MIME va polyglot fayllarni rad etadi).
 */

function pad(head: number[]): Buffer {
  return Buffer.concat([Buffer.from(head), Buffer.alloc(16)]);
}

const JPEG = pad([0xff, 0xd8, 0xff]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function webp(): Buffer {
  const b = Buffer.alloc(20);
  b.write('RIFF', 0, 'latin1');
  b.write('WEBP', 8, 'latin1');
  return b;
}

describe('sniffImage — magic-byte', () => {
  it('JPEG aniqlanadi', () => {
    expect(sniffImage(JPEG)).toBe('jpeg');
  });

  it('PNG aniqlanadi', () => {
    expect(sniffImage(PNG)).toBe('png');
  });

  it('WEBP aniqlanadi', () => {
    expect(sniffImage(webp())).toBe('webp');
  });

  it("soxta MIME — skript kontenti (.jpg deb yuborilsa ham) → null", () => {
    const fake = Buffer.from('<script>alert(1)</script>aaa', 'latin1');
    expect(sniffImage(fake)).toBeNull();
  });

  it('tasodifiy baytlar (rasm emas) → null', () => {
    expect(sniffImage(pad([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it("juda qisqa fayl (12 baytdan kam) → null", () => {
    // JPEG magic bo'lsa ham, uzunlik yetarli emas
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
  });
});
