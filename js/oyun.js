// ---------------------------------------------------------------------------
// Oyun motoru: kedi, bekçiler, görüş, ses, şüphe, kamera ve çizim.
// Ekranlar ve düğmeler arayuz.js'tedir; motor onlara `olaylar` ile haber verir.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  const { sprite, haritaCizim, ses } = window.KK;
  const T = haritaCizim.T;

  // Geçilmez ve görüşü kesen karolar
  const KATI = new Set(['#', 'T', 'K', '~']);
  const GORUS_KESEN = new Set(['#', 'T', 'K']);
  const SAKLANAK = new Set(['H', 'm']);

  // Hızlar piksel/sn
  const KEDI_HIZ = 72;
  const KEDI_SINSI_HIZ = 34;

  const TIPLER = {
    satici: { hiz: 27, telasli: 46, menzil: 5.5 * T, yariAci: (36 * Math.PI) / 180, donus: 4.5, duyma: 0 },
    kopek: { hiz: 36, telasli: 82, menzil: 3.4 * T, yariAci: (55 * Math.PI) / 180, donus: 7, duyma: 3.3 * T },
  };
  const UYKU_DUYMA = 2.3 * T;
  const BIRIKINTI_SESI = 5.5 * T;
  const SUPHE_ESIGI = 0.3;
  const SUPHE_SONUM = 0.22; // görülmüyorken saniyede azalma

  function aciFarki(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function oyunKur(tuval, olaylar) {
    const ekran = tuval.getContext('2d');
    const tampon = document.createElement('canvas');
    const c = tampon.getContext('2d');

    let olcek = 4; // tampon pikselinin ekran pikseli karşılığı
    let gorW = 320; // tampondaki görünür alan (oyun pikseli)
    let gorH = 180;

    let b = null; // etkin bölüm durumu
    let calisiyor = false;
    let oncekiZaman = 0;
    const girdi = { x: 0, y: 0, sinsi: false };

    // ---- Boyut ---------------------------------------------------------------

    function boyutla() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      // Gizli bir çerçevede açılırsa boyut 0 gelebilir: en az 1 piksel
      const Wd = Math.max(1, Math.round(window.innerWidth * dpr));
      const Hd = Math.max(1, Math.round(window.innerHeight * dpr));
      tuval.width = Wd;
      tuval.height = Hd;
      // Kısa kenarda ~11,5 karo görünsün; tam sayı ölçek pikselleri keskin tutar
      olcek = Math.max(2, Math.floor(Math.min(Wd, Hd) / (11.5 * T)));
      gorW = Math.max(1, Math.ceil(Wd / olcek));
      gorH = Math.max(1, Math.ceil(Hd / olcek));
      tampon.width = gorW;
      tampon.height = gorH;
      vinyetHazirla();
      ekran.imageSmoothingEnabled = false;
      if (b && !calisiyor) ciz(0);
    }
    window.addEventListener('resize', boyutla);

    /** Ekran kenarlarını hafifçe karartan katman (boyut değişince yeniden çizilir). */
    let vinyet = null;
    function vinyetHazirla() {
      vinyet = document.createElement('canvas');
      vinyet.width = gorW;
      vinyet.height = gorH;
      const v = vinyet.getContext('2d');
      const r = Math.hypot(gorW, gorH) / 2;
      const g = v.createRadialGradient(gorW / 2, gorH / 2, r * 0.55, gorW / 2, gorH / 2, r);
      g.addColorStop(0, 'rgba(20, 10, 30, 0)');
      g.addColorStop(1, 'rgba(20, 10, 30, 0.38)');
      v.fillStyle = g;
      v.fillRect(0, 0, gorW, gorH);
    }

    // ---- Harita yardımcıları -------------------------------------------------

    function karo(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= b.W || ty >= b.H) return '#';
      return b.harita[ty][tx];
    }
    function katiMi(tx, ty) {
      const k = karo(tx, ty);
      if (k === 'E') return !b.cikisAcik;
      return KATI.has(k);
    }
    function gorusKeserMi(px, py) {
      return GORUS_KESEN.has(karo(Math.floor(px / T), Math.floor(py / T)));
    }
    function gorusAcik(x0, y0, x1, y1) {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const adim = Math.max(1, Math.ceil(d / 3));
      for (let i = 1; i < adim; i++) {
        const t = i / adim;
        if (gorusKeserMi(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
      }
      return true;
    }

    /** Kutunun (merkez x, ayak y) geçilmez bir karoya değip değmediği. */
    function carpar(x, y, yw, yh) {
      const x0 = Math.floor((x - yw) / T);
      const x1 = Math.floor((x + yw - 0.01) / T);
      const y0 = Math.floor((y - yh) / T);
      const y1 = Math.floor((y - 0.01) / T);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (katiMi(tx, ty)) return true;
      return false;
    }

    /**
     * Karo ızgarasında en kısa yol (8 yön, köşe kesmeden). Karo merkezlerinin
     * piksel listesini döndürür; ulaşılamazsa boş liste.
     */
    function yolBul(sx, sy, hx, hy) {
      const W = b.W;
      const bas = sy * W + sx;
      const hedef = hy * W + hx;
      if (bas === hedef) return [];
      if (katiMi(hx, hy)) return [];
      const onceki = new Int32Array(W * b.H).fill(-1);
      onceki[bas] = bas;
      const kuyruk = [bas];
      const YON = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      let bulundu = false;
      for (let i = 0; i < kuyruk.length && !bulundu; i++) {
        const n = kuyruk[i];
        const x = n % W;
        const y = (n / W) | 0;
        for (const [dx, dy] of YON) {
          const nx = x + dx;
          const ny = y + dy;
          if (katiMi(nx, ny) || karo(nx, ny) === 'E') continue;
          if (dx && dy && (katiMi(x + dx, y) || katiMi(x, y + dy))) continue;
          const m = ny * W + nx;
          if (onceki[m] !== -1) continue;
          onceki[m] = n;
          if (m === hedef) {
            bulundu = true;
            break;
          }
          kuyruk.push(m);
        }
      }
      if (!bulundu) return [];
      const yol = [];
      for (let n = hedef; n !== bas; n = onceki[n]) {
        yol.push([(n % W) * T + T / 2, ((n / W) | 0) * T + T / 2 + 4]);
      }
      return yol.reverse();
    }

    // ---- Bölüm kurulumu --------------------------------------------------------

    function bolumBaslat(veri, sira) {
      const harita = veri.harita.map((s) => s.split(''));
      b = {
        sira,
        veri,
        harita,
        W: harita[0].length,
        H: harita.length,
        statik: null,
        baliklar: [],
        bekciler: [],
        kedi: null,
        cikis: null,
        cikisAcik: false,
        suphe: 0,
        farkEdildi: false,
        sure: 0,
        durum: 'oyna', // oyna | yakalandi | kazandi
        bitisSayac: 0,
        parcaciklar: [],
        sonBirikinti: null,
        cikisUyari: 0,
        zaman: 0,
      };
      for (let ty = 0; ty < b.H; ty++) {
        for (let tx = 0; tx < b.W; tx++) {
          const k = harita[ty][tx];
          const merkez = [tx * T + T / 2, ty * T + T / 2 + 4];
          if (k === 'C') {
            b.kedi = { x: merkez[0], y: merkez[1], yonX: 1, hareket: false, sinsi: false, kare: 0, gizli: false };
            harita[ty][tx] = '.';
          } else if (k === 'F') {
            b.baliklar.push({ x: merkez[0], y: merkez[1] - 2, alindi: false });
            harita[ty][tx] = '.';
          } else if (k === 'E') {
            b.cikis = { tx, ty };
          }
        }
      }
      // Durağan katman: balık ve başlangıç harfleri zemine çevrildikten sonra
      b.statik = haritaCizim.statikKatman(harita.map((s) => s.join('')));

      b.bekciler = veri.bekciler.map((k, i) => {
        const tip = TIPLER[k.tip];
        const [tx, ty] = k.yol[0];
        const bekci = {
          tip: k.tip,
          ozellik: tip,
          x: tx * T + T / 2,
          y: ty * T + T / 2 + 4,
          yol: k.yol,
          dongu: !!k.dongu,
          bekle: k.bekle ?? 1.5,
          bak: k.bak ? k.bak.map((d) => (d * Math.PI) / 180) : null,
          bakSira: 0,
          sira: 0,
          ileri: 1,
          yon: k.bak ? (k.bak[0] * Math.PI) / 180 : 0,
          hedefYon: 0,
          tabanYon: 0,
          durum: k.uyur ? 'uyu' : 'bekle',
          sayac: 0.4 + i * 0.35,
          adimlar: [],
          hedef: null,
          isaret: null,
          isaretSure: 0,
          gordu: false,
          duymaBekleme: 0,
          renk: window.KK.RENK[k.renk] || null,
          kare: 0,
          yuruyor: false,
        };
        bekci.hedefYon = bekci.yon;
        bekci.tabanYon = bekci.yon;
        if (k.yol.length > 1) {
          // İlk durağa doğru bak
          const [nx, ny] = k.yol[1];
          bekci.yon = Math.atan2(ny - ty, nx - tx);
          bekci.hedefYon = bekci.yon;
          bekci.tabanYon = bekci.yon;
        }
        return bekci;
      });

      hudGonder();
      ciz(0);
    }

    // ---- Kedi ------------------------------------------------------------------

    function kediGuncelle(dt) {
      const k = b.kedi;
      let { x: gx, y: gy } = girdi;
      const buyukluk = Math.hypot(gx, gy);
      if (buyukluk > 1) {
        gx /= buyukluk;
        gy /= buyukluk;
      }
      k.hareket = buyukluk > 0.08;
      // Joystick az itilirse ya da Shift basılıysa sinsi yürüyüş
      k.sinsi = girdi.sinsi || (girdi.analog && buyukluk < 0.62);
      const hiz = k.sinsi ? KEDI_SINSI_HIZ : KEDI_HIZ;
      const yarim = 5;
      const boy = 6;
      if (k.hareket) {
        // Yön birim vektöre çevrilir: hız yalnızca yürüyüş biçimine bağlıdır
        const birim = Math.max(Math.hypot(gx, gy), 1e-6);
        const hareketX = (gx / birim) * hiz * dt;
        const hareketY = (gy / birim) * hiz * dt;
        if (!carpar(k.x + hareketX, k.y, yarim, boy)) k.x += hareketX;
        if (!carpar(k.x, k.y + hareketY, yarim, boy)) k.y += hareketY;
        if (Math.abs(gx) > 0.15) k.yonX = gx > 0 ? 1 : -1;
        k.kare += dt * (k.sinsi ? 6 : 11);
      }
      const tx = Math.floor(k.x / T);
      const ty = Math.floor((k.y - 2) / T);
      const altindaki = karo(tx, ty);
      k.gizli = SAKLANAK.has(altindaki) && (k.sinsi || !k.hareket);

      // Balık toplama
      for (const f of b.baliklar) {
        if (!f.alindi && Math.hypot(f.x - k.x, f.y - (k.y - 3)) < 10) {
          f.alindi = true;
          ses.cal('balik');
          parcacik(f.x, f.y, '#fff3a6', 8);
          const kalan = b.baliklar.filter((x) => !x.alindi).length;
          if (kalan === 0) {
            b.cikisAcik = true;
            ses.cal('kapi');
            olaylar.mesaj('Delik açıldı! Kaçış deliğine koş!');
          }
        }
      }

      // Su birikintisi: koşarak yeni bir birikintiye basmak ses çıkarır
      const anahtar = `${tx},${ty}`;
      if (altindaki === 'P' && k.hareket && !k.sinsi) {
        if (b.sonBirikinti !== anahtar) {
          b.sonBirikinti = anahtar;
          ses.cal('sicrama');
          parcacik(k.x, k.y - 2, '#9fc0e0', 7);
          sesCikar(k.x, k.y, BIRIKINTI_SESI);
        }
      } else if (altindaki !== 'P') {
        b.sonBirikinti = null;
      }

      // Kaçış
      if (b.cikis) {
        const cx = b.cikis.tx * T + T / 2;
        const cy = b.cikis.ty * T + T / 2;
        const uzak = Math.hypot(cx - k.x, cy - k.y);
        if (b.cikisAcik && tx === b.cikis.tx && ty === b.cikis.ty) {
          kazan();
        } else if (!b.cikisAcik && uzak < T * 1.4 && b.cikisUyari <= 0) {
          const kalan = b.baliklar.filter((x) => !x.alindi).length;
          olaylar.mesaj(`Önce bütün balıkları topla (${kalan} kaldı)`);
          b.cikisUyari = 3;
        }
      }
    }

    // ---- Bekçiler --------------------------------------------------------------

    function karoyaGit(bekci, tx, ty) {
      bekci.adimlar = yolBul(Math.floor(bekci.x / T), Math.floor((bekci.y - 4) / T), tx, ty);
      bekci.hedefKaro = `${tx},${ty}`;
    }

    function yuru(bekci, hiz, dt) {
      if (!bekci.adimlar.length) return true;
      const [hx, hy] = bekci.adimlar[0];
      const dx = hx - bekci.x;
      const dy = hy - bekci.y;
      const d = Math.hypot(dx, dy);
      const adim = hiz * dt;
      if (d <= adim) {
        bekci.x = hx;
        bekci.y = hy;
        bekci.adimlar.shift();
      } else {
        bekci.x += (dx / d) * adim;
        bekci.y += (dy / d) * adim;
        bekci.hedefYon = Math.atan2(dy, dx);
      }
      bekci.yuruyor = true;
      bekci.kare += dt * (hiz > 40 ? 9 : 5);
      return bekci.adimlar.length === 0;
    }

    function supheli(bekci, x, y, isaret = '?') {
      if (isaret === '?' && bekci.durum !== 'supheli' && bekci.durum !== 'ara') {
        ses.cal(bekci.tip === 'kopek' ? 'havla' : 'supheli');
      }
      bekci.durum = 'supheli';
      bekci.hedef = { x, y };
      const tx = Math.floor(x / T);
      const ty = Math.floor((y - 4) / T);
      if (bekci.hedefKaro !== `${tx},${ty}`) karoyaGit(bekci, tx, ty);
      isaretKoy(bekci, isaret);
      b.farkEdildi = true;
    }

    function isaretKoy(bekci, isaret) {
      bekci.isaret = isaret;
      bekci.isaretSure = isaret === '!' ? 1.6 : 1.3;
    }

    /** Bir ses çıkar: menzildeki bekçiler kaynağa doğru gelir, uyuyan köpek yakındaysa uyanır. */
    function sesCikar(x, y, menzil) {
      for (const bekci of b.bekciler) {
        const d = Math.hypot(bekci.x - x, bekci.y - y);
        if (bekci.durum === 'uyu') {
          if (d < menzil * 0.6) {
            ses.cal('havla');
            supheli(bekci, x, y, '!');
          }
        } else if (d < menzil) {
          supheli(bekci, x, y, '?');
        }
      }
      b.suphe = Math.min(0.95, b.suphe + 0.1);
    }

    function gorebilirMi(bekci) {
      const k = b.kedi;
      if (bekci.durum === 'uyu' || k.gizli) return false;
      const oz = bekci.ozellik;
      const gx = bekci.x;
      const gy = bekci.y - 4;
      const kx = k.x;
      const ky = k.y - 4;
      const d = Math.hypot(kx - gx, ky - gy);
      if (d > oz.menzil) return false;
      if (d > 7 && Math.abs(aciFarki(Math.atan2(ky - gy, kx - gx), bekci.yon)) > oz.yariAci) return false;
      return gorusAcik(gx, gy, kx, ky);
    }

    function bekciGuncelle(bekci, dt) {
      const oz = bekci.ozellik;
      const k = b.kedi;
      bekci.yuruyor = false;
      if (bekci.isaretSure > 0) {
        bekci.isaretSure -= dt;
        if (bekci.isaretSure <= 0) bekci.isaret = null;
      }
      bekci.duymaBekleme -= dt;

      // Köpek: koşan kediyi duyar
      const duyma = bekci.durum === 'uyu' ? UYKU_DUYMA : oz.duyma;
      if (duyma && k.hareket && !k.sinsi && bekci.duymaBekleme <= 0) {
        if (Math.hypot(k.x - bekci.x, k.y - bekci.y) < duyma) {
          bekci.duymaBekleme = 1.2;
          ses.cal('havla');
          b.suphe = Math.min(0.95, b.suphe + 0.3);
          supheli(bekci, k.x, k.y, '!');
          // Havlama yakındaki bekçileri de çağırır
          for (const diger of b.bekciler) {
            if (diger !== bekci && diger.durum !== 'uyu' && Math.hypot(diger.x - bekci.x, diger.y - bekci.y) < 7 * T) {
              supheli(diger, k.x, k.y, '?');
            }
          }
        }
      }

      switch (bekci.durum) {
        case 'uyu':
          break;
        case 'bekle': {
          bekci.sayac -= dt;
          if (bekci.yol.length === 1) {
            // Yerinde duran: sırayla verilen yönlere bakar
            if (bekci.bak) bekci.hedefYon = bekci.bak[bekci.bakSira];
            if (bekci.sayac <= 0) {
              bekci.sayac = bekci.bekle;
              if (bekci.bak) bekci.bakSira = (bekci.bakSira + 1) % bekci.bak.length;
              // Yerinden ayrıldıysa geri dön
              const [tx, ty] = bekci.yol[0];
              if (Math.hypot(bekci.x - (tx * T + T / 2), bekci.y - (ty * T + T / 2 + 4)) > 2) {
                karoyaGit(bekci, tx, ty);
                bekci.durum = 'yuru';
              }
            }
          } else {
            // Durakta sağa sola bakınır
            bekci.hedefYon = bekci.tabanYon + Math.sin(b.zaman * 1.7 + bekci.x) * 0.75;
            if (bekci.sayac <= 0) {
              sonrakiDurak(bekci);
            }
          }
          break;
        }
        case 'yuru':
          if (yuru(bekci, oz.hiz, dt)) {
            bekci.durum = 'bekle';
            bekci.sayac = bekci.bekle;
            bekci.tabanYon = bekci.hedefYon;
          }
          break;
        case 'supheli':
          if (yuru(bekci, oz.telasli, dt)) {
            bekci.durum = 'ara';
            bekci.sayac = 2.6;
            bekci.tabanYon = bekci.yon;
          }
          break;
        case 'ara':
          bekci.sayac -= dt;
          bekci.hedefYon = bekci.tabanYon + Math.sin(b.zaman * 2.4) * 1.3;
          if (bekci.sayac <= 0) {
            const [tx, ty] = bekci.yol[bekci.sira];
            karoyaGit(bekci, tx, ty);
            bekci.durum = 'yuru';
            bekci.hedef = null;
          }
          break;
      }

      // Dönüş
      const fark = aciFarki(bekci.hedefYon, bekci.yon);
      const azami = oz.donus * dt;
      bekci.yon += Math.max(-azami, Math.min(azami, fark));

      // Görüş
      bekci.gordu = gorebilirMi(bekci);
      if (bekci.gordu) {
        if (b.suphe > SUPHE_ESIGI || bekci.durum === 'supheli' || bekci.durum === 'ara') {
          supheli(bekci, k.x, k.y, b.suphe > 0.7 ? '!' : '?');
        }
      }

      // Dokunma: görünür kediye çok yaklaşırsa yakalar
      if (!k.gizli && bekci.durum !== 'uyu' && Math.hypot(k.x - bekci.x, k.y - bekci.y) < 10) {
        b.suphe = 1;
        isaretKoy(bekci, '!');
      }
    }

    function sonrakiDurak(bekci) {
      const n = bekci.yol.length;
      if (bekci.dongu) {
        bekci.sira = (bekci.sira + 1) % n;
      } else {
        if (bekci.sira + bekci.ileri >= n || bekci.sira + bekci.ileri < 0) bekci.ileri *= -1;
        bekci.sira += bekci.ileri;
      }
      const [tx, ty] = bekci.yol[bekci.sira];
      karoyaGit(bekci, tx, ty);
      bekci.durum = 'yuru';
    }

    // ---- Şüphe, kazanma, kaybetme ----------------------------------------------

    function supheGuncelle(dt) {
      const k = b.kedi;
      let artis = 0;
      for (const bekci of b.bekciler) {
        if (!bekci.gordu) continue;
        const d = Math.hypot(k.x - bekci.x, k.y - bekci.y);
        // Uzakta ~1,6 sn, burnunun dibinde ~0,7 sn görülürse dolar
        artis += 0.6 + 1.5 * Math.max(0, 1 - d / bekci.ozellik.menzil);
      }
      if (artis > 0) {
        b.suphe += artis * dt * (k.sinsi ? 0.8 : 1);
      } else {
        b.suphe = Math.max(0, b.suphe - SUPHE_SONUM * dt);
      }
      if (b.suphe >= 1) yakalan();
    }

    function yakalan() {
      if (b.durum !== 'oyna') return;
      b.suphe = 1;
      b.durum = 'yakalandi';
      b.bitisSayac = 1.1;
      for (const bekci of b.bekciler) if (bekci.gordu || Math.hypot(bekci.x - b.kedi.x, bekci.y - b.kedi.y) < 12) isaretKoy(bekci, '!');
      ses.cal('alarm');
      setTimeout(() => ses.cal('yakalandin'), 250);
      hudGonder();
    }

    function kazan() {
      if (b.durum !== 'oyna') return;
      b.durum = 'kazandi';
      b.bitisSayac = 0.9;
      ses.cal('kazandin');
      parcacik(b.kedi.x, b.kedi.y - 6, '#ffd257', 16);
    }

    // ---- Parçacıklar -------------------------------------------------------------

    function parcacik(x, y, renk, adet) {
      for (let i = 0; i < adet; i++) {
        const a = Math.random() * Math.PI * 2;
        const h = 20 + Math.random() * 40;
        b.parcaciklar.push({ x, y, vx: Math.cos(a) * h, vy: Math.sin(a) * h - 20, omur: 0.5 + Math.random() * 0.3, renk });
      }
    }

    function parcacikGuncelle(dt) {
      for (const p of b.parcaciklar) {
        p.omur -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 90 * dt;
      }
      b.parcaciklar = b.parcaciklar.filter((p) => p.omur > 0);
    }

    // ---- Döngü -------------------------------------------------------------------

    let hudZaman = 0;
    function hudGonder() {
      olaylar.hud({
        balik: b.baliklar.filter((f) => f.alindi).length,
        toplam: b.baliklar.length,
        sure: b.sure,
        suphe: b.suphe,
        gizli: b.kedi.gizli,
        sinsi: b.kedi.sinsi,
      });
    }

    function guncelle(dt) {
      b.zaman += dt;
      b.cikisUyari -= dt;
      parcacikGuncelle(dt);
      if (b.durum === 'oyna') {
        b.sure += dt;
        kediGuncelle(dt);
        for (const bekci of b.bekciler) bekciGuncelle(bekci, dt);
        supheGuncelle(dt);
      } else {
        // Bitiş: bekçiler yerinde kalır, işaretler sönmez
        b.bitisSayac -= dt;
        if (b.bitisSayac <= 0 && calisiyor) {
          calisiyor = false;
          if (b.durum === 'yakalandi') olaylar.yakalandi();
          else {
            const par = b.veri.par;
            const yildiz = 1 + (b.sure <= par ? 1 : 0) + (b.farkEdildi ? 0 : 1);
            olaylar.kazandi({ yildiz, sure: b.sure, par, farkEdildi: b.farkEdildi });
          }
        }
      }
      hudZaman -= dt;
      if (hudZaman <= 0) {
        hudZaman = 0.05;
        hudGonder();
      }
    }

    function kareDongusu(simdi) {
      if (!calisiyor) return;
      const dt = Math.min(0.05, (simdi - oncekiZaman) / 1000 || 0);
      oncekiZaman = simdi;
      guncelle(dt);
      ciz(dt);
      if (calisiyor) requestAnimationFrame(kareDongusu);
      else ciz(0);
    }

    // ---- Çizim ---------------------------------------------------------------------

    function kamera() {
      const mW = b.W * T;
      const mH = b.H * T;
      const k = b.kedi;
      let x = mW <= gorW ? (mW - gorW) / 2 : Math.max(0, Math.min(mW - gorW, k.x - gorW / 2));
      let y = mH <= gorH ? (mH - gorH) / 2 : Math.max(0, Math.min(mH - gorH, k.y - 8 - gorH / 2));
      return [Math.round(x), Math.round(y)];
    }

    function koniCiz(bekci, kx, ky) {
      if (bekci.durum === 'uyu') return;
      const oz = bekci.ozellik;
      const gx = bekci.x;
      const gy = bekci.y - 4;
      const ISIN = 30;
      c.beginPath();
      c.moveTo(gx - kx, gy - ky);
      for (let i = 0; i <= ISIN; i++) {
        const a = bekci.yon - oz.yariAci + (2 * oz.yariAci * i) / ISIN;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        let r = 4;
        while (r < oz.menzil && !gorusKeserMi(gx + ca * r, gy + sa * r)) r += 2;
        c.lineTo(Math.round(gx + ca * r - kx), Math.round(gy + sa * r - ky));
      }
      c.closePath();
      let renk = 'rgba(255, 226, 110, 0.2)';
      if (bekci.durum === 'supheli' || bekci.durum === 'ara') renk = 'rgba(255, 150, 50, 0.27)';
      if (bekci.gordu) renk = b.suphe > 0.7 ? 'rgba(255, 60, 60, 0.36)' : 'rgba(255, 120, 40, 0.33)';
      c.fillStyle = renk;
      c.fill();
    }

    const ISARET = {
      '!': ['.kk.', 'kzzk', 'kzzk', 'kzzk', '.kk.', 'kzzk', '.kk.'],
      '?': ['kkkk.', 'kzzzk', '.kkzk', '.kzk.', '.kk..', '.kzk.', '.kk..'],
    };
    function isaretCiz(isaret, x, y, renk) {
      const satirlar = ISARET[isaret];
      for (let sy = 0; sy < satirlar.length; sy++) {
        for (let sx = 0; sx < satirlar[sy].length; sx++) {
          const h = satirlar[sy][sx];
          if (h === '.') continue;
          c.fillStyle = h === 'k' ? '#1b1424' : renk;
          c.fillRect(x + sx, y + sy, 1, 1);
        }
      }
    }

    function ciz(dt) {
      if (!b) return;
      const [kx, ky] = kamera();
      c.fillStyle = '#1b1424';
      c.fillRect(0, 0, gorW, gorH);
      c.drawImage(b.statik.zemin, -kx, -ky);

      // Deniz parıltısı ve kaçış deliği
      const t = b.zaman;
      const tx0 = Math.max(0, Math.floor(kx / T));
      const ty0 = Math.max(0, Math.floor(ky / T));
      const tx1 = Math.min(b.W - 1, Math.floor((kx + gorW) / T));
      const ty1 = Math.min(b.H - 1, Math.floor((ky + gorH) / T));
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          if (b.harita[ty][tx] !== '~') continue;
          for (let i = 0; i < 2; i++) {
            const faz = haritaCizim.karma(tx, ty, i) * 6.28;
            const px = tx * T + ((haritaCizim.karma(tx, ty, i + 4) * 12 + t * 3) % 13) - kx;
            const py = ty * T + 4 + i * 7 - ky;
            if (Math.sin(t * 2 + faz) > 0.1) {
              c.fillStyle = '#5d9bc9';
              c.fillRect(Math.round(px), py, 3, 1);
            }
          }
        }
      }
      if (b.cikis) {
        const px = b.cikis.tx * T - kx;
        const py = b.cikis.ty * T - ky;
        c.fillStyle = '#120c18';
        c.fillRect(px + 3, py + 5, 10, 11);
        c.fillRect(px + 4, py + 4, 8, 1);
        if (b.cikisAcik) {
          const parla = 0.45 + 0.35 * Math.sin(t * 6);
          c.fillStyle = `rgba(255, 210, 87, ${parla})`;
          c.fillRect(px + 3, py + 5, 10, 11);
          c.fillStyle = '#ffd257';
          const ok = Math.round(Math.sin(t * 6) * 1.5);
          c.fillRect(px + 6 + ok, py - 4, 4, 1);
          c.fillRect(px + 7 + ok, py - 5, 2, 3);
        } else {
          // Izgara
          c.fillStyle = '#5a5348';
          for (let x = 4; x < 13; x += 3) c.fillRect(px + x, py + 5, 1, 11);
        }
      }

      // Görüş konileri (kedinin altında kalsın)
      for (const bekci of b.bekciler) koniCiz(bekci, kx, ky);

      // Köpeklerin duyma halkası: kedi yakınken belirir
      for (const bekci of b.bekciler) {
        if (bekci.tip !== 'kopek') continue;
        const r = bekci.durum === 'uyu' ? UYKU_DUYMA : bekci.ozellik.duyma;
        const d = Math.hypot(b.kedi.x - bekci.x, b.kedi.y - bekci.y);
        if (d > r * 1.8) continue;
        c.fillStyle = `rgba(150, 200, 255, ${0.35 * (1 - Math.max(0, d - r) / (r * 0.8))})`;
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * Math.PI * 2 + t * 0.3;
          c.fillRect(Math.round(bekci.x + Math.cos(a) * r - kx), Math.round(bekci.y - 4 + Math.sin(a) * r - ky), 1, 1);
        }
      }

      // Balıklar
      b.baliklar.forEach((f, i) => {
        if (f.alindi) return;
        const zipla = Math.round(Math.sin(t * 3 + i) * 1.5);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(Math.round(f.x - 4 - kx), Math.round(f.y + 4 - ky), 8, 2);
        c.drawImage(sprite.al('BALIK', i % 2 === 1), Math.round(f.x - 5 - kx), Math.round(f.y - 4 + zipla - ky));
      });

      // Karakterler: ayak y'sine göre sıralı
      const kisiler = [{ kedi: true, y: b.kedi.y }, ...b.bekciler.map((x) => ({ bekci: x, y: x.y }))];
      kisiler.sort((a, z) => a.y - z.y);
      for (const kisi of kisiler) {
        if (kisi.kedi) kediCiz(kx, ky);
        else bekciCiz(kisi.bekci, kx, ky);
      }

      // Parçacıklar
      for (const p of b.parcaciklar) {
        c.fillStyle = p.renk;
        c.fillRect(Math.round(p.x - kx), Math.round(p.y - ky), 1, 1);
      }

      // Flamalar karakterlerin üstünden geçer
      c.drawImage(b.statik.ust, -kx, -ky);

      // İşaretler (! ?) en üstte
      for (const bekci of b.bekciler) {
        if (bekci.durum === 'uyu') {
          const z = Math.floor(t * 1.5) % 3;
          c.fillStyle = '#d9e6ff';
          const zx = Math.round(bekci.x + 6 - kx);
          const zy = Math.round(bekci.y - 16 - z * 3 - ky);
          c.fillRect(zx, zy, 3, 1);
          c.fillRect(zx + 1, zy + 1, 1, 1);
          c.fillRect(zx, zy + 2, 3, 1);
          continue;
        }
        if (!bekci.isaret) continue;
        const boy = bekci.tip === 'kopek' ? 12 : 17;
        const renk = bekci.isaret === '!' ? '#ff5a5a' : '#ffd257';
        const sicra = bekci.isaretSure > 1 ? -1 : 0;
        isaretCiz(bekci.isaret, Math.round(bekci.x - 2 - kx), Math.round(bekci.y - boy - 9 + sicra - ky), renk);
      }

      // Sıcak ikindi ışığı ve kenarlarda karartma
      c.fillStyle = 'rgba(255, 170, 90, 0.05)';
      c.fillRect(0, 0, gorW, gorH);
      if (vinyet) c.drawImage(vinyet, 0, 0);

      // Tamponu ekrana büyüt
      ekran.imageSmoothingEnabled = false;
      ekran.drawImage(tampon, 0, 0, gorW * olcek, gorH * olcek);
    }

    function kediCiz(kx, ky) {
      const k = b.kedi;
      let ad = 'KEDI_1';
      if (k.sinsi) ad = 'KEDI_SINSI';
      else if (k.hareket && Math.floor(k.kare) % 2) ad = 'KEDI_2';
      const s = sprite.al(ad, k.yonX < 0);
      const x = Math.round(k.x - 8 - kx);
      const y = Math.round(k.y - 11 - ky);
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(x + 3, y + 10, 11, 2);
      if (k.gizli) {
        c.globalAlpha = 0.45;
        c.drawImage(s, x, y + 2);
        c.globalAlpha = 1;
      } else {
        // Sinsi yürürken hafifçe sallanır
        const sallan = k.sinsi && k.hareket ? Math.round(Math.sin(k.kare * 2) * 0.6) : 0;
        c.drawImage(s, x, y + sallan);
      }
    }

    function bekciCiz(bekci, kx, ky) {
      const sola = Math.cos(bekci.yon) < -0.1;
      if (bekci.tip === 'kopek') {
        let ad = 'KOPEK_1';
        if (bekci.durum === 'uyu') ad = 'KOPEK_UYU';
        else if (bekci.yuruyor && Math.floor(bekci.kare) % 2) ad = 'KOPEK_2';
        const s = sprite.al(ad, sola);
        const x = Math.round(bekci.x - 8 - kx);
        const y = Math.round(bekci.y - 11 - ky);
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fillRect(x + 2, y + 10, 12, 2);
        c.drawImage(s, x, y);
      } else {
        const ad = bekci.yuruyor && Math.floor(bekci.kare) % 2 ? 'SATICI_2' : 'SATICI_1';
        const s = sprite.al(ad, sola, bekci.renk);
        const x = Math.round(bekci.x - 6 - kx);
        const y = Math.round(bekci.y - 16 - ky);
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fillRect(x + 1, y + 15, 10, 2);
        c.drawImage(s, x, y);
      }
    }

    // İlk boyutlandırma: bütün yardımcılar tanımlandıktan sonra
    boyutla();

    // ---- Dışa açılan arayüz -----------------------------------------------------------

    return {
      girdi,
      bolumBaslat(veri, sira) {
        bolumBaslat(veri, sira);
      },
      oynat() {
        if (!b || calisiyor || b.durum !== 'oyna') return;
        calisiyor = true;
        oncekiZaman = performance.now();
        requestAnimationFrame(kareDongusu);
      },
      duraklat() {
        calisiyor = false;
      },
      calisiyorMu: () => calisiyor,
      /** Test ve hata ayıklama için iç durum (oyun mantığı bunu kullanmaz). */
      ic: () => b,
      /** Test: oyunu ekran kareleri beklemeden `dt` saniye ilerletir. */
      testAdim(dt) {
        if (b) guncelle(dt);
      },
      durum: () => (b ? b.durum : null),
      boyutla,
    };
  }

  window.KK = window.KK || {};
  window.KK.oyunKur = oyunKur;
})();
