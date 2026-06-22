import { extractTiptapText } from './tiptap-text';

describe('extractTiptapText', () => {
  it('ichma-ich tugunlardan matnni ajratadi', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Salom' },
            { type: 'text', text: 'dunyo' },
          ],
        },
      ],
    };
    expect(extractTiptapText(doc)).toBe('Salom dunyo');
  });

  it("bo'sh yoki yaroqsiz kirishda bo'sh satr qaytaradi", () => {
    expect(extractTiptapText(null)).toBe('');
    expect(extractTiptapText(undefined)).toBe('');
    expect(extractTiptapText('matn')).toBe('');
    expect(extractTiptapText({})).toBe('');
  });

  it('ortiqcha probellarni normallashtiradi', () => {
    const doc = { content: [{ text: "  ko'p   probel  " }] };
    expect(extractTiptapText(doc)).toBe("ko'p probel");
  });
});
