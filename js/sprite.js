// ---------------------------------------------------------------------------
// Pixel sprite'lar: her karakter bir harf, her harf palette bir renk.
// '.' saydamdır. Sprite'lar bir kez tuvale çizilip önbelleğe alınır;
// sola bakan hâlleri yatay aynalanarak üretilir.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  const PALET = {
    k: '#1b1424', // dış çizgi
    o: '#e8873a', // turuncu tüy
    O: '#b4561f', // koyu çizgiler
    y: '#f7dcae', // krem
    p: '#ef8fa6', // pembe burun
    g: '#9be15d', // yeşil göz
    w: '#fff3e3', // beyaz
    s: '#e8b48a', // ten
    S: '#c58a62', // koyu ten
    H: '#4a2c1d', // saç
    M: '#2a1a12', // bıyık
    e: '#1b1424', // göz
    c: '#d9d2c3', // gömlek (satıcıya göre değişir)
    a: '#c8404a', // önlük (satıcıya göre değişir)
    b: '#3b4a6b', // pantolon
    d: '#a86b3c', // köpek
    D: '#6e4224', // köpek koyu
    n: '#2a1a12', // köpek burnu
    f: '#a9cde3', // balık
    F: '#5d87a8', // balık koyu
    z: '#ffd257', // altın
  };

  // Kedi, sağa bakar (16 × 12)
  const KEDI_1 = [
    '................',
    '..k........k.k..',
    '.kok......kokok.',
    '.kok......kooook',
    '.kok.....kogoogk',
    '..kok....kooopok',
    '...kokkkkkoyyyk.',
    '...koooOoOooyyk.',
    '...kooOoOoooook.',
    '...kyykkkkkyykk.',
    '...kk.k...kk.k..',
    '................',
  ];
  const KEDI_2 = KEDI_1.slice(0, 9).concat([
    '...kyykkkkkyykk.',
    '....k.kk...k.kk.',
    '................',
  ]);
  // Sinsice yürürken alçalır (16 × 12)
  const KEDI_SINSI = [
    '................',
    '................',
    '..k.............',
    '.kok.......k.k..',
    '.kok......kokok.',
    '..kok....kooook.',
    '...kokkkkkogoogk',
    '...koooOoOooopok',
    '...kooOoOoooyyk.',
    '...kyykkkkkyykk.',
    '...kk.k...kk.k..',
    '................',
  ];

  // Satıcı (12 × 16)
  const SATICI_1 = [
    '....kkkk....',
    '...kHHHHk...',
    '...kssssk...',
    '..ksesseskk.',
    '...kssssk...',
    '...kMMMMk...',
    '....kSSk....',
    '..kccaacck..',
    '.kccaaaacck.',
    '.kscaaaacsk.',
    '.kskaaaaksk.',
    '...kaaaak...',
    '...kaaaak...',
    '...kbbbbk...',
    '...kbkkbk...',
    '...kk..kk...',
  ];
  const SATICI_2 = SATICI_1.slice(0, 13).concat([
    '...kbbbbk...',
    '...kbkkbk...',
    '....kkkk....',
  ]);

  // Köpek, sağa bakar (16 × 11)
  const KOPEK_1 = [
    '................',
    '...........kk...',
    '..........kDdk..',
    'k.........kdedkk',
    'dk........kdddnk',
    '.dkkkkkkkkkddkk.',
    '..kddddddddddk..',
    '..kdDddddDdddk..',
    '..kddkkkkkkddk..',
    '..kdk.....kdk...',
    '..kk......kk....',
  ];
  const KOPEK_2 = KOPEK_1.slice(0, 9).concat([
    '...kdk....kdk...',
    '...kk......kk...',
  ]);
  // Uyuyan köpek: gözü kapalı, yere yatmış
  const KOPEK_UYU = [
    '................',
    '................',
    '................',
    '................',
    '...........kk...',
    '..........kDdk..',
    'k.kkkkkkkkkdkdkk',
    'dkddddddddddddnk',
    '.kdDddddDddddddk',
    '..kddddddddddkk.',
    '...kkkkkkkkkk...',
  ];

  // Balık (10 × 6)
  const BALIK = [
    '...kkkk...',
    '..kffffk.k',
    '.kfeffffkk',
    '.kfffFffkk',
    '..kFFFFk.k',
    '...kkkk...',
  ];

  // Kara kedi: kedi sprite'ları bu renklerle çizilir (Muhammed: "kedi siyah olsun").
  // Gövde tam siyah değil, koyu mor-gri: kaldırımda seçilsin; turuncu gözler öne çıksın.
  const KEDI_RENK = {
    k: '#09070d', // dış çizgi
    o: '#2a2433', // tüy
    O: '#3d3549', // parlak tüy çizgileri
    y: '#4b4259', // pati ve göğüs
    g: '#ff9a2e', // turuncu göz (Muhammed: "gözleri turuncu olsun")
  };

  const onbellek = new Map();

  function tuvaleCiz(satirlar, palet, ayna) {
    const h = satirlar.length;
    const w = satirlar[0].length;
    const tuval = document.createElement('canvas');
    tuval.width = w;
    tuval.height = h;
    const c = tuval.getContext('2d');
    for (let y = 0; y < h; y++) {
      const satir = satirlar[y];
      for (let x = 0; x < w; x++) {
        const harf = satir[x];
        if (harf === '.') continue;
        c.fillStyle = palet[harf] || PALET[harf] || '#ff00ff';
        c.fillRect(ayna ? w - 1 - x : x, y, 1, 1);
      }
    }
    return tuval;
  }

  /**
   * Önbellekten sprite tuvali döndürür.
   * `ad`: sprite adı, `ayna`: sola bak, `ek`: palet değişiklikleri ({ a: '#..', c: '#..' }).
   */
  function al(ad, ayna = false, ek = null) {
    if (!ek && ad.startsWith('KEDI')) ek = KEDI_RENK;
    const anahtar = `${ad}|${ayna ? 1 : 0}|${ek ? JSON.stringify(ek) : ''}`;
    let t = onbellek.get(anahtar);
    if (!t) {
      t = tuvaleCiz(SPRITE[ad], ek ? Object.assign({}, PALET, ek) : PALET, ayna);
      onbellek.set(anahtar, t);
    }
    return t;
  }

  const SPRITE = {
    KEDI_1, KEDI_2, KEDI_SINSI,
    SATICI_1, SATICI_2,
    KOPEK_1, KOPEK_2, KOPEK_UYU,
    BALIK,
  };

  window.KK = window.KK || {};
  window.KK.sprite = { al, SPRITE, PALET, KEDI_RENK };
})();
