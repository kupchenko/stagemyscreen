import { writeFileSync } from "node:fs";
const text = (x, y, t, s = 16, c = "#718174", weight = 400) =>
  `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${s}" font-weight="${weight}" fill="${c}">${t}</text>`;
const rect = (x, y, w, h, r, fill, stroke = "none") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
function desktop(analytics = false) {
  const w = 1600,
    h = 1000;
  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    rect(0, 0, w, h, 0, "#f7f9f4") +
    rect(0, 0, 255, h, 0, "#eef2e8");
  s +=
    rect(30, 34, 33, 33, 9, "#366c49") +
    text(40, 57, "m", 23, "white", 700) +
    text(76, 60, "morrow", 29, "#294a35", 700) +
    text(31, 132, "WORKSPACE", 11, "#929e87", 600);
  [
    "Overview",
    "Analytics",
    "Transactions",
    "Customers",
    "Products",
    "Reports",
  ].forEach((n, i) => {
    if (i === (analytics ? 1 : 0))
      s += rect(20, 155 + i * 60, 215, 45, 7, "#dfe9d4");
    s +=
      rect(
        37,
        169 + i * 60,
        14,
        14,
        3,
        i === (analytics ? 1 : 0) ? "#77945e" : "#b4c1a6",
      ) +
      text(
        66,
        182 + i * 60,
        n,
        16,
        i === (analytics ? 1 : 0) ? "#3a5930" : "#8a967c",
        i === (analytics ? 1 : 0) ? 600 : 400,
      );
  });
  s +=
    text(33, 684, "YOUR TEAM", 11, "#95a18a", 600) +
    text(38, 733, "↗  Invite a teammate", 15, "#7e8d71") +
    rect(25, 856, 204, 105, 9, "#e2ead8") +
    text(42, 890, "A little more possibility.", 14, "#6e845d", 600) +
    text(42, 916, "Explore your workspace", 12, "#91a17f") +
    text(43, 943, "View all tools  →", 12, "#587943", 600);
  s +=
    text(
      301,
      56,
      "Workspace   /   " + (analytics ? "Analytics" : "Overview"),
      13,
      "#8b987f",
    ) +
    rect(1320, 27, 170, 40, 6, "white", "#e2e8da") +
    text(1338, 52, "Search anything…", 13, "#9aa78e") +
    rect(1513, 30, 34, 34, 17, "#d6e7c6") +
    text(1523, 53, "JD", 13, "#637a50", 600);
  s += '<path d="M255 90 H1600" stroke="#e5ebdd"/>';
  s +=
    text(
      302,
      161,
      analytics ? "A clearer picture." : "Good morning, Jamie",
      34,
      "#304333",
      600,
    ) +
    text(
      303,
      197,
      analytics
        ? "Every number tells a story. Here’s yours."
        : "Here’s how your business is doing today.",
      15,
      "#96a18c",
    ) +
    rect(1345, 129, 204, 46, 7, "#416a37") +
    text(1369, 159, "+  Create report", 15, "white", 500);
  const metrics = analytics
    ? [
        ["Total revenue", "$128,430", "↗ 18.4%"],
        ["Conversion rate", "4.86%", "↗ 3.2%"],
        ["Active customers", "2,840", "↗ 12.8%"],
      ]
    : [
        ["Total revenue", "$48,295.00", "↗ 12.8%"],
        ["Orders this month", "1,284", "↗ 8.2%"],
        ["Average order value", "$37.61", "↗ 4.6%"],
      ];
  metrics.forEach(([label, value, growth], i) => {
    const x = 302 + i * 420;
    s +=
      rect(x, 242, 397, 164, 11, i === 0 ? "#e5efdc" : "#ffffff", "#e3e9db") +
      text(x + 24, 277, label, 14, "#8a9b7b") +
      text(x + 24, 326, value, 34, "#3e5337", 600) +
      rect(x + 24, 347, 86, 27, 5, "#dbeccf") +
      text(x + 34, 366, growth, 12, "#6a8d51") +
      text(x + 119, 366, "vs. last month", 12, "#a0ac93");
  });
  s +=
    rect(302, 432, 810, 324, 10, "white", "#e3e9db") +
    text(327, 470, "Revenue overview", 18, "#546d44", 600) +
    text(950, 469, "This month  ⌄", 12, "#9caa8d");
  for (let i = 0; i < 4; i++)
    s +=
      `<path d="M350 ${514 + i * 56} H1086" stroke="#eff2e9"/>` +
      text(325, 518 + i * 56, String(30 - i * 10) + "k", 9, "#bdc6b1");
  s += `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#cedfc0" stop-opacity=".9"/><stop offset="1" stop-color="#e7efdf" stop-opacity=".1"/></linearGradient></defs><path d="M353 652 C388 648 400 620 442 630 S493 580 535 592 S572 633 615 590 S665 578 707 545 S750 580 798 542 S852 557 889 516 S936 545 981 517 S1038 527 1087 487 L1087 698 L353 698 Z" fill="url(#area)"/><path d="M353 652 C388 648 400 620 442 630 S493 580 535 592 S572 633 615 590 S665 578 707 545 S750 580 798 542 S852 557 889 516 S936 545 981 517 S1038 527 1087 487" fill="none" stroke="#86a769" stroke-width="3"/>`;
  ["Sep 1", "Sep 5", "Sep 10", "Sep 15", "Sep 20", "Sep 25", "Sep 30"].forEach(
    (n, i) => (s += text(349 + i * 119, 731, n, 11, "#a8b39a")),
  );
  s +=
    rect(1136, 432, 404, 324, 10, "white", "#e3e9db") +
    text(1161, 470, "Top channels", 18, "#546d44", 600);
  ["Direct", "Organic search", "Social media", "Referral"].forEach((n, i) => {
    s +=
      text(1164, 518 + i * 58, n, 13, "#91a07f") +
      text(1456, 518 + i * 58, [42, 28, 18, 12][i] + "%", 12, "#81966d") +
      rect(1164, 531 + i * 58, 342, 6, 3, "#edf2e7") +
      rect(
        1164,
        531 + i * 58,
        [267, 196, 138, 80][i],
        6,
        3,
        ["#9fba86", "#b6ca9f", "#ccdabd", "#dce6d1"][i],
      );
  });
  s +=
    rect(302, 784, 1238, 190, 10, "white", "#e3e9db") +
    text(327, 826, "Recent activity", 18, "#546d44", 600) +
    text(1432, 826, "View all →", 12, "#94a382");
  ["CUSTOMER", "ORDER", "DATE", "AMOUNT", "STATUS"].forEach(
    (n, i) =>
      (s += text(327 + [0, 340, 595, 830, 1050][i], 870, n, 10, "#a5b395")),
  );
  s +=
    text(327, 916, "Alex Johnson", 15, "#81946f") +
    text(667, 916, "#MR–1284", 14, "#9aa78d") +
    text(922, 916, "September 16, 2026", 12, "#9aa78d") +
    text(1157, 916, "$129.00", 15, "#81946f") +
    rect(1378, 893, 113, 31, 15, "#edf5e6") +
    text(1401, 914, "Completed", 11, "#8aa571");
  return s + "</svg>";
}
function mobile() {
  let s =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1290" viewBox="0 0 600 1290">' +
    rect(0, 0, 600, 1290, 0, "#f8faf5");
  s +=
    text(39, 41, "9:41", 15, "#374d31", 600) +
    text(493, 41, "▰ ▰", 16, "#374d31");
  s +=
    rect(34, 92, 35, 35, 9, "#46733a") +
    text(45, 117, "m", 22, "white", 700) +
    text(83, 119, "morrow", 27, "#39542f", 700) +
    rect(516, 93, 43, 43, 22, "#e1ecd7") +
    text(527, 120, "JD", 15, "#7b9667", 600) +
    text(35, 206, "Good morning, Jamie", 29, "#425e36", 600) +
    text(36, 241, "Big things start with a little overview.", 16, "#9ca990");
  s +=
    rect(32, 285, 536, 230, 18, "#e1edcf") +
    text(59, 332, "TOTAL REVENUE", 12, "#8da076", 600) +
    text(57, 398, "$48,295", 60, "#48683a", 600) +
    rect(59, 433, 105, 33, 8, "#cedfba") +
    text(73, 455, "↗ 12.8%", 15, "#709153", 600) +
    text(181, 456, "vs. last month", 15, "#8ca675");
  s +=
    text(38, 572, "Revenue overview", 22, "#617a50", 600) +
    text(458, 572, "Month ⌄", 14, "#9dae8b");
  for (let i = 0; i < 4; i++)
    s += `<path d="M38 ${617 + i * 55}H561" stroke="#e8edde"/>`;
  s +=
    '<defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#c1d5a7" stop-opacity=".8"/><stop offset="1" stop-color="#eaf2e0" stop-opacity="0"/></linearGradient></defs><path d="M38 768 C82 782 92 735 141 747 S192 685 231 709 S286 651 327 678 S372 632 414 650 S490 590 559 604 V804 H38Z" fill="url(#g)"/><path d="M38 768 C82 782 92 735 141 747 S192 685 231 709 S286 651 327 678 S372 632 414 650 S490 590 559 604" fill="none" stroke="#8eaf6f" stroke-width="4"/>';
  ["1 Sep", "7 Sep", "14 Sep", "21 Sep", "30 Sep"].forEach(
    (n, i) => (s += text(37 + i * 119, 827, n, 11, "#b1bda3")),
  );
  s +=
    text(38, 901, "At a glance", 22, "#617a50", 600) +
    rect(33, 928, 253, 145, 12, "white", "#e3ead9") +
    rect(304, 928, 262, 145, 12, "white", "#e3ead9") +
    text(55, 967, "TOTAL ORDERS", 11, "#a8b497", 600) +
    text(54, 1013, "1,284", 32, "#6a8556", 600) +
    text(56, 1048, "↗ 8.2% this month", 12, "#98b180") +
    text(328, 967, "AVG. ORDER VALUE", 11, "#a8b497", 600) +
    text(326, 1013, "$37.61", 32, "#6a8556", 600) +
    text(328, 1048, "↗ 4.6% this month", 12, "#98b180");
  s +=
    rect(0, 1148, 600, 142, 0, "#f0f5e8") +
    '<path d="M0 1148H600" stroke="#e1e8d6"/>';
  ["Overview", "Activity", "Reports", "Settings"].forEach((n, i) => {
    s +=
      rect(62 + i * 148, 1175, 20, 20, 5, i === 0 ? "#9fbb83" : "#cad5bd") +
      text(
        41 + i * 143,
        1226,
        n,
        13,
        i === 0 ? "#809969" : "#b2bea4",
        i === 0 ? 600 : 400,
      );
  });
  s += rect(210, 1267, 180, 5, 3, "#6d7b61");
  return s + "</svg>";
}
writeFileSync(
  "public/screens/dashboard.svg",
  desktop().replace(
    'width="1600" height="1000"',
    'width="4480" height="2520" preserveAspectRatio="none"',
  ),
);
writeFileSync(
  "public/screens/analytics.svg",
  desktop(true).replace(
    'width="1600" height="1000"',
    'width="2752" height="2064" preserveAspectRatio="none"',
  ),
);
writeFileSync(
  "public/screens/mobile.svg",
  mobile().replace(
    'width="600" height="1290"',
    'width="1206" height="2622" preserveAspectRatio="none"',
  ),
);

writeFileSync(
  "public/screens/laptop.svg",
  desktop().replace(
    'width="1600" height="1000"',
    'width="3456" height="2234" preserveAspectRatio="none"',
  ),
);
