/** Root-mean-square level of one block of samples, 0 (silence) to 1 (full scale). */
export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i] ?? 0;
    sum += sample * sample;
  }
  return Math.min(1, Math.sqrt(sum / samples.length));
}

export const LEVEL_METER_PROCESSOR_NAME = "parlivo-level-meter";

/**
 * AudioWorklet processor source. It runs off the main thread (ARCHITECTURE.md section 5),
 * computes the RMS of each 128-frame block and posts the peak of those values about every
 * 50 ms. It is loaded from a Blob URL so it works from any origin, including the Tauri shell.
 */
export const LEVEL_METER_PROCESSOR_SOURCE = `
const rms = ${rms.toString()};
class ParlivoLevelMeter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.peak = 0;
    this.frames = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      this.peak = Math.max(this.peak, rms(channel));
      this.frames += channel.length;
      if (this.frames >= sampleRate / 20) {
        this.port.postMessage(this.peak);
        this.peak = 0;
        this.frames = 0;
      }
    }
    return true;
  }
}
registerProcessor(${JSON.stringify(LEVEL_METER_PROCESSOR_NAME)}, ParlivoLevelMeter);
`;

const loaded = new WeakMap<BaseAudioContext, Promise<void>>();

/** Load the processor into a context once. */
function loadProcessor(context: BaseAudioContext): Promise<void> {
  let promise = loaded.get(context);
  if (!promise) {
    const url = URL.createObjectURL(
      new Blob([LEVEL_METER_PROCESSOR_SOURCE], { type: "application/javascript" }),
    );
    promise = context.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    loaded.set(context, promise);
  }
  return promise;
}

/** Meter a MediaStreamTrack on the audio thread; `onLevel` receives 0..1 about 20 times a second. */
export async function createLevelMeter(
  context: AudioContext,
  track: MediaStreamTrack,
  onLevel: (level: number) => void,
): Promise<{ stop: () => void }> {
  await loadProcessor(context);
  const source = context.createMediaStreamSource(new MediaStream([track]));
  const node = new AudioWorkletNode(context, LEVEL_METER_PROCESSOR_NAME);
  node.port.onmessage = (event: MessageEvent<number>) => onLevel(event.data);
  source.connect(node);
  return {
    stop: () => {
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
    },
  };
}
