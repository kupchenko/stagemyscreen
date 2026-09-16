import { writeFileSync } from "node:fs";
const ink = "#193b36",
  muted = "#7c8d85",
  green = "#285c4f",
  line = "#e4e9e3";
const rect = (x, y, w, h, r, fill, stroke = "none") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const text = (
  x,
  y,
  t,
  size = 24,
  color = ink,
  weight = 400,
  anchor = "start",
) =>
  `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${t}</text>`;
const wrap = (w, h, s) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rect(0, 0, w, h, 0, "#f8faf6")}${s}</svg>`;
const nfc = (x, y, s, color = green) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round">${[16, 28, 40, 52].map((r) => `<path d="M ${r * 0.6} ${-r * 0.8} A ${r} ${r} 0 0 1 ${r * 0.6} ${r * 0.8}"/>`).join("")}</g>`;
let s =
  text(48, 64, "morrow", 32, green, 700) +
  text(668, 62, "09:41", 21, muted, 400, "end");
s +=
  rect(48, 102, 624, 1, 0, line) +
  text(48, 165, "CHECKOUT", 18, muted, 700) +
  text(48, 217, "A little everyday joy.", 33, ink, 700) +
  text(48, 258, "Order #026  ·  Table 08", 23, muted);
s +=
  rect(48, 304, 624, 224, 24, "white", line) +
  text(80, 359, "Total to pay", 24, muted) +
  text(80, 441, "$23.80", 72, ink, 700) +
  text(80, 491, "3 items · Tax included", 21, muted);
s += text(48, 596, "Choose how to pay", 25, ink, 700);
[
  ["01", "Card or contactless", "Tap, insert or swipe", green, "#edf3ed"],
  ["02", "Cash", "Accept a cash payment", ink, "white"],
  ["03", "Other", "Gift cards and more", ink, "white"],
].forEach((v, i) => {
  const y = 630 + i * 129;
  s +=
    rect(48, y, 624, 108, 18, v[4], i === 0 ? "#b8cebc" : line) +
    rect(70, y + 24, 56, 56, 14, i === 0 ? green : "#eff2ec") +
    text(98, y + 60, v[0], 19, i === 0 ? "white" : muted, 700, "middle") +
    text(148, y + 45, v[1], 25, v[3], 700) +
    text(148, y + 77, v[2], 19, muted) +
    text(636, y + 62, "›", 31, muted, 400, "end");
});
s +=
  rect(48, 1090, 624, 82, 18, green) +
  text(360, 1142, "Continue to payment", 25, "white", 700, "middle") +
  text(360, 1226, "Secure checkout", 19, muted, 400, "middle");
writeFileSync("public/screens/smart-terminal.svg", wrap(720, 1280, s));
s =
  text(34, 46, "morrow", 26, green, 700) +
  text(605, 44, "PAYMENT", 15, muted, 700, "end") +
  rect(32, 68, 576, 1, 0, line) +
  text(320, 128, "Total to pay", 23, muted, 400, "middle") +
  text(320, 201, "$23.80", 65, ink, 700, "middle");
s +=
  `<circle cx="320" cy="294" r="58" fill="#e5eee3"/>` +
  nfc(294, 294, 0.72) +
  text(320, 396, "Tap or insert your card", 28, ink, 700, "middle") +
  text(
    320,
    439,
    "Follow the prompts to complete payment",
    18,
    muted,
    400,
    "middle",
  );
writeFileSync("public/screens/card-reader.svg", wrap(640, 480, s));
s =
  rect(0, 0, 92, 800, 0, ink) +
  rect(22, 25, 48, 48, 13, "#d2e3cb") +
  text(46, 58, "m", 33, green, 700, "middle");
["▦", "≡", "↗", "◷"].forEach(
  (v, i) =>
    (s +=
      rect(18, 116 + i * 83, 56, 57, 13, i === 0 ? "#34584f" : ink) +
      text(
        46,
        153 + i * 83,
        v,
        27,
        i === 0 ? "#dfedce" : "#9bb4a5",
        400,
        "middle",
      )),
);
s +=
  text(126, 58, "Good things, made daily.", 27, ink, 700) +
  text(1232, 55, "MORROW CAFÉ", 16, muted, 700, "end") +
  rect(120, 86, 1130, 1, 0, line);
s +=
  rect(936, 112, 314, 651, 20, "white", line) +
  text(962, 155, "Order #026", 25, ink, 700) +
  text(962, 187, "Table 08 · Dine in", 16, muted) +
  rect(960, 212, 266, 1, 0, line);
[
  ["2", "Flat white", "$9.60"],
  ["1", "Almond croissant", "$4.80"],
  ["1", "Garden sandwich", "$9.40"],
].forEach((v, i) => {
  const y = 255 + i * 83;
  s +=
    rect(960, y - 24, 29, 29, 7, "#eef2eb") +
    text(974, y - 4, v[0], 16, green, 700, "middle") +
    text(1002, y - 3, v[1], 16, ink, 700) +
    text(1224, y + 22, v[2], 18, ink, 700, "end");
});
s +=
  rect(960, 536, 266, 1, 0, line) +
  text(960, 580, "Total", 22, ink, 700) +
  text(1224, 580, "$23.80", 30, ink, 700, "end") +
  text(960, 614, "Tax included", 15, muted) +
  rect(958, 656, 268, 73, 14, green) +
  text(1092, 700, "Charge $23.80", 22, "white", 700, "middle");
["All items", "Coffee", "Bakery", "Lunch"].forEach(
  (v, i) =>
    (s +=
      rect(126 + i * 184, 112, 168, 49, 13, i === 0 ? green : "#ebefe6") +
      text(
        210 + i * 184,
        144,
        v,
        17,
        i === 0 ? "white" : green,
        600,
        "middle",
      )),
);
const items = [
  ["Flat white", "$4.80", "#e9dfce"],
  ["Matcha latte", "$5.60", "#d9e2c7"],
  ["Iced coffee", "$4.50", "#dbbd9f"],
  ["Croissant", "$4.80", "#e8cfa7"],
  ["Garden sandwich", "$9.40", "#dae2cf"],
  ["Morning bowl", "$8.20", "#e7d8cf"],
];
items.forEach(([name, price, color], i) => {
  const x = 126 + (i % 3) * 262,
    y = 184 + Math.floor(i / 3) * 281;
  s +=
    rect(x, y, 245, 260, 17, "white", line) +
    rect(x + 12, y + 12, 221, 164, 12, color);
  if (i < 3) {
    s +=
      `<ellipse cx="${x + 122}" cy="${y + 139}" rx="49" ry="10" fill="#00000012"/><path d="M ${x + 83} ${y + 56}h76l-8  70" fill="none"/>` +
      rect(x + 87, y + 56, 70, 76, 13, "#faf9f2") +
      `<ellipse cx="${x + 122}" cy="${y + 57}" rx="35" ry="10" fill="${i === 1 ? "#799254" : "#8d654b"}"/><path d="M ${x + 158} ${y + 74}c38-10 35 45-3 38" fill="none" stroke="#faf9f2" stroke-width="10"/>`;
  } else {
    s += `<ellipse cx="${x + 122}" cy="${y + 101}" rx="74" ry="45" fill="#f8f7f1"/><ellipse cx="${x + 122}" cy="${y + 98}" rx="53" ry="27" fill="${i === 3 ? "#bd8b49" : i === 4 ? "#829868" : "#a4775c"}"/>`;
    for (let j = 0; j < 4; j++)
      s += `<path d="M ${x + 90 + j * 20} ${y + 79}l10  30" stroke="#ebd7b7" stroke-width="4"/>`;
  }
  s +=
    text(x + 18, y + 210, name, 19, ink, 700) +
    text(x + 18, y + 240, price, 17, muted) +
    rect(x + 195, y + 204, 32, 32, 10, "#edf3e9") +
    text(x + 211, y + 227, "+", 25, green, 400, "middle");
});
writeFileSync("public/screens/countertop-pos.svg", wrap(1280, 800, s));
