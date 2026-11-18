// ---------------------------------------------------------------------------
// Girdi: klavye (oklar / WASD, Shift sessiz yürüyüş) ve dokunmatik joystick.
// Sonuç oyun.girdi nesnesine yazılır: { x, y, sinsi, analog }.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  function girisKur({ girdi, tuval, joystick, topuz, sinsiDugme, etkinMi, tuslar }) {
    const basili = new Set();

    function klavyedenYaz() {
      let x = 0;
      let y = 0;
      if (basili.has('ArrowLeft') || basili.has('KeyA')) x -= 1;
      if (basili.has('ArrowRight') || basili.has('KeyD')) x += 1;
      if (basili.has('ArrowUp') || basili.has('KeyW')) y -= 1;
      if (basili.has('ArrowDown') || basili.has('KeyS')) y += 1;
      if (!dokunus) {
        girdi.x = x;
        girdi.y = y;
        girdi.analog = false;
      }
      girdi.sinsi = basili.has('ShiftLeft') || basili.has('ShiftRight') || sinsiBasili;
    }

    const HAREKET = new Set([
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight',
    ]);

    window.addEventListener('keydown', (olay) => {
      if (olay.metaKey || olay.ctrlKey || olay.altKey) return;
      if (HAREKET.has(olay.code)) {
        basili.add(olay.code);
        klavyedenYaz();
        if (olay.code.startsWith('Arrow')) olay.preventDefault();
        return;
      }
      if (!olay.repeat) tuslar(olay);
    });
    window.addEventListener('keyup', (olay) => {
      basili.delete(olay.code);
      klavyedenYaz();
    });
    window.addEventListener('blur', () => {
      basili.clear();
      sinsiBasili = false;
      joystickBirak();
      klavyedenYaz();
    });

    // ---- Dokunmatik joystick ---------------------------------------------------
    const YARICAP = 46;
    let dokunus = null; // { id, x0, y0 }
    let sinsiBasili = false;

    function joystickBirak() {
      dokunus = null;
      girdi.x = 0;
      girdi.y = 0;
      joystick.classList.remove('acik');
      topuz.style.transform = 'translate(-50%, -50%)';
    }

    tuval.addEventListener('pointerdown', (olay) => {
      if (olay.pointerType === 'mouse' || !etkinMi() || dokunus) return;
      document.body.classList.add('dokunmatik');
      dokunus = { id: olay.pointerId, x0: olay.clientX, y0: olay.clientY };
      joystick.style.left = `${olay.clientX}px`;
      joystick.style.top = `${olay.clientY}px`;
      joystick.classList.add('acik');
      girdi.analog = true;
      tuval.setPointerCapture(olay.pointerId);
      olay.preventDefault();
    });
    tuval.addEventListener('pointermove', (olay) => {
      if (!dokunus || olay.pointerId !== dokunus.id) return;
      let dx = olay.clientX - dokunus.x0;
      let dy = olay.clientY - dokunus.y0;
      const d = Math.hypot(dx, dy);
      if (d > YARICAP) {
        // Parmak çok uzaklaşırsa joystick peşinden gelir
        const fazla = d - YARICAP;
        dokunus.x0 += (dx / d) * fazla;
        dokunus.y0 += (dy / d) * fazla;
        joystick.style.left = `${dokunus.x0}px`;
        joystick.style.top = `${dokunus.y0}px`;
        dx = (dx / d) * YARICAP;
        dy = (dy / d) * YARICAP;
      }
      girdi.x = dx / YARICAP;
      girdi.y = dy / YARICAP;
      topuz.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const birak = (olay) => {
      if (dokunus && olay.pointerId === dokunus.id) joystickBirak();
    };
    tuval.addEventListener('pointerup', birak);
    tuval.addEventListener('pointercancel', birak);

    // Sessiz yürüyüş düğmesi: basılı tutulur
    const sinsiBas = (olay) => {
      olay.preventDefault();
      sinsiBasili = true;
      sinsiDugme.classList.add('basili');
      klavyedenYaz();
    };
    const sinsiBirak = () => {
      sinsiBasili = false;
      sinsiDugme.classList.remove('basili');
      klavyedenYaz();
    };
    sinsiDugme.addEventListener('pointerdown', sinsiBas);
    sinsiDugme.addEventListener('pointerup', sinsiBirak);
    sinsiDugme.addEventListener('pointercancel', sinsiBirak);
    sinsiDugme.addEventListener('pointerleave', sinsiBirak);

    if (window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('dokunmatik');

    return {
      sifirla() {
        basili.clear();
        sinsiBasili = false;
        joystickBirak();
        klavyedenYaz();
      },
    };
  }

  window.KK = window.KK || {};
  window.KK.girisKur = girisKur;
})();
