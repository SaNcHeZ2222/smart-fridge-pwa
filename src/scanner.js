import { BrowserMultiFormatReader } from '@zxing/browser';

let controls = null;
let reader = null;

export function cameraSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function startScanner({ video, facingMode = 'user', onResult, onStatus }) {
  stopScanner();
  if (!cameraSupported()) throw new Error('Браузер не предоставил доступ к камере.');

  reader = new BrowserMultiFormatReader();
  onStatus?.('Запрашиваю доступ к камере…');
  let found = false;

  controls = await reader.decodeFromConstraints(
    {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    },
    video,
    (result) => {
      if (!result || found) return;
      found = true;
      onStatus?.('Код считан');
      onResult?.({
        text: result.getText(),
        format: String(result.getBarcodeFormat?.() ?? 'unknown')
      });
    }
  );
  onStatus?.('Поднесите код к рамке');
  return controls;
}

export function stopScanner() {
  controls?.stop?.();
  controls = null;
  reader?.reset?.();
  reader = null;
}

export function beep({ frequency = 880, duration = 0.12 } = {}) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
  oscillator.addEventListener('ended', () => context.close());
}
