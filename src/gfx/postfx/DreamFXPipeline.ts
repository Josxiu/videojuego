import Phaser from 'phaser';

/**
 * Un único shader de post-procesado configurable por uniformes, en vez de un
 * pipeline por sueño: añadir un mundo nuevo es añadir un preset, no un shader.
 *
 * Efectos combinables:
 * - scanlines + curvatura (televisor viejo)
 * - aberración cromática (separación RGB)
 * - grano de película animado
 * - viñeta
 * - ondulación (el mundo "respira" como un sueño)
 * - desaturación y contraste
 */
const FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uTime;

uniform float uScanline;   // 0..1 intensidad de las líneas de barrido
uniform float uChroma;     // separación RGB en píxeles
uniform float uGrain;      // 0..1 grano
uniform float uVignette;   // 0..1 oscurecimiento de bordes
uniform float uWave;       // amplitud de la ondulación
uniform float uWaveSpeed;
uniform float uDesat;      // 0..1 hacia escala de grises
uniform float uContrast;   // 1 = sin cambio
uniform vec3  uTintColor;  // color de tintado suave
uniform float uTintAmount; // 0..1

varying vec2 outTexCoord;

// Ruido barato y estable para el grano
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = outTexCoord;

  // Ondulación onírica: desplaza las filas con una senoidal lenta
  if (uWave > 0.0) {
    uv.x += sin(uv.y * 12.0 + uTime * uWaveSpeed) * uWave;
    uv.y += cos(uv.x * 9.0 + uTime * uWaveSpeed * 0.7) * uWave * 0.4;
  }

  vec4 color;
  if (uChroma > 0.0) {
    // La separación crece hacia los bordes, como una lente real
    vec2 dir = uv - vec2(0.5);
    float amt = uChroma / uResolution.x;
    float r = texture2D(uMainSampler, uv + dir * amt * 6.0).r;
    float g = texture2D(uMainSampler, uv).g;
    float b = texture2D(uMainSampler, uv - dir * amt * 6.0).b;
    float a = texture2D(uMainSampler, uv).a;
    color = vec4(r, g, b, a);
  } else {
    color = texture2D(uMainSampler, uv);
  }

  // Desaturación
  if (uDesat > 0.0) {
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(lum), uDesat);
  }

  // Contraste alrededor del gris medio
  color.rgb = (color.rgb - 0.5) * uContrast + 0.5;

  // Tintado del mundo
  color.rgb = mix(color.rgb, uTintColor, uTintAmount);

  // Líneas de barrido
  if (uScanline > 0.0) {
    float line = sin(uv.y * uResolution.y * 1.4) * 0.5 + 0.5;
    color.rgb *= 1.0 - uScanline * (1.0 - line) * 0.6;
  }

  // Grano animado
  if (uGrain > 0.0) {
    float g = noise(uv * uResolution.xy * 0.5 + fract(uTime) * 100.0);
    color.rgb += (g - 0.5) * uGrain * 0.35;
  }

  // Viñeta
  if (uVignette > 0.0) {
    float d = distance(uv, vec2(0.5));
    color.rgb *= 1.0 - smoothstep(0.35, 0.85, d) * uVignette;
  }

  gl_FragColor = color;
}
`;

/** Ajustes de un preset. Todos los campos son opcionales: lo omitido queda a cero. */
export interface DreamFXSettings {
  scanline?: number;
  chroma?: number;
  grain?: number;
  vignette?: number;
  wave?: number;
  waveSpeed?: number;
  desat?: number;
  contrast?: number;
  tint?: number;
  tintAmount?: number;
}

const DEFAULTS: Required<DreamFXSettings> = {
  scanline: 0,
  chroma: 0,
  grain: 0,
  vignette: 0,
  wave: 0,
  waveSpeed: 1,
  desat: 0,
  contrast: 1,
  tint: 0xffffff,
  tintAmount: 0,
};

export const DREAM_FX_KEY = 'DreamFX';

export class DreamFXPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private settings: Required<DreamFXSettings> = { ...DEFAULTS };
  private elapsed = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: DREAM_FX_KEY, fragShader: FRAGMENT_SHADER });
  }

  /** Aplica un preset. Se puede llamar en caliente para transiciones. */
  configure(settings: DreamFXSettings): this {
    this.settings = { ...DEFAULTS, ...settings };
    return this;
  }

  onPreRender(): void {
    // `game.loop.delta` está en ms; el shader usa segundos.
    this.elapsed += this.game.loop.delta / 1000;
    const s = this.settings;
    this.set1f('uTime', this.elapsed);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set1f('uScanline', s.scanline);
    this.set1f('uChroma', s.chroma);
    this.set1f('uGrain', s.grain);
    this.set1f('uVignette', s.vignette);
    this.set1f('uWave', s.wave);
    this.set1f('uWaveSpeed', s.waveSpeed);
    this.set1f('uDesat', s.desat);
    this.set1f('uContrast', s.contrast);
    this.set3f(
      'uTintColor',
      ((s.tint >> 16) & 0xff) / 255,
      ((s.tint >> 8) & 0xff) / 255,
      (s.tint & 0xff) / 255,
    );
    this.set1f('uTintAmount', s.tintAmount);
  }
}
