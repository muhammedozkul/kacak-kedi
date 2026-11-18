[English](README.md) · **Türkçe**

# Kaçak Kedi 🐈‍⬛

Pazardan balık kaçıran sinsi bir kara kedinin pixel gizlilik oyunu. Kuşbakışı, 6 bölüm; tarayıcıda klavyeyle ya da telefonda dokunarak oynanır.

🐟 **Tarayıcıda oyna:** https://muhammedozkul.github.io/kacak-kedi/

Kurulum gerekmez; bilgisayarda ve telefonda Chrome, Edge, Safari ya da Firefox ile açılır.

## Bilgisayarda açmak

Depoyu indirip `index.html` dosyasına çift tıklaman yeter. Kurulum, sunucu ya da internet gerekmez (yalnız pixel yazı tipi internetten gelir; yoksa yedek yazı tipi kullanılır).

## Nasıl oynanır?

- **Amaç:** Bütün balıkları topla, sonra parlayan kaçış deliğine koş.
- **Sarı alan** satıcının gördüğü yer. İçine girersen şüphe çubuğu dolar; dolarsa yakalanırsın.
- **Sessiz yürü:** Shift (telefonda joystiği az it ya da SESSİZ düğmesine basılı tut). Yavaşsın ama köpekler duymaz, birikintiler şapırdamaz.
- **Saklan:** Çuval yığınlarında ve çay masalarının altında, dururken ya da sessizce yürürken görünmezsin.
- **Köpekler** az görür, çok iyi duyar; uyuyanı uyandırma.
- **Yıldızlar:** ★ bitir · ★ hedef sürenin altında bitir · ★ hiç fark edilmeden bitir. İlerleme tarayıcıda saklanır.

| Tuş | İş |
| --- | --- |
| Oklar / WASD | Yürü |
| Shift | Sessiz yürü |
| Esc / P | Duraklat |
| R | Bölümü baştan başlat |
| M | Sesi aç/kapat |
| Enter | Bölümü başlat |

## Bölümler

1. Balık Pazarı · 2. Kasap Sokağı · 3. Çay Bahçesi · 4. Yağmurlu Sokak · 5. Köpekli Avlu · 6. Liman

## Teknik

Saf HTML, CSS ve JavaScript; derleme ya da kütüphane yok. Bütün çizimler (kedi, satıcılar, köpekler, tezgâhlar, binalar) ve sesler kodla üretilir; dışarıdan görsel ya da ses dosyası kullanılmaz.

```
index.html           Ekranlar ve HUD
css/stil.css         Pixel arayüz
js/sprite.js         Karakter sprite'ları (harf dizileri)
js/harita-cizim.js   Karoların ve süslerin çizimi
js/bolumler.js       Bölüm haritaları ve bekçi yolları
js/oyun.js           Motor: hareket, görüş konileri, şüphe, yol bulma, çizim
js/giris.js          Klavye ve dokunmatik joystick
js/ses.js            Web Audio ile 8-bit efektler
js/arayuz.js         Ekran akışı, ilerleme kaydı
```

Yazı tipi: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (SIL Open Font License).

---

Geliştiren: Muhammed Yaşar ÖZKUL
