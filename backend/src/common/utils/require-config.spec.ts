import { requireConfig } from './require-config';
import type { ConfigService } from '@nestjs/config';

function cfg(value?: string): ConfigService {
  return { get: () => value } as unknown as ConfigService;
}

describe('requireConfig', () => {
  it('qiymat mavjud bo\'lsa uni qaytaradi', () => {
    expect(requireConfig(cfg('s3cr3t'), 'JWT_ACCESS_SECRET')).toBe('s3cr3t');
  });

  it("qiymat yo'q bo'lsa xato tashlaydi (fail-fast)", () => {
    expect(() => requireConfig(cfg(undefined), 'JWT_ACCESS_SECRET')).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it("bo'sh satrda ham xato tashlaydi", () => {
    expect(() => requireConfig(cfg(''), 'KEY')).toThrow();
  });
});
