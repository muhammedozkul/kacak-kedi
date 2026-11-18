// ---------------------------------------------------------------------------
// Harita çizimi: karolar piksel piksel kodla çizilir (görsel dosya yok).
//
//   statikKatman(harita) → { zemin, ust }
//     zemin : zemin, binalar, tezgâhlar, nesneler ve gölgeler (karakterlerin altı)
//     ust   : pazarın üstüne gerili flamalar (karakterlerin üstü)
//
// Deniz parıltısı, kaçış deliği ve balıklar her karede oyun.js'te çizilir.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  const T = 16; // karo boyu (piksel)
  const KATI_GOLGE = new Set(['#', 'T', 'K', 'E']);

  /** Karo koordinatından tekrarlanabilir sözde rastgele sayı (0–1). */
  function karma(x, y, tohum = 0) {
    let h = (x * 374761393 + y * 668265263 + tohum * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  let c = null; // etkin çizim bağlamı
  const kutu = (renk, x, y, w, h) => {
    c.fillStyle = renk;
    c.fillRect(x, y, w, h);
  };
  const nokta = (renk, x, y) => kutu(renk, x, y, 1, 1);

  // ---- Zeminler ------------------------------------------------------------

  function kaldirim(px, py, tx, ty) {
    kutu('#6c6458', px, py, T, T);
    const tonlar = ['#8d8474', '#958b7a', '#857c6d', '#9a907e', '#8a8070'];
    for (let sy = 0; sy < 2; sy++) {
      const kay = (ty * 2 + sy) % 2 ? 4 : 0;
      for (let sx = -1; sx < 2; sx++) {
        const x0 = px + sx * 8 + kay;
        const y0 = py + sy * 8;
        const ton = tonlar[Math.floor(karma(tx * 3 + sx, ty * 2 + sy) * tonlar.length)];
        const x1 = Math.max(x0 + 1, px);
        const x2 = Math.min(x0 + 7, px + T);
        if (x2 <= x1) continue;
        kutu(ton, x1, y0 + 1, x2 - x1, 6);
        kutu('#776f62', x1, y0 + 6, x2 - x1, 1);
        if (x0 + 1 >= px) nokta('#a8a08c', x0 + 1, y0 + 1);
        if (x0 + 2 >= px && x0 + 2 < px + T) nokta('#a19885', x0 + 2, y0 + 1);
      }
    }
    // Ayrıntılar: taş arası ot, yaprak, çatlak, şişe kapağı
    const r = karma(tx, ty, 41);
    if (r < 0.12) {
      kutu('#5f8f45', px + 7, py + 7, 2, 1);
      nokta('#78ad55', px + 8, py + 6);
    } else if (r < 0.19) {
      const x = px + 3 + Math.floor(karma(tx, ty, 42) * 9);
      const y = py + 3 + Math.floor(karma(tx, ty, 43) * 9);
      kutu('#c9832f', x, y, 2, 1);
      nokta('#e0a64a', x + 1, y - 1);
    } else if (r < 0.24) {
      kutu('#5d554a', px + 4, py + 9, 3, 1);
      nokta('#5d554a', px + 7, py + 10);
      nokta('#5d554a', px + 8, py + 11);
    } else if (r < 0.26) {
      kutu('#d9d4c6', px + 10, py + 4, 2, 2);
      nokta('#c8404a', px + 10, py + 4);
    }
  }

  function cimen(px, py, tx, ty) {
    kutu(karma(tx >> 1, ty >> 1, 3) > 0.5 ? '#528f3e' : '#4d883a', px, py, T, T);
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(karma(tx, ty, i) * 15);
      const y = Math.floor(karma(ty, tx, i + 9) * 14);
      kutu(i % 3 ? '#66a64f' : '#3c6f30', px + x, py + y, 1, 2);
    }
    if (karma(tx, ty, 77) > 0.7) {
      const x = 3 + Math.floor(karma(tx, ty, 5) * 9);
      const y = 3 + Math.floor(karma(tx, ty, 6) * 9);
      const renk = ['#f2e36b', '#f3a3c0', '#ffffff', '#b9a6f2'][Math.floor(karma(tx, ty, 8) * 4)];
      kutu(renk, px + x, py + y, 2, 2);
      nokta('#f2c14b', px + x, py + y);
    }
  }

  // ---- Binalar -------------------------------------------------------------

  const CATI = [
    ['#a3503a', '#843d2b', '#c06b50'],
    ['#94593a', '#74442b', '#b07452'],
    ['#9c4844', '#7b3532', '#ba6660'],
  ];
  const CEPHE = ['#e8d5b0', '#f0c9b5', '#c9d9e0', '#e6cf93', '#d9cbe6', '#cfe0c2'];

  function binaRengi(tx, ty) {
    return Math.floor(karma(Math.floor(tx / 4), Math.floor(ty / 3), 3) * 1000);
  }

  function bina(px, py, tx, ty, harita) {
    const no = binaRengi(tx, ty);
    const ton = CATI[no % CATI.length];
    kutu(ton[0], px, py, T, T);
    for (let y = 0; y < T; y += 4) {
      kutu(ton[1], px, py + y + 3, T, 1);
      const kay = ((ty * 4 + y / 4) % 2) * 2;
      for (let x = kay; x < T; x += 4) kutu(ton[1], px + x, py + y, 1, 3);
      for (let x = kay + 1; x < T; x += 4) nokta(ton[2], px + x, py + y);
    }
    const H = harita.length;
    const W = harita[0].length;
    const k = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : harita[y][x]);
    const alt = k(tx, ty + 1);
    const ust = k(tx, ty - 1);
    const cepheVar = alt !== '#' && alt !== 'E';
    if (ust !== '#') kutu(ton[2], px, py, T, 1);

    if (cepheVar) {
      cephe(px, py, tx, ty, no);
    } else if (k(tx - 1, ty) === '#' && k(tx + 1, ty) === '#' && ust === '#') {
      catiSusu(px, py, tx, ty);
    }
  }

  function cephe(px, py, tx, ty, no) {
    const duvar = CEPHE[no % CEPHE.length];
    kutu(duvar, px, py + 8, T, 8);
    kutu('rgba(0,0,0,0.12)', px, py + 8, T, 1); // saçak gölgesi
    kutu('#8c7a5c', px, py + 7, T, 1); // saçak
    kutu('rgba(0,0,0,0.18)', px, py + 15, T, 1);
    const r = karma(tx, ty, 11);
    if (r < 0.32) {
      // Pencere, panjur ve çiçek saksısı
      kutu('#2f4058', px + 5, py + 9, 6, 4);
      nokta('#7fa0c4', px + 6, py + 9);
      nokta('#7fa0c4', px + 6, py + 10);
      kutu('#5f8f5e', px + 3, py + 9, 2, 4);
      kutu('#5f8f5e', px + 11, py + 9, 2, 4);
      kutu('#8a4a2a', px + 4, py + 13, 8, 2);
      nokta('#e64a5c', px + 5, py + 12);
      nokta('#f2e36b', px + 7, py + 12);
      nokta('#e64a5c', px + 9, py + 12);
      nokta('#4f8a3c', px + 6, py + 12);
      nokta('#4f8a3c', px + 10, py + 12);
    } else if (r < 0.5) {
      // Tenteli dükkân kapısı
      const tente = ['#c8404a', '#3f6fb5', '#3f8f5a', '#d9a42b'][Math.floor(karma(tx, ty, 12) * 4)];
      for (let x = 0; x < 14; x++) nokta(Math.floor(x / 2) % 2 ? '#f2ece0' : tente, px + 1 + x, py + 8);
      for (let x = 0; x < 14; x++) nokta(Math.floor(x / 2) % 2 ? '#f2ece0' : tente, px + 1 + x, py + 9);
      for (let x = 1; x < 14; x += 2) nokta(Math.floor(x / 2) % 2 ? '#f2ece0' : tente, px + 1 + x, py + 10);
      kutu('#4a2e1c', px + 5, py + 11, 6, 5);
      kutu('#6b4428', px + 6, py + 11, 4, 5);
      nokta('#e0b84a', px + 9, py + 13);
    } else if (r < 0.66) {
      // Vitrin: raflarda renkli mallar
      kutu('#3a3226', px + 2, py + 9, 12, 6);
      kutu('#7fa0c4', px + 3, py + 10, 10, 4);
      kutu('#5e6f88', px + 3, py + 12, 10, 1);
      for (let i = 0; i < 4; i++) {
        nokta(['#e8873a', '#e64a3c', '#f2d14b', '#7cc24f'][(i + tx) % 4], px + 4 + i * 2, py + 11);
        nokta(['#b85cc2', '#f2ece0', '#e8873a', '#a9cde3'][(i + ty) % 4], px + 4 + i * 2, py + 13);
      }
    } else if (r < 0.76) {
      // Tabela
      const tabela = ['#2c3e66', '#7a2e2e', '#2e5a3a'][Math.floor(karma(tx, ty, 13) * 3)];
      kutu(tabela, px + 1, py + 9, 14, 4);
      kutu('#f2d14b', px + 3, py + 10, 2, 2);
      kutu('#f2ece0', px + 6, py + 10, 7, 1);
      kutu('#f2ece0', px + 6, py + 11, 5, 1);
      kutu('#2f4058', px + 4, py + 13, 3, 2);
      kutu('#2f4058', px + 9, py + 13, 3, 2);
    } else if (r < 0.84) {
      // Klima ve kablo
      kutu('#2f4058', px + 2, py + 10, 5, 4);
      kutu('#e6e6e0', px + 9, py + 10, 5, 3);
      kutu('#b9b9b0', px + 10, py + 11, 3, 1);
      nokta('#55555a', px + 13, py + 13);
      nokta('#55555a', px + 13, py + 14);
    }
  }

  function catiSusu(px, py, tx, ty) {
    const r = karma(tx, ty, 61);
    if (r < 0.1) {
      // Güneş enerjisi paneli ve su deposu
      kutu('#1f2f4f', px + 1, py + 3, 9, 7);
      kutu('#3d5a8f', px + 2, py + 4, 7, 5);
      kutu('#1f2f4f', px + 5, py + 4, 1, 5);
      nokta('#9ab6e0', px + 2, py + 4);
      kutu('#3a3a3a', px + 10, py + 5, 5, 6);
      kutu('#ececec', px + 10, py + 4, 5, 5);
      kutu('#c8c8c8', px + 10, py + 8, 5, 1);
    } else if (r < 0.18) {
      // Baca
      kutu('#5a3a2a', px + 6, py + 4, 5, 8);
      kutu('#7a5240', px + 6, py + 4, 5, 2);
      kutu('#2a1a12', px + 7, py + 4, 3, 1);
    } else if (r < 0.24) {
      // Çanak anten
      kutu('#55555a', px + 8, py + 9, 1, 4);
      kutu('#d8d8d0', px + 5, py + 5, 7, 5);
      kutu('#b8b8b0', px + 6, py + 6, 5, 3);
      nokta('#55555a', px + 8, py + 7);
    }
  }

  // ---- Tezgâhlar -------------------------------------------------------------

  const TEZGAH_TURU = {
    balik: { tente: ['#3f6fb5', '#f2ece0'] },
    meyve: { tente: ['#c8404a', '#f2ece0'] },
    baharat: { tente: ['#d9a42b', '#7a3e2a'] },
    sebze: { tente: ['#3f8f5a', '#f2ece0'] },
  };
  const TURLER = Object.keys(TEZGAH_TURU);

  /** Bitişik tezgâh karolarını bloklara ayırır: her karo için { x0, y0, x1, y1, tur }. */
  function tezgahBloklari(harita) {
    const H = harita.length;
    const W = harita[0].length;
    const blok = new Map();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (harita[y][x] !== 'T' || blok.has(`${x},${y}`)) continue;
        const kume = [];
        const yigin = [[x, y]];
        blok.set(`${x},${y}`, null);
        while (yigin.length) {
          const [cx, cy] = yigin.pop();
          kume.push([cx, cy]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            if (harita[ny][nx] !== 'T' || blok.has(`${nx},${ny}`)) continue;
            blok.set(`${nx},${ny}`, null);
            yigin.push([nx, ny]);
          }
        }
        const xs = kume.map((k) => k[0]);
        const ys = kume.map((k) => k[1]);
        const b = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
        b.tur = TURLER[Math.floor(karma(b.x0, b.y0, 21) * TURLER.length)];
        for (const [kx, ky] of kume) blok.set(`${kx},${ky}`, b);
      }
    }
    return blok;
  }

  function tente(px, py, tx, b, yukseklik) {
    const renk = TEZGAH_TURU[b.tur].tente;
    for (let x = 0; x < T; x++) {
      const serit = Math.floor((tx * T + x) / 4) % 2;
      kutu(renk[serit], px + x, py, 1, yukseklik);
    }
    // Üstte koyu kıvrım, altta gölge: kumaş hissi
    kutu('rgba(0,0,0,0.22)', px, py, T, 1);
    kutu('rgba(255,255,255,0.18)', px, py + 1, T, 1);
    kutu('rgba(0,0,0,0.12)', px, py + yukseklik - 2, T, 2);
    // Dalgalı kenar: her şeridin altında yarım daire
    for (let x = 0; x < T; x += 4) {
      const serit = Math.floor((tx * T + x) / 4) % 2;
      kutu(renk[serit], px + x + 1, py + yukseklik, 2, 1);
      kutu('rgba(0,0,0,0.25)', px + x + 1, py + yukseklik + 1, 2, 1);
    }
  }

  function tezgahMallari(px, py, tx, ty, tur, h) {
    // h: mal sergisi için kalan yükseklik (piksel)
    if (tur === 'balik') {
      kutu('#d7ecf6', px, py, T, h);
      for (let i = 0; i < 6; i++) nokta('#ffffff', px + Math.floor(karma(tx, ty, i) * 16), py + Math.floor(karma(ty, tx, i) * h));
      for (let s = 0; s + 4 <= h; s += 4) {
        for (let i = 0; i < 2; i++) {
          const x = px + 1 + i * 8 + (s % 8 ? 3 : 0);
          if (x + 6 > px + T) continue;
          const renk = karma(tx + i, ty + s, 50) > 0.5 ? '#a9b8c6' : '#d98d6a';
          kutu('#33404e', x, py + s + 1, 6, 3);
          kutu(renk, x + 1, py + s + 1, 4, 2);
          nokta('#ffffff', x + 1, py + s + 1);
          nokta('#33404e', x + 5, py + s + 2);
          nokta(renk, x + 6, py + s + 1);
          nokta(renk, x + 6, py + s + 3);
        }
      }
    } else if (tur === 'meyve' || tur === 'sebze') {
      const renkler =
        tur === 'meyve'
          ? [['#f08a24', '#ffc070'], ['#d83a3a', '#ff8a7a'], ['#b6cf3a', '#e2f08a']]
          : [['#d8392b', '#ff8a6a'], ['#3f9a3a', '#8fd06a'], ['#6a2f7a', '#a86ac0']];
      kutu('#6b4428', px, py, T, h);
      // Kasalar halinde yığınlar
      const bolme = Math.floor(karma(tx, ty, 51) * renkler.length);
      for (let k = 0; k < 2; k++) {
        const [koyu, acik] = renkler[(bolme + k) % renkler.length];
        const x0 = px + k * 8;
        kutu('#8f5f30', x0, py, 8, h);
        kutu('#5c3620', x0 + 7, py, 1, h);
        for (let y = 1; y + 3 <= h; y += 3) {
          for (let x = 1 + ((y / 3) % 2); x + 3 <= 8; x += 3) {
            kutu(koyu, x0 + x, py + y, 3, 3);
            nokta(acik, x0 + x, py + y);
            if (tur === 'sebze' && koyu === '#3f9a3a') nokta('#2a5a20', x0 + x + 2, py + y);
          }
        }
      }
    } else {
      // Baharat: renkli tepeler, küçük tahta kepçe
      kutu('#6b4428', px, py, T, h);
      const renkler = ['#c8321e', '#e8b21a', '#8a4a1e', '#5f8f2e', '#e86a1e', '#b8a88a'];
      const bas = Math.floor(karma(tx, ty, 52) * renkler.length);
      for (let k = 0; k < 3; k++) {
        const renk = renkler[(bas + k) % renkler.length];
        const x0 = px + 1 + k * 5;
        const tab = Math.min(h - 1, 6);
        for (let y = 0; y < tab; y++) {
          const w = Math.max(1, Math.round(((y + 1) / tab) * 4));
          kutu(renk, x0 + 2 - Math.floor(w / 2), py + h - tab + y - 1, w, 1);
        }
        nokta('rgba(255,255,255,0.4)', x0 + 2, py + h - tab - 1);
        kutu('#3a2416', x0, py + h - 1, 5, 1);
      }
    }
  }

  function tezgahOn(px, py, tx, b, h) {
    // Ahşap ön yüz: dikey tahtalar, kenarlarda direk
    kutu('#7a4a2a', px, py, T, h);
    for (let x = 3; x < T; x += 4) kutu('#6a3e22', px + x, py, 1, h);
    kutu('#946038', px, py, T, 1);
    kutu('#4e2e18', px, py + h - 1, T, 1);
    if (tx === b.x0) kutu('#4e2e18', px, py, 2, h);
    if (tx === b.x1) kutu('#4e2e18', px + T - 2, py, 2, h);
  }

  function tezgah(px, py, tx, ty, b) {
    const yuk = b.y1 - b.y0 + 1;
    const r = ty - b.y0;
    if (yuk === 1) {
      tente(px, py, tx, b, 6);
      tezgahMallari(px, py + 8, tx, ty, b.tur, 4);
      tezgahOn(px, py + 12, tx, b, 4);
    } else if (r === 0) {
      tente(px, py, tx, b, 10);
      tezgahMallari(px, py + 12, tx, ty, b.tur, 4);
    } else if (ty === b.y1) {
      tezgahMallari(px, py, tx, ty, b.tur, 8);
      tezgahOn(px, py + 8, tx, b, 8);
    } else {
      tezgahMallari(px, py, tx, ty, b.tur, T);
    }
    // Fiyat tahtası: bloğun en alt satırının ikinci karosunda
    if (ty === b.y1 && tx === b.x0 + 1 && b.x1 > b.x0) {
      kutu('#1e2a22', px + 4, py + 9, 8, 5);
      kutu('#c9b48a', px + 4, py + 9, 8, 1);
      kutu('#f2ece0', px + 5, py + 11, 3, 1);
      kutu('#f2ece0', px + 9, py + 11, 2, 1);
      kutu('#f2d14b', px + 5, py + 12, 2, 1);
    }
  }

  // ---- Diğer nesneler ----------------------------------------------------------

  function kasa(px, py, tx, ty) {
    kutu('#3d2615', px + 1, py + 2, 14, 14);
    kutu('#b07a43', px + 2, py + 3, 12, 12);
    kutu('#8f5f30', px + 2, py + 7, 12, 1);
    kutu('#8f5f30', px + 2, py + 11, 12, 1);
    kutu('#c99256', px + 2, py + 3, 12, 1);
    kutu('#6b4322', px + 2, py + 14, 12, 1);
    kutu('#8f5f30', px + 7, py + 3, 1, 12);
    // Üstünde mal: portakal, lahana ya da buzlu balık kasası
    const r = karma(tx, ty, 71);
    if (r < 0.3) {
      for (let i = 0; i < 3; i++) {
        kutu('#f08a24', px + 3 + i * 4, py + 3, 3, 3);
        nokta('#ffc070', px + 3 + i * 4, py + 3);
      }
    } else if (r < 0.5) {
      kutu('#5fa04a', px + 4, py + 3, 4, 3);
      kutu('#8fd06a', px + 9, py + 3, 4, 3);
      nokta('#c8f0a0', px + 5, py + 3);
    } else if (r < 0.65) {
      kutu('#d7ecf6', px + 3, py + 3, 10, 3);
      kutu('#a9b8c6', px + 4, py + 4, 4, 1);
      kutu('#a9b8c6', px + 8, py + 3, 4, 1);
    }
  }

  function cuval(px, py, tx, ty) {
    const torba = (x, y, acik) => {
      kutu('#5e4a2c', x, y + 1, 8, 7);
      kutu('#c4a46b', x + 1, y + 1, 6, 6);
      kutu('#a98a52', x + 1, y + 5, 6, 1);
      kutu('#d9bd85', x + 2, y + 2, 2, 1);
      if (acik) {
        kutu(acik, x + 2, y + 1, 4, 2);
        nokta('rgba(255,255,255,0.35)', x + 2, y + 1);
      } else {
        kutu('#5e4a2c', x + 3, y, 2, 1);
      }
    };
    const icerik = ['#e8d27a', '#7a4a2a', '#c8321e', '#f2ece0'][Math.floor(karma(tx, ty, 81) * 4)];
    torba(px + 1, py + 7, null);
    torba(px + 8, py + 8, icerik);
    torba(px + 4, py + 2, null);
  }

  function masa(px, py, tx, ty) {
    // Yuvarlak tahta masa, iki yanında tabure; üstünde tabaklı çay bardakları ve simit
    kutu('rgba(20,10,30,0.25)', px + 3, py + 13, 11, 2);
    const tabure = (x) => {
      kutu('#3a2416', x, py + 9, 4, 4);
      kutu('#c8392b', x, py + 9, 4, 2);
      nokta('#e8685a', x + 1, py + 9);
      kutu('#3a2416', x + 1, py + 13, 2, 1);
    };
    tabure(px);
    tabure(px + 12);
    kutu('#4a3020', px + 7, py + 10, 2, 4); // ayak
    const genislik = [6, 10, 12, 12, 12, 10, 6];
    genislik.forEach((w, i) => {
      const x = px + 8 - w / 2;
      kutu(i === 0 || i === genislik.length - 1 ? '#5c3620' : '#a8743f', x, py + 2 + i, w, 1);
      if (i > 0 && i < genislik.length - 1) {
        nokta('#5c3620', x, py + 2 + i);
        nokta('#5c3620', x + w - 1, py + 2 + i);
      }
    });
    kutu('#c08a52', px + 4, py + 3, 6, 1); // parıltı
    const bardak = (x, y) => {
      kutu('#f2ece0', x - 1, y + 3, 4, 1); // tabak
      kutu('#9a2a18', x, y, 2, 3);
      nokta('#ffd8b0', x, y);
      nokta('#f2ece0', x + 1, y - 1); // kaşık
    };
    bardak(px + 5, py + 3);
    bardak(px + 10, py + 4);
    if (karma(tx, ty, 91) > 0.45) {
      // Simit
      kutu('#c8823a', px + 6, py + 6, 4, 2);
      nokta('#a8743f', px + 7, py + 6);
      nokta('#f2e6c0', px + 8, py + 6);
    }
  }

  function birikinti(px, py, tx, ty) {
    kutu('#45576f', px + 2, py + 5, 12, 6);
    kutu('#45576f', px + 4, py + 4, 8, 8);
    kutu('#5d7591', px + 3, py + 6, 10, 4);
    kutu('#8aa3c2', px + 4, py + 5, 4, 1);
    nokta('#c8d8ea', px + 5, py + 5);
    kutu('#7a93b2', px + 9, py + 8, 3, 1);
  }

  function deniz(px, py, tx, ty, harita) {
    const derin = ty + 1 >= harita.length || harita[ty + 1][tx] === '~';
    kutu(derin ? '#2a6596' : '#2f6f9e', px, py, T, T);
    kutu('#33769f', px, py + 8, T, 1);
    const ust = ty > 0 ? harita[ty - 1][tx] : '~';
    if (ust !== '~') {
      // Rıhtım kenarı: taş bloklar, yosun, baba (halat bağlama direği)
      kutu('#5a5348', px, py, T, 4);
      kutu('#7b7366', px, py, T, 1);
      kutu('#4a443b', px + 7, py + 1, 1, 3);
      kutu('#2e5a3a', px, py + 4, T, 1);
      kutu('#1f4f74', px, py + 5, T, 1);
      if (karma(tx, ty, 101) < 0.35) {
        kutu('#2a2a30', px + 6, py - 3, 4, 4);
        kutu('#4a4a52', px + 6, py - 3, 4, 1);
      }
    }
  }

  /** Rıhtıma yakın deniz karolarına bağlı kayıklar (yalnız süs; deniz yine geçilmez). */
  function kayiklar(harita) {
    const H = harita.length;
    const W = harita[0].length;
    for (let ty = 1; ty < H; ty++) {
      for (let tx = 0; tx < W - 1; tx++) {
        if (harita[ty][tx] !== '~' || harita[ty][tx + 1] !== '~') continue;
        if (harita[ty - 1][tx] === '~' || harita[ty - 1][tx + 1] === '~') continue;
        if (karma(tx, ty, 111) > 0.22) continue;
        const px = tx * T + 3;
        const py = ty * T + 6;
        const renk = ['#c8404a', '#3f6fb5', '#3f8f5a', '#e6dccb'][Math.floor(karma(tx, ty, 112) * 4)];
        kutu('rgba(0,0,0,0.25)', px + 1, py + 8, 24, 2);
        kutu('#2a1a12', px, py + 1, 26, 7);
        kutu(renk, px + 1, py + 2, 24, 3);
        kutu('#f2ece0', px + 2, py + 5, 22, 2);
        kutu('#8a5a34', px + 3, py + 2, 20, 2);
        kutu('#6b4428', px + 8, py + 2, 1, 2);
        kutu('#6b4428', px + 16, py + 2, 1, 2);
        // Halat
        nokta('#d9c8a0', px + 12, py);
        nokta('#d9c8a0', px + 12, py - 2);
        nokta('#d9c8a0', px + 12, py - 4);
      }
    }
  }

  function zemin(px, py, tx, ty, harita) {
    const altindaki = harita[ty][tx];
    if (altindaki === 'm' || altindaki === ',') {
      cimen(px, py, tx, ty);
      return;
    }
    const komsu = [
      harita[ty][tx - 1], harita[ty][tx + 1],
      ty > 0 ? harita[ty - 1][tx] : '', ty + 1 < harita.length ? harita[ty + 1][tx] : '',
    ];
    if (altindaki !== '.' && komsu.filter((k) => k === ',' || k === 'm').length >= 2) {
      cimen(px, py, tx, ty);
    } else {
      kaldirim(px, py, tx, ty);
    }
  }

  /** Bina, tezgâh ve kasaların altlarındaki ve sağlarındaki zemine düşen gölge. */
  function golgeler(harita) {
    const H = harita.length;
    const W = harita[0].length;
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const k = harita[ty][tx];
        if (KATI_GOLGE.has(k) || k === '~') continue;
        const px = tx * T;
        const py = ty * T;
        if (ty > 0 && KATI_GOLGE.has(harita[ty - 1][tx])) {
          kutu('rgba(20,10,30,0.28)', px, py, T, 3);
          kutu('rgba(20,10,30,0.14)', px, py + 3, T, 2);
        }
        if (tx > 0 && KATI_GOLGE.has(harita[ty][tx - 1])) {
          kutu('rgba(20,10,30,0.2)', px, py, 3, T);
        }
      }
    }
  }

  /**
   * Flamalar: pazarın üstüne, iki bina arasına gerili renkli bayrakçıklar.
   * Beş satırda bir; yalnız iki ucu binaya değen ve altında tezgâh, kasa ya da
   * deniz olmayan açık geçitlerin üstünde (kalabalık görünmesin diye).
   */
  function flamalar(harita, tuval) {
    const H = harita.length;
    const W = harita[0].length;
    const renkler = ['#e64a3c', '#f2d14b', '#3f6fb5', '#3f8f5a', '#f2ece0', '#e8873a'];
    for (let ty = 4; ty < H - 2; ty += 5) {
      let tx = 0;
      while (tx < W) {
        if (harita[ty][tx] !== '#') {
          tx++;
          continue;
        }
        // Bina karosundan sonraki açıklığı bul
        let son = tx + 1;
        while (son < W && harita[ty][son] !== '#' && harita[ty][son] !== 'E') son++;
        const uzunluk = son - tx - 1;
        const aralik = harita[ty].slice(tx + 1, son);
        const acikGecit = !/[~TK]/.test(typeof aralik === 'string' ? aralik : aralik.join(''));
        if (uzunluk >= 4 && son < W && acikGecit) {
          const x0 = tx * T + T;
          const x1 = son * T;
          const y = ty * T + 2;
          const sarkma = Math.min(10, uzunluk * 1.2);
          let i = 0;
          for (let x = x0; x < x1; x++) {
            const t = (x - x0) / (x1 - x0);
            const yy = Math.round(y + Math.sin(t * Math.PI) * sarkma);
            nokta('rgba(40,30,40,0.75)', x, yy);
            if ((x - x0) % 6 === 2 && x + 4 < x1) {
              const renk = renkler[i++ % renkler.length];
              kutu(renk, x, yy + 1, 4, 2);
              kutu(renk, x + 1, yy + 3, 2, 1);
              nokta('rgba(0,0,0,0.2)', x + 3, yy + 2);
            }
          }
        }
        tx = son;
      }
    }
    return tuval;
  }

  /** Bölümün durağan katmanlarını çizer. */
  function statikKatman(harita) {
    const H = harita.length;
    const W = harita[0].length;
    const zeminTuval = document.createElement('canvas');
    zeminTuval.width = W * T;
    zeminTuval.height = H * T;
    c = zeminTuval.getContext('2d');
    const bloklar = tezgahBloklari(harita);

    // 1) Zemin ve düz nesneler
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const px = tx * T;
        const py = ty * T;
        const k = harita[ty][tx];
        if (k === '#' || k === 'E') continue;
        if (k === '~') deniz(px, py, tx, ty, harita);
        else if (k === 'm') cimen(px, py, tx, ty);
        else zemin(px, py, tx, ty, harita);
      }
    }
    // 2) Gölgeler (nesnelerin altına)
    golgeler(harita);
    // 3) Nesneler ve binalar
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const px = tx * T;
        const py = ty * T;
        switch (harita[ty][tx]) {
          case '#':
          case 'E':
            bina(px, py, tx, ty, harita);
            break;
          case 'T':
            tezgah(px, py, tx, ty, bloklar.get(`${tx},${ty}`));
            break;
          case 'K':
            kasa(px, py, tx, ty);
            break;
          case 'H':
            cuval(px, py, tx, ty);
            break;
          case 'm':
            masa(px, py, tx, ty);
            break;
          case 'P':
            birikinti(px, py, tx, ty);
            break;
        }
      }
    }
    kayiklar(harita);

    const ustTuval = document.createElement('canvas');
    ustTuval.width = W * T;
    ustTuval.height = H * T;
    c = ustTuval.getContext('2d');
    flamalar(harita, ustTuval);
    c = null;
    return { zemin: zeminTuval, ust: ustTuval };
  }

  window.KK = window.KK || {};
  window.KK.haritaCizim = { statikKatman, karma, T };
})();
