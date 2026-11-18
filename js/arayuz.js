// ---------------------------------------------------------------------------
// Arayüz: ekranlar (başlık, bölümler, giriş, duraklat, sonuç), HUD, ilerleme
// kaydı ve klavye kısayolları. Oyun motorunu ve girdiyi birbirine bağlar.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  const { BOLUMLER, ses, sprite } = window.KK;
  const $ = (id) => document.getElementById(id);

  // ---- İlerleme (bölüm başına en iyi yıldız) ----------------------------------
  const KAYIT = 'kacak-kedi.ilerleme';
  let ilerleme = [];
  try {
    const ham = JSON.parse(localStorage.getItem(KAYIT) || '[]');
    if (Array.isArray(ham)) ilerleme = ham.map((n) => Number(n) || 0);
  } catch (e) {
    ilerleme = [];
  }
  function ilerlemeKaydet() {
    try {
      localStorage.setItem(KAYIT, JSON.stringify(ilerleme));
    } catch (e) {
      /* gizli pencerede kaydedilemeyebilir */
    }
  }
  const acikMi = (i) => i === 0 || (ilerleme[i - 1] || 0) > 0;

  // ---- Ekranlar ---------------------------------------------------------------
  const EKRANLAR = ['baslik', 'nasil', 'bolumler', 'giris', 'duraklat', 'yakalandi', 'kazandi'];
  let etkin = 'baslik';
  let sira = 0; // oynanan bölüm

  function goster(ad) {
    etkin = ad;
    for (const e of EKRANLAR) $(`ekran-${e}`).hidden = e !== ad;
    const oyunda = ['oyna', 'giris', 'duraklat', 'yakalandi', 'kazandi'].includes(ad);
    $('hud').hidden = !oyunda;
    document.body.classList.toggle('oyunda', ad === 'oyna');
    // Görünen ekrandaki ilk düğmeye odaklan (klavyeyle oynayana kolaylık)
    if (ad !== 'oyna') {
      const ilk = document.querySelector(`#ekran-${ad} .dugme.birincil, #ekran-${ad} .dugme`);
      if (ilk) ilk.focus({ preventScroll: true });
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  // ---- Oyun motoru ------------------------------------------------------------
  let mesajZamanlayici = 0;
  const hudEl = {
    balik: $('hud-balik'),
    sure: $('hud-sure'),
    suphe: $('suphe-dolu'),
    durum: $('hud-durum'),
  };
  let sonHud = '';

  function sureYaz(sn) {
    const d = Math.floor(sn / 60);
    const s = Math.floor(sn % 60);
    return `${d}:${String(s).padStart(2, '0')}`;
  }

  const oyun = window.KK.oyunKur($('oyun'), {
    hud(v) {
      const durum = v.gizli ? 'SAKLANDIN' : v.sinsi ? 'SESSİZ' : '';
      const anahtar = `${v.balik}|${Math.floor(v.sure)}|${Math.round(v.suphe * 60)}|${durum}`;
      if (anahtar === sonHud) return;
      sonHud = anahtar;
      hudEl.balik.textContent = `${v.balik}/${v.toplam}`;
      hudEl.sure.textContent = sureYaz(v.sure);
      hudEl.suphe.style.width = `${Math.min(1, v.suphe) * 100}%`;
      hudEl.suphe.classList.toggle('orta', v.suphe > 0.3 && v.suphe <= 0.7);
      hudEl.suphe.classList.toggle('yuksek', v.suphe > 0.7);
      hudEl.durum.textContent = durum;
    },
    mesaj(metin) {
      const el = $('mesaj');
      el.textContent = metin;
      el.classList.add('gorunur');
      clearTimeout(mesajZamanlayici);
      mesajZamanlayici = setTimeout(() => el.classList.remove('gorunur'), 2400);
    },
    yakalandi() {
      const YAZILAR = [
        'Satıcı seni kulağından tutup pazarın dışına bıraktı.',
        '"Yine mi sen!" diye bağırdı satıcı. Balıklar tezgâha geri döndü.',
        'Bir kova su yedin. Islak ama onurlu bir geri çekilme.',
        'Köpek seni ağacın tepesine kadar kovaladı. Bir dahaki sefere sessiz ol.',
      ];
      $('yakalandi-yazi').textContent = YAZILAR[Math.floor(Math.random() * YAZILAR.length)];
      goster('yakalandi');
    },
    kazandi(sonuc) {
      ilerleme[sira] = Math.max(ilerleme[sira] || 0, sonuc.yildiz);
      ilerlemeKaydet();
      $('kazandi-ad').textContent = BOLUMLER[sira].ad;
      $('kazandi-yildiz').innerHTML = [0, 1, 2]
        .map((i) => `<span class="${i < sonuc.yildiz ? 'dolu' : ''}">★</span>`)
        .join('');
      const sureTamam = sonuc.sure <= sonuc.par;
      $('kazandi-sonuc').innerHTML = [
        `<li class="tamam">★ Bütün balıkları kaçırdın</li>`,
        `<li class="${sureTamam ? 'tamam' : ''}">${sureTamam ? '★' : '☆'} Süre ${sureYaz(sonuc.sure)} (hedef ${sureYaz(sonuc.par)})</li>`,
        `<li class="${sonuc.farkEdildi ? '' : 'tamam'}">${sonuc.farkEdildi ? '☆ Fark edildin' : '★ Kimse fark etmedi'}</li>`,
      ].join('');
      const sonBolum = sira >= BOLUMLER.length - 1;
      $('dugme-sonraki').hidden = sonBolum;
      if (sonBolum) {
        $('kazandi-sonuc').insertAdjacentHTML(
          'beforeend',
          '<li class="tamam">Bütün pazarı soydun! Artık mahallenin efsanesisin.</li>'
        );
      }
      goster('kazandi');
    },
  });

  window.KK.oyun = oyun; // tarayıcı konsolundan hata ayıklama için

  const giris = window.KK.girisKur({
    girdi: oyun.girdi,
    tuval: $('oyun'),
    joystick: $('joystick'),
    topuz: $('topuz'),
    sinsiDugme: $('sinsi-dugme'),
    etkinMi: () => etkin === 'oyna',
    tuslar: tusaBasildi,
  });

  // ---- Akış -------------------------------------------------------------------

  function bolumAc(i) {
    sira = i;
    const veri = BOLUMLER[i];
    oyun.duraklat();
    oyun.bolumBaslat(veri, i);
    $('giris-sira').textContent = `BÖLÜM ${i + 1} / ${BOLUMLER.length}`;
    $('giris-ad').textContent = veri.ad;
    $('giris-ipucu').textContent = veri.ipucu;
    const balik = veri.harita.join('').split('F').length - 1;
    $('giris-hedef').textContent = `${balik} balık · hedef süre ${sureYaz(veri.par)}`;
    goster('giris');
  }

  function basla() {
    giris.sifirla();
    goster('oyna');
    oyun.oynat();
  }

  function duraklat() {
    if (etkin !== 'oyna') return;
    oyun.duraklat();
    giris.sifirla();
    goster('duraklat');
  }

  function devam() {
    if (etkin !== 'duraklat') return;
    basla();
  }

  function bolumleriGoster() {
    oyun.duraklat();
    const izgara = $('bolum-izgara');
    izgara.replaceChildren(
      ...BOLUMLER.map((b, i) => {
        const kart = document.createElement('button');
        kart.type = 'button';
        kart.className = 'bolum-kart';
        const acik = acikMi(i);
        kart.disabled = !acik;
        const yildiz = ilerleme[i] || 0;
        kart.innerHTML =
          `<span class="no">${acik ? i + 1 : '🔒'}</span>` +
          `<span class="ad"></span>` +
          `<span class="yildizlar">${[0, 1, 2].map((n) => `<span class="${n < yildiz ? 'dolu' : ''}">★</span>`).join('')}</span>`;
        kart.querySelector('.ad').textContent = b.ad;
        kart.setAttribute('aria-label', `Bölüm ${i + 1}: ${b.ad}, ${yildiz} yıldız${acik ? '' : ', kilitli'}`);
        kart.addEventListener('click', () => {
          ses.cal('tik');
          bolumAc(i);
        });
        return kart;
      })
    );
    goster('bolumler');
  }

  // ---- Düğmeler -----------------------------------------------------------------
  const tikla = (id, islev) =>
    $(id).addEventListener('click', () => {
      ses.ac();
      ses.cal('tik');
      islev();
    });

  tikla('dugme-oyna', () => {
    ses.cal('miyav');
    // İlk açılışta doğrudan ilk bölüme, sonra bölüm seçimine
    if ((ilerleme[0] || 0) === 0) bolumAc(0);
    else bolumleriGoster();
  });
  tikla('dugme-nasil', () => goster('nasil'));
  tikla('dugme-nasil-tamam', () => goster('baslik'));
  tikla('dugme-bolumler-geri', () => goster('baslik'));
  tikla('dugme-basla', basla);
  tikla('dugme-devam', devam);
  tikla('dugme-yeniden', () => bolumAc(sira));
  tikla('dugme-cik', bolumleriGoster);
  tikla('dugme-tekrar', () => bolumAc(sira));
  tikla('dugme-yakalandi-cik', bolumleriGoster);
  tikla('dugme-sonraki', () => bolumAc(Math.min(sira + 1, BOLUMLER.length - 1)));
  tikla('dugme-kazandi-tekrar', () => bolumAc(sira));
  tikla('dugme-kazandi-cik', bolumleriGoster);
  tikla('dugme-duraklat', duraklat);

  const sesDugme = $('dugme-ses');
  function sesDugmesiYaz() {
    sesDugme.classList.toggle('kapali', !ses.acikMi());
    sesDugme.setAttribute('aria-pressed', String(ses.acikMi()));
  }
  sesDugme.addEventListener('click', () => {
    ses.ac();
    ses.degistir();
    sesDugmesiYaz();
  });
  sesDugmesiYaz();

  // ---- Klavye -------------------------------------------------------------------
  function tusaBasildi(olay) {
    ses.ac();
    const kod = olay.code;
    if (kod === 'Escape' || kod === 'KeyP') {
      if (etkin === 'oyna') duraklat();
      else if (etkin === 'duraklat') devam();
      else if (etkin === 'nasil' || etkin === 'bolumler') goster('baslik');
      olay.preventDefault();
    } else if (kod === 'KeyR') {
      if (['oyna', 'duraklat', 'yakalandi', 'kazandi'].includes(etkin)) bolumAc(sira);
    } else if (kod === 'KeyM') {
      ses.degistir();
      sesDugmesiYaz();
    } else if ((kod === 'Enter' || kod === 'Space') && etkin === 'giris') {
      olay.preventDefault();
      basla();
    } else if (kod === 'Space' && etkin === 'oyna') {
      olay.preventDefault();
    }
  }

  // İlk dokunuşta ses motoru açılır
  window.addEventListener('pointerdown', () => ses.ac(), { capture: true });

  // Sekme gizlenince oyun kendiliğinden duraklar
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) duraklat();
  });

  // ---- Başlık ekranı ------------------------------------------------------------
  // Arkada ilk bölümün haritası durur; kedi sprite'ı başlıkta yürür
  oyun.bolumBaslat(BOLUMLER[0], 0);
  const baslikKedi = $('baslik-kedi').getContext('2d');
  let baslikKare = 0;
  setInterval(() => {
    if (etkin !== 'baslik') return;
    baslikKare++;
    baslikKedi.clearRect(0, 0, 16, 12);
    baslikKedi.drawImage(sprite.al(baslikKare % 2 ? 'KEDI_2' : 'KEDI_1'), 0, 0);
  }, 320);
  baslikKedi.drawImage(sprite.al('KEDI_1'), 0, 0);

  goster('baslik');
})();
