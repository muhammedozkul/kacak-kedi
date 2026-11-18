// ---------------------------------------------------------------------------
// Bölümler
//
// Harita harfleri:
//   #  bina (geçilmez, görüşü keser)      T  tezgâh (geçilmez, görüşü keser)
//   K  kasa (geçilmez, görüşü keser)      ~  deniz (geçilmez, görüşü kesmez)
//   .  kaldırım taşı                      ,  çimen
//   H  çuval yığını: saklanma yeri        m  çay masası: altına saklanılır
//   P  su birikintisi: koşarak basınca ses çıkar
//   F  balık                              C  kedinin başladığı yer
//   E  kaçış deliği (bütün balıklar toplanınca açılır)
//
// Bekçiler:
//   tip   : 'satici' | 'kopek'
//   yol   : karo koordinatları [x, y]; tek nokta ise yerinde durur
//   dongu : true → yol halka gibi döner; yoksa gidip gelir
//   bak   : yerinde duranın sırayla baktığı açılar (derece: 0 sağ, 90 aşağı)
//   bekle : her durakta bekleme (sn)      uyur : köpek uyuyor (yalnız duyar)
//   renk  : önlük ve gömlek rengi
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  const RENK = {
    kirmizi: { a: '#c8404a', c: '#e6dccb' },
    mavi: { a: '#3f6fb5', c: '#e6dccb' },
    yesil: { a: '#3f8f5a', c: '#f0e2c8' },
    beyaz: { a: '#f2efe8', c: '#2b2b33' },
    sari: { a: '#d9a42b', c: '#e6dccb' },
    lacivert: { a: '#2c3e66', c: '#bcd3e6' },
  };

  const BOLUMLER = [
    {
      ad: 'Balık Pazarı',
      ipucu:
        'Sarı alan satıcının gördüğü yer: oraya girme! Shift ile (telefonda joystiği az iterek) sessizce yürürsün. Çuvallara saklanabilirsin. Bütün balıkları topla, sonra sağdaki deliğe koş.',
      par: 40,
      harita: [
        '########################',
        '#C....,,,,.............#',
        '#..TTTT.......H..TTTT..#',
        '#..TTTT..........TTTT..#',
        '#.........F............#',
        '#......................#',
        '#..TTTT....KK....TTTT..#',
        '#..TTTT....KK....TTTT..#',
        '#...F.............F....E',
        '#H.....................#',
        '#.....,,,,.....H.......#',
        '########################',
      ],
      bekciler: [{ tip: 'satici', yol: [[3, 5], [20, 5]], bekle: 1.8, renk: 'kirmizi' }],
    },
    {
      ad: 'Kasap Sokağı',
      ipucu:
        'İki satıcı birden. Biri arka odada durmuş, sağa sola bakıyor: başını çevirdiği anı kolla.',
      par: 65,
      harita: [
        '##########################',
        '#C...K......###.....F....#',
        '#....K......###..........#',
        '#..TTTTTT...###..TTTTTT..#',
        '#........................#',
        '#.H......F...........H...#',
        '#..TTTTTT.....KK.TTTTTT..#',
        '#.............KK.........#',
        '#####....#########...#####',
        '#F.......#.......#......F#',
        '#....H...#...F...#.......#',
        '#........................E',
        '##########################',
      ],
      bekciler: [
        { tip: 'satici', yol: [[2, 4], [23, 4]], bekle: 1.5, renk: 'mavi' },
        { tip: 'satici', yol: [[2, 11], [22, 11]], bekle: 2, renk: 'kirmizi' },
        { tip: 'satici', yol: [[13, 9]], bak: [0, 90, 180, 90], bekle: 2.2, renk: 'beyaz' },
      ],
    },
    {
      ad: 'Çay Bahçesi',
      ipucu:
        'Garsonlar masaların arasında dolaşıyor. Masaların altına saklanabilirsin ama yalnızca sessizce yürürken ya da dururken.',
      par: 60,
      harita: [
        '########################',
        '#C,,,,,,,,,,,,,,,,,,,,,#',
        '#,,m,,,m,,,m,,,m,,,m,,,#',
        '#,,,,,,,,,,,,,,,,,,,,,,#',
        '#,,m,,,m,,F,,,m,,,m,,,,#',
        '#,,,,,,,,,,,,,,,,,,,,,,#',
        '#KK,,,,,,,TTTT,,,,,,,KK#',
        '#F,,m,,,m,,,,,,,m,,,m,F#',
        '#,,,,,,,,,,,,,,,,,,,,,,#',
        '#,,m,,,m,,,,,,,,m,,,m,,#',
        '#,,,,,,,,,,F,,,,,,,,,,,E',
        '########################',
      ],
      bekciler: [
        { tip: 'satici', yol: [[2, 3], [21, 3], [21, 5], [2, 5]], dongu: true, bekle: 0.8, renk: 'beyaz' },
        { tip: 'satici', yol: [[21, 8], [2, 8], [2, 10], [21, 10]], dongu: true, bekle: 0.8, renk: 'beyaz' },
        { tip: 'satici', yol: [[12, 5]], bak: [180, 90, 0, 90], bekle: 1.8, renk: 'sari' },
      ],
    },
    {
      ad: 'Yağmurlu Sokak',
      ipucu:
        'Yerde su birikintileri var. Üstlerinden koşarsan şapırtıyı duyan gelir; sessizce yürürsen kimse duymaz.',
      par: 70,
      harita: [
        '##########################',
        '#C....P....#......P.....F#',
        '#..P.......#..TTT........#',
        '#....TTT...#..TTT..P.....#',
        '#.F..TTT...P.........KK..#',
        '#..........#..P......KK..#',
        '####.P..####..####.......#',
        '#H.....P......#F.....P...#',
        '#..P...KK..P..#..........#',
        '#......KK.....#..TTTT..P.#',
        '#.F..P.....P.....TTTT....E',
        '##########################',
      ],
      bekciler: [
        { tip: 'satici', yol: [[2, 5], [9, 5]], bekle: 1.6, renk: 'yesil' },
        { tip: 'satici', yol: [[13, 1], [13, 5], [19, 5], [24, 7]], bekle: 1.4, renk: 'mavi' },
        { tip: 'satici', yol: [[16, 8], [24, 8]], bekle: 2, renk: 'kirmizi' },
        { tip: 'satici', yol: [[3, 9], [12, 9]], bekle: 1.6, renk: 'sari' },
      ],
    },
    {
      ad: 'Köpekli Avlu',
      ipucu:
        'Köpekler az görür ama çok iyi duyar. Yanlarından hep sessizce geç. Uyuyan köpeği uyandırma!',
      par: 75,
      harita: [
        '##########################',
        '#C.......#.......H......F#',
        '#........#...............#',
        '#..KK....#....TTTT..KK...#',
        '#..KK...............KK...#',
        '#.....F..#....TTTT.......#',
        '####..####...............#',
        '#F.......#######..########',
        '#........,,,,,,,.........#',
        '#..H.....,,,,F,,.....KK..#',
        '#........,,,,,,,.....KK..E',
        '##########################',
      ],
      bekciler: [
        { tip: 'kopek', yol: [[5, 8]], bak: [0], uyur: true },
        { tip: 'satici', yol: [[11, 2], [23, 2]], bekle: 1.8, renk: 'lacivert' },
        { tip: 'kopek', yol: [[11, 4], [24, 5], [24, 1]], dongu: true, bekle: 1 },
        { tip: 'kopek', yol: [[10, 8], [15, 10], [10, 10], [15, 8]], dongu: true, bekle: 0.6 },
        { tip: 'satici', yol: [[18, 9], [18, 8], [24, 8]], bekle: 1.5, renk: 'kirmizi' },
      ],
    },
    {
      ad: 'Liman',
      ipucu:
        'Balıkçılar ağlarını topluyor, bekçi köpeği iskelede. En büyük ganimet burada: altı balık!',
      par: 100,
      harita: [
        '##############################',
        '#C.....T....,,,,....K...F....#',
        '#......T................K....#',
        '#..TTT.T...H....TTTTT........#',
        '#...........F................#',
        '#..KK.....KK.....KK.....KK...#',
        '#..KK.....KK.....KK.....KK...#',
        '#.............H..............#',
        '#F....TTTT.....P....TTTT....F#',
        '#............................#',
        '#..H.....P.........KK....H...E',
        '#~~~~..~~~~~~..~~~~~~..~~~~~~#',
        '#~~~~..~~~~~~..~~~~~~..~~~~~~#',
        '#~~~~F.~~~~~~..~~~~~~.F~~~~~~#',
        '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
        '##############################',
      ],
      bekciler: [
        { tip: 'satici', yol: [[9, 1], [9, 4], [22, 4]], bekle: 1.6, renk: 'lacivert' },
        { tip: 'satici', yol: [[2, 7], [27, 7]], bekle: 1.8, renk: 'sari' },
        { tip: 'kopek', yol: [[13, 9], [13, 12], [13, 9], [27, 9]], dongu: true, bekle: 1.2 },
        { tip: 'satici', yol: [[5, 12], [5, 9]], bekle: 2.4, renk: 'mavi' },
        { tip: 'satici', yol: [[21, 13], [21, 10], [26, 9]], bekle: 2, renk: 'yesil' },
        { tip: 'kopek', yol: [[27, 2]], bak: [180], uyur: true },
      ],
    },
  ];

  window.KK = window.KK || {};
  window.KK.BOLUMLER = BOLUMLER;
  window.KK.RENK = RENK;
})();
