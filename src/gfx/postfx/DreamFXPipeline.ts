import Phaser from 'phaser';

/**
 * Un único shader de post-procesado configurable por uniformes, en vez de un
 * pipeline por sueño: añadir un mundo nuevo es añadir un preset, no un shader.
 *
 * Efectos combinables:
 * - scanlines (televisor viejo)
 * - aberración cromática (separación RGB)
 * - grano de película animado
 * - viñeta
 * - ondulación (el mundo "respira" como un sueño)
 * - desaturación y contraste
 * - «line boil»: las líneas tiemblan a pocos cuadros por segundo, como en la
 *   animación dibujada a mano (tiza, crayola)
 * - textura de papel/pizarrón fija a la pantalla
 * - suavizado (pigmento que se corre, para la acuarela)
 */
const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

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
uniform float uBoil;       // píxeles de temblor de línea
uniform float uBoilFps;    // cuadros por segundo del temblor
uniform float uPaper;      // 0..1 textura de fibras
uniform float uPaperScale; // tamaño de la fibra
uniform float uSoft;       // píxeles de suavizado

varying vec2 outTexCoord;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec4 sampleScene(vec2 uv) {
  if (uChroma > 0.0) {
    // La separación crece hacia los bordes, como una lente real
    vec2 dir = uv - vec2(0.5);
    float amt = uChroma / uResolution.x;
    vec4 base = texture2D(uMainSampler, uv);
    float r = texture2D(uMainSampler, uv + dir * amt * 6.0).r;
    float b = texture2D(uMainSampler, uv - dir * amt * 6.0).b;
    return vec4(r, base.g, b, base.a);
  }
  return texture2D(uMainSampler, uv);
}

void main() {
  vec2 uv = outTexCoord;
  vec2 px = outTexCoord * uResolution;

  // Ondulación onírica: desplaza las filas con una senoidal lenta
  if (uWave > 0.0) {
    uv.x += sin(uv.y * 12.0 + uTime * uWaveSpeed) * uWave;
    uv.y += cos(uv.x * 9.0 + uTime * uWaveSpeed * 0.7) * uWave * 0.4;
  }

  // Line boil: un desplazamiento suave que cambia a saltos, no continuo
  if (uBoil > 0.0) {
    float frame = floor(uTime * uBoilFps);
    vec2 q = px / 34.0;
    vec2 off = vec2(vnoise(q + frame * 7.13), vnoise(q + frame * 3.71 + 19.0)) - 0.5;
    uv += off * 2.0 * uBoil / uResolution;
  }

  vec4 color = sampleScene(uv);

  // Suavizado en cruz: el pigmento se corre un poco
  if (uSoft > 0.0) {
    vec2 o = uSoft / uResolution;
    color = color * 0.4
      + sampleScene(uv + vec2(o.x, 0.0)) * 0.15
      + sampleScene(uv - vec2(o.x, 0.0)) * 0.15
      + sampleScene(uv + vec2(0.0, o.y)) * 0.15
      + sampleScene(uv - vec2(0.0, o.y)) * 0.15;
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

  // Fibras de papel (o polvo de pizarrón): fijas a la pantalla, no se mueven
  if (uPaper > 0.0) {
    vec2 p = px / uPaperScale;
    float fib = vnoise(p * vec2(1.6, 0.22)) * 0.45
      + vnoise(p * 0.7 + 11.0) * 0.35
      + vnoise(p * 0.09 + 5.0) * 0.2;
    float tooth = hash(floor(px * 0.5));
    color.rgb *= 1.0 - uPaper * ((fib - 0.45) * 0.3 + (tooth - 0.5) * 0.06);
  }

  // Líneas de barrido
  if (uScanline > 0.0) {
    float line = sin(uv.y * uResolution.y * 1.4) * 0.5 + 0.5;
    color.rgb *= 1.0 - uScanline * (1.0 - line) * 0.6;
  }

  // Grano animado
  if (uGrain > 0.0) {
    float g = hash(px * 0.5 + fract(uTime) * 100.0);
    color.rgb += (g - 0.5) * uGrain * 0.35;
  }

  // Viñeta
  if (uVignette > 0.0) {
    float d = distance(outTexCoord, vec2(0.5));
    color.rgb *= 1.0 - smoothstep(0.35, 0.85, d) * uVignette;
  }

  gl_FragColor = color;
}
`;

/** Ajustes de un preset. Todos los campos son opcionales: lo omitido queda neutro. */
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
  boil?: number;
  boilFps?: number;
  paper?: number;
  paperScale?: number;
  soft?: number;
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
  boil: 0,
  boilFps: 8,
  paper: 0,
  paperScale: 3,
  soft: 0,
};

/** Campos numéricos que se pueden interpolar en una transición. */
const LERPABLE: (keyof DreamFXSettings)[] = [
  'scanline',
  'chroma',
  'grain',
  'vignette',
  'wave',
  'waveSpeed',
  'desat',
  'contrast',
  'tintAmount',
  'boil',
  'paper',
  'paperScale',
  'soft',
];

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

  /** Ajustes actuales (copia), útil para interpolar desde aquí. */
  current(): Required<DreamFXSettings> {
    return { ...this.settings };
  }

  /**
   * Transición suave de un preset a otro en `ms` milisegundos.
   * El tinte cambia de golpe a la mitad: interpolar colores empaquetados no tiene sentido.
   */
  blendTo(scene: Phaser.Scene, target: DreamFXSettings, ms = 800): void {
    const from = this.current();
    const to: Required<DreamFXSettings> = { ...DEFAULTS, ...target };
    const state = { t: 0 };
    scene.tweens.add({
      targets: state,
      t: 1,
      duration: ms,
      ease: 'Sine.inOut',
      onUpdate: () => {
        const next: Required<DreamFXSettings> = { ...to };
        for (const k of LERPABLE) {
          (next[k] as number) =
            (from[k] as number) + ((to[k] as number) - (from[k] as number)) * state.t;
        }
        next.tint = state.t < 0.5 ? from.tint : to.tint;
        next.boilFps = to.boilFps;
        this.settings = next;
      },
    });
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
    this.set1f('uBoil', s.boil);
    this.set1f('uBoilFps', s.boilFps);
    this.set1f('uPaper', s.paper);
    this.set1f('uPaperScale', s.paperScale);
    this.set1f('uSoft', s.soft);
  }
}
