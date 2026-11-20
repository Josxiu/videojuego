import Phaser from 'phaser';
import { DreamFXPipeline, DREAM_FX_KEY, type DreamFXSettings } from './DreamFXPipeline';
import type { WorldId } from '../../systems/Palette';

/**
 * Cada mundo tiene su "cámara": el post-procesado es lo que más hace sentir que
 * un sueño ocurre en otro sitio.
 */
export const FX_PRESETS: Record<WorldId, DreamFXSettings> = {
  // Gis sobre pizarrón
  exam: { boil: 0.9, boilFps: 7, paper: 0.55, paperScale: 2.5, grain: 0.05, vignette: 0.35 },
  // Papel recortado
  fall: { paper: 0.7, paperScale: 2.5, boil: 0.35, boilFps: 10, vignette: 0.35, grain: 0.03 },
  // Acuarela
  forest: {
    paper: 1,
    paperScale: 2,
    soft: 0.7,
    wave: 0.0006,
    waveSpeed: 0.5,
    vignette: 0.28,
    tint: 0xffe8c0,
    tintAmount: 0.04,
  },
  // Teatro de sombras: grano de celuloide, temblor de obturador a 12 fps y viñeta ovalada cálida
  shadow: {
    boil: 0.55,
    boilFps: 12,
    grain: 0.12,
    vignette: 0.58,
    chroma: 0.45,
    tint: 0xffb855,
    tintAmount: 0.05,
  },
  // Bordado en lino: textura tejida gruesa y calidez de taller
  embroidery: {
    paper: 0.95,
    paperScale: 1.8,
    boil: 0.2,
    boilFps: 6,
    vignette: 0.24,
    contrast: 1.03,
    tint: 0xfff0d6,
    tintAmount: 0.03,
  },
  // Vitral emplomado: contraste vívido, leve aberración de cristal y suavizado luminoso
  glass: {
    chroma: 0.75,
    soft: 0.45,
    contrast: 1.12,
    grain: 0.03,
    vignette: 0.42,
  },
  // Crayola de noche
  chase: { boil: 1.2, boilFps: 6, paper: 0.8, paperScale: 2.5, grain: 0.06, vignette: 0.55 },
  // Xilografía / Grabado: papel algodón marcado y alto contraste de imprenta
  woodcut: {
    paper: 0.85,
    paperScale: 2.2,
    boil: 0.25,
    boilFps: 5,
    contrast: 1.14,
    grain: 0.05,
    vignette: 0.3,
  },
  // Cámara anecoica 3D: precisión clínica, sutil scanline de sonómetro y viñeta fría
  chamber3d: {
    scanline: 0.09,
    chroma: 0.5,
    vignette: 0.34,
    contrast: 1.06,
    grain: 0.025,
  },
  // El sueño propio
  song: { vignette: 0.3, grain: 0.04, chroma: 0.35, wave: 0.0006, waveSpeed: 0.4 },
  // El Entresueño
  hub: { wave: 0.0022, waveSpeed: 0.6, vignette: 0.35, grain: 0.05, chroma: 0.4 },
  menu: { vignette: 0.4, grain: 0.06, wave: 0.0009, waveSpeed: 0.4 },
  ending: { grain: 0.07, vignette: 0.2, contrast: 1.04, tint: 0xffd7b0, tintAmount: 0.06 },
  album: { paper: 0.5, paperScale: 2.5, vignette: 0.38, grain: 0.04 },
};

export function registerPostFX(game: Phaser.Game): void {
  if (game.renderer.type !== Phaser.WEBGL) return;
  const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if (renderer.pipelines.getPostPipeline(DREAM_FX_KEY)) return;
  renderer.pipelines.addPostPipeline(DREAM_FX_KEY, DreamFXPipeline);
}

export function applyWorldFX(scene: Phaser.Scene, world: WorldId): DreamFXPipeline | undefined {
  if (scene.game.renderer.type !== Phaser.WEBGL) return undefined;
  const cam = scene.cameras.main;
  cam.setPostPipeline(DREAM_FX_KEY);
  const pipeline = cam.getPostPipeline(DREAM_FX_KEY);
  const fx = (Array.isArray(pipeline) ? pipeline[0] : pipeline) as DreamFXPipeline | undefined;
  fx?.configure(FX_PRESETS[world]);
  return fx;
}

export { DreamFXPipeline, DREAM_FX_KEY };
export type { DreamFXSettings };
