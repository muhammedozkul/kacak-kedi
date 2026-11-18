// ---------------------------------------------------------------------------
// Sesler: Web Audio ile üretilen küçük 8-bit efektler (dosya yok).
// Tarayıcılar sesi ilk kullanıcı etkileşimine kadar kapalı tutar; ac() bunu açar.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  const KAYIT = 'kacak-kedi.ses';
  let ctx = null;
  let ana = null;
  let acik = true;
  try {
    acik = localStorage.getItem(KAYIT) !== '0';
  } catch (e) {
    /* depolama kapalı olabilir */
  }

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      ana = ctx.createGain();
      ana.gain.value = 0.32;
      ana.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function ton(frekans, sure, { tip = 'square', ses = 0.5, kayma = 0, gecikme = 0 } = {}) {
    if (!acik || !ctx) return;
    const t = ctx.currentTime + gecikme;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tip;
    o.frequency.setValueAtTime(frekans, t);
    if (kayma) o.frequency.exponentialRampToValueAtTime(Math.max(30, frekans + kayma), t + sure);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ses, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    o.connect(g).connect(ana);
    o.start(t);
    o.stop(t + sure + 0.02);
  }

  function gurultu(sure, { ses = 0.4, frekans = 1200, q = 1, gecikme = 0 } = {}) {
    if (!acik || !ctx) return;
    const t = ctx.currentTime + gecikme;
    const uzunluk = Math.floor(ctx.sampleRate * sure);
    const tampon = ctx.createBuffer(1, uzunluk, ctx.sampleRate);
    const veri = tampon.getChannelData(0);
    for (let i = 0; i < uzunluk; i++) veri[i] = Math.random() * 2 - 1;
    const kaynak = ctx.createBufferSource();
    kaynak.buffer = tampon;
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.frequency.value = frekans;
    filtre.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(ses, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    kaynak.connect(filtre).connect(g).connect(ana);
    kaynak.start(t);
  }

  const efekt = {
    balik() {
      ton(880, 0.08, { ses: 0.35 });
      ton(1320, 0.12, { ses: 0.35, gecikme: 0.07 });
    },
    supheli() {
      ton(520, 0.12, { tip: 'triangle', ses: 0.5, kayma: 260 });
    },
    alarm() {
      ton(740, 0.09, { ses: 0.4 });
      ton(740, 0.09, { ses: 0.4, gecikme: 0.12 });
    },
    havla() {
      gurultu(0.12, { ses: 0.6, frekans: 600, q: 2 });
      ton(260, 0.1, { tip: 'sawtooth', ses: 0.3, kayma: -120 });
      gurultu(0.1, { ses: 0.5, frekans: 650, q: 2, gecikme: 0.18 });
      ton(280, 0.09, { tip: 'sawtooth', ses: 0.3, kayma: -120, gecikme: 0.18 });
    },
    sicrama() {
      gurultu(0.22, { ses: 0.5, frekans: 1800, q: 0.8 });
    },
    yakalandin() {
      [523, 415, 330, 262].forEach((f, i) => ton(f, 0.16, { ses: 0.4, gecikme: i * 0.14 }));
    },
    kazandin() {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
        ton(f, 0.14, { ses: 0.35, gecikme: i * 0.1 })
      );
    },
    kapi() {
      ton(392, 0.1, { tip: 'triangle', ses: 0.4 });
      ton(587, 0.18, { tip: 'triangle', ses: 0.4, gecikme: 0.09 });
    },
    tik() {
      ton(660, 0.04, { ses: 0.2 });
    },
    miyav() {
      ton(700, 0.32, { tip: 'triangle', ses: 0.35, kayma: 380 });
    },
  };

  window.KK = window.KK || {};
  window.KK.ses = {
    ac,
    cal(ad) {
      if (efekt[ad]) efekt[ad]();
    },
    acikMi: () => acik,
    degistir() {
      acik = !acik;
      try {
        localStorage.setItem(KAYIT, acik ? '1' : '0');
      } catch (e) {
        /* yok say */
      }
      return acik;
    },
  };
})();
