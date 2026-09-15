/**
 * Muharrirdagi suzuvchi panellarni (rasm qatori paneli, inline rasm paneli)
 * joylashtirish.
 *
 * MUAMMO: panel standart holatda element USTIDA turadi (`top: -42px`). Rasm
 * hujjatning eng boshida bo'lsa yoki sahifa aylantirilib rasm yopishqoq
 * asboblar panelining ostiga tushsa, panel o'sha toolbar bilan to'qnashadi va
 * ko'rinmay qoladi.
 *
 * YECHIM: joy yetmasa panelga `below` klassi qo'yiladi va u elementning PASTIGA
 * o'tadi. Toolbar `.rt-toolbar` klassi bilan belgilangan (sahifada bitta
 * muharrir bo'ladi), shuning uchun uning pastki cheti — "band" chegara.
 */

/** Panel balandligi + bo'shliq. */
const BAR_SPACE = 46;

export function placeFloatingBar(bar: HTMLElement, anchor: HTMLElement) {
  const top = anchor.getBoundingClientRect().top;
  const toolbar = document.querySelector(".rt-toolbar");
  const blockedUntil = toolbar ? toolbar.getBoundingClientRect().bottom : 0;
  bar.classList.toggle("below", top - Math.max(blockedUntil, 0) < BAR_SPACE);
}
