// 圖示、吉祥物糰糰、貼紙與答對插圖（全部是原創 SVG）

const S = '#3D2A1E';
const BLUSH = '#FF9DB0';
const BODY = 'M12 62C12 30 30 12 50 12C70 12 88 30 88 62C88 77 72 82 50 82C28 82 12 77 12 62Z';

const line = (d, w = 3) => `<path d="${d}" fill="none" stroke="${S}" stroke-width="${w}" stroke-linecap="round"/>`;

export const icon = {
  search: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`,
  review: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/></svg>`,
  me: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
  back: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`,
  speaker: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  bulb: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>`,
  calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>`,
  lock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
};

const STAR = 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z';
export function starRow(n, size = 16) {
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}" fill="#F5A623" stroke="#C7811A" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  }
  return out;
}

// 糰糰：plain（一般）、search（拿放大鏡）、sad（答錯安慰）、book（看書）
export function mascot(kind = 'plain', w = 72) {
  const h = Math.round(w * 0.9);
  const shadow = `<ellipse cx="50" cy="85" rx="30" ry="4" fill="${S}" opacity="0.1"/>`;
  let inner;
  if (kind === 'book') {
    inner = `${shadow}<path d="${BODY}" fill="#fff" stroke="${S}" stroke-width="3"/>`
      + `<circle cx="38" cy="44" r="4.2" fill="${S}"/><circle cx="62" cy="44" r="4.2" fill="${S}"/>`
      + `<ellipse cx="28" cy="54" rx="6" ry="3.6" fill="${BLUSH}"/><ellipse cx="72" cy="54" rx="6" ry="3.6" fill="${BLUSH}"/>`
      + line('M45 52Q50 57 55 52')
      + `<path d="M30 62L50 66L70 62V82L50 86L30 82Z" fill="#8CC8F2" stroke="${S}" stroke-width="2.5" stroke-linejoin="round"/><path d="M50 66V86" stroke="${S}" stroke-width="2"/>`;
  } else if (kind === 'sad') {
    inner = `${shadow}<path d="${BODY}" fill="#FFE4EA" stroke="${S}" stroke-width="3"/>`
      + line('M33 50Q38 46 43 50M57 50Q62 46 67 50')
      + `<ellipse cx="29" cy="60" rx="6" ry="3.6" fill="${BLUSH}"/><ellipse cx="71" cy="60" rx="6" ry="3.6" fill="${BLUSH}"/>`
      + line('M45 61Q50 65 55 61')
      + `<path d="M84 22C84 22 78 30 78 34A6 6 0 0 0 90 34C90 30 84 22 84 22Z" fill="#9BD3F5" stroke="${S}" stroke-width="2"/>`;
  } else {
    inner = `${shadow}<path d="${BODY}" fill="#fff" stroke="${S}" stroke-width="3"/>`
      + `<circle cx="38" cy="50" r="4.2" fill="${S}"/><circle cx="62" cy="50" r="4.2" fill="${S}"/>`
      + `<circle cx="39.5" cy="48.5" r="1.3" fill="#fff"/><circle cx="63.5" cy="48.5" r="1.3" fill="#fff"/>`
      + `<ellipse cx="29" cy="60" rx="6" ry="3.6" fill="${BLUSH}"/><ellipse cx="71" cy="60" rx="6" ry="3.6" fill="${BLUSH}"/>`
      + line('M45 58Q50 64 55 58');
    if (kind === 'search') {
      inner += `<circle cx="86" cy="36" r="9" fill="#DDEFFC" stroke="${S}" stroke-width="3"/><path d="M80 43L73 51" stroke="${S}" stroke-width="3.5" stroke-linecap="round"/>`;
    }
  }
  return `<svg class="mascot" width="${w}" height="${h}" viewBox="0 0 100 90" aria-hidden="true">${inner}</svg>`;
}

const STICKER_SVG = {
  snail: `<circle cx="30" cy="30" r="28" fill="#FFF1D6"/><rect x="8" y="42" width="44" height="9" rx="4.5" fill="#F7D9A8" stroke="${S}" stroke-width="2"/><circle cx="28" cy="36" r="11" fill="#F4A261" stroke="${S}" stroke-width="2"/><path d="M19 26C19 17 23 12 28 12C33 12 37 17 37 26C37 29 33 30 28 30C23 30 19 29 19 26Z" fill="#fff" stroke="${S}" stroke-width="2"/><rect x="21" y="19" width="6" height="4" rx="1.5" fill="${S}"/><rect x="29" y="19" width="6" height="4" rx="1.5" fill="${S}"/>`,
  egg: `<circle cx="30" cy="30" r="28" fill="#FFE9F0"/><path d="M12 46C12 30 20 20 30 20C40 20 48 30 48 46C48 51 40 52 30 52C20 52 12 51 12 46Z" fill="#fff" stroke="${S}" stroke-width="2"/><circle cx="24" cy="38" r="2.2" fill="${S}"/><circle cx="36" cy="38" r="2.2" fill="${S}"/><path d="M27 43Q30 46 33 43" fill="none" stroke="${S}" stroke-width="2" stroke-linecap="round"/><path d="M16 20C16 14 22 12 30 12C38 12 46 14 44 20C42 25 36 24 30 25C22 26 16 25 16 20Z" fill="#fff" stroke="${S}" stroke-width="2"/><circle cx="30" cy="18" r="5" fill="#F5B82E"/>`,
  surf: `<circle cx="30" cy="30" r="28" fill="#DDF0FB"/><path d="M6 52Q13 46 20 52T34 52T48 52T60 52" fill="none" stroke="#3B8FD9" stroke-width="2.5" stroke-linecap="round"/><path d="M10 44L48 36L50 43L12 51Z" fill="#E9B872" stroke="${S}" stroke-width="2" stroke-linejoin="round"/><path d="M20 38C20 26 25 18 31 18C37 18 42 26 42 36C42 39 37 40 31 41C25 42 20 41 20 38Z" fill="#fff" stroke="${S}" stroke-width="2"/><circle cx="27" cy="29" r="2" fill="${S}"/><circle cx="36" cy="28" r="2" fill="${S}"/><path d="M29 34Q32 37 35 33" fill="none" stroke="${S}" stroke-width="2" stroke-linecap="round"/>`,
};

export function sticker(id, size = 44, label = '') {
  const inner = STICKER_SVG[id] || STICKER_SVG.snail;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" ${a11y}>${inner}</svg>`;
}

const SNAIL_RIDE = `<ellipse cx="160" cy="202" rx="130" ry="10" fill="#F6E7C8"/><path d="M18 128H58M8 152H52M24 176H60" stroke="#D9C9A0" stroke-width="5" stroke-linecap="round"/><path d="M84 104C70 106 60 100 46 106" fill="none" stroke="#E85D75" stroke-width="7" stroke-linecap="round"/><path d="M70 196C70 182 84 176 100 176H220C238 176 250 160 252 140C253 128 262 122 270 126C280 131 278 150 272 166C264 188 246 198 222 198H78C73 198 70 198 70 196Z" fill="#F7D9A8" stroke="${S}" stroke-width="3" stroke-linejoin="round"/><path d="M262 126L256 100M272 128L280 104" stroke="${S}" stroke-width="3" stroke-linecap="round"/><circle cx="256" cy="98" r="5" fill="${S}"/><circle cx="280" cy="102" r="5" fill="${S}"/><circle cx="262" cy="146" r="3" fill="${S}"/><path d="M258 158Q264 162 270 157" fill="none" stroke="${S}" stroke-width="2.5" stroke-linecap="round"/><circle cx="160" cy="138" r="52" fill="#F4A261" stroke="${S}" stroke-width="3"/><path d="M154 138a6 6 0 1 1 12 0a14 14 0 1 1 -28 0a22 22 0 1 1 44 0a30 30 0 1 1 -60 0" fill="none" stroke="${S}" stroke-width="3" stroke-linecap="round"/><path d="M126 76L110 58M194 76L210 58" stroke="${S}" stroke-width="3" stroke-linecap="round"/><circle cx="108" cy="55" r="6" fill="#fff" stroke="${S}" stroke-width="2.5"/><circle cx="212" cy="55" r="6" fill="#fff" stroke="${S}" stroke-width="2.5"/><path d="M122 94C122 60 138 38 160 38C182 38 198 60 198 94C198 102 184 104 160 104C136 104 122 102 122 94Z" fill="#fff" stroke="${S}" stroke-width="3"/><rect x="137" y="62" width="19" height="13" rx="5" fill="${S}"/><rect x="164" y="62" width="19" height="13" rx="5" fill="${S}"/><path d="M156 67H164" stroke="${S}" stroke-width="3"/><path d="M141 66H147M168 66H174" stroke="#fff" stroke-width="2" stroke-linecap="round"/><ellipse cx="135" cy="84" rx="6" ry="3.5" fill="${BLUSH}"/><ellipse cx="185" cy="84" rx="6" ry="3.5" fill="${BLUSH}"/><path d="M151 83Q160 95 169 83Z" fill="#E85D75" stroke="${S}" stroke-width="2.5" stroke-linejoin="round"/><path d="M232 46l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#F5C542"/>`;

export function illustration(id, caption) {
  if (id === 'snail') {
    return `<svg class="ill" viewBox="0 0 300 216" role="img" aria-label="${caption}">${SNAIL_RIDE}</svg>`;
  }
  return `<svg class="ill ill-sq" viewBox="0 0 60 60" role="img" aria-label="${caption}">${STICKER_SVG[id] || STICKER_SVG.snail}</svg>`;
}

export const confetti = `<svg class="confetti" viewBox="0 0 390 220" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><rect x="30" y="30" width="10" height="16" rx="3" fill="#9BD3F5" transform="rotate(25 35 38)"/><circle cx="78" cy="96" r="6" fill="${BLUSH}"/><rect x="330" y="40" width="10" height="16" rx="3" fill="#F5A623" transform="rotate(-30 335 48)"/><circle cx="352" cy="120" r="7" fill="#9BD3F5"/><rect x="290" y="150" width="9" height="14" rx="3" fill="${BLUSH}" transform="rotate(40 294 157)"/><circle cx="40" cy="170" r="5" fill="#F5A623"/><rect x="110" y="20" width="9" height="14" rx="3" fill="#9BD3F5" transform="rotate(-20 114 27)"/><circle cx="250" cy="22" r="5" fill="#FF9F45"/><path d="M200 60l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#F5C542"/><path d="M60 130l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#F5C542"/></svg>`;
