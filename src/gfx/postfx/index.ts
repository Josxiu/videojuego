import Phaser from 'phaser';
import { DreamFXPipeline, DREAM_FX_KEY, type DreamFXSettings } from './DreamFXPipeline';
import type { WorldId } from '../../systems/Palette';

/**
 * Cada mundo tiene su "cámara": el post-procesado es lo que más hace sentir que
 * un sueño ocurre en otro sitio. Son datos, no código: añadir un mundo es añadir
 * una entrada aquí.
 */
export const FX_PRESETS: Record<WorldId, DreamFXSettings> = {
  // Gis sobre pizarrón: las líneas tiemblan como animación a mano, polvo en el aire
  exam: { boil: 0.9, boilFps: 7, paper: 0.55, paperScale: 2.5, grain: 0.05, vignette: 0.35 },
  // Papel recortado: fibras del papel y un leve temblor de stop-motion
  fall: { paper: 0.7, paperScale: 2.5, boil: 0.35, boilFps: 10, vignette: 0.35, grain: 0.03 },
  // Acuarela: papel con textura, pigmento que se corre, el mundo húmedo
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
  // Crayola de noche: trazos inquietos, papel granuloso, bordes que se cierran
  chase: { boil: 1.2, boilFps: 6, paper: 0.8, paperScale: 2.5, grain: 0.06, vignette: 0.55 },
  // El sueño propio: limpio, cálido, apenas un respiro
  song: { vignette: 0.3, grain: 0.04, chroma: 0.35, wave: 0.0006, waveSpeed: 0.4 },
  // El Entresueño: todo ondula suavemente, como visto desde debajo del agua
  hub: { wave: 0.0022, waveSpeed: 0.6, vignette: 0.35, grain: 0.05, chroma: 0.4 },
  menu: { vignette: 0.4, grain: 0.06, wave: 0.0009, waveSpeed: 0.4 },
  ending: { grain: 0.07, vignette: 0.2, contrast: 1.04, tint: 0xffd7b0, tintAmount: 0.06 },
};

/** Registra el pipeline una sola vez por juego. Sin WebGL no hace nada. */
export function registerPostFX(game: Phaser.Game): void {
  if (game.renderer.type !== Phaser.WEBGL) return;
  const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if (renderer.pipelines.getPostPipeline(DREAM_FX_KEY)) return;
  renderer.pipelines.addPostPipeline(DREAM_FX_KEY, DreamFXPipeline);
}

/**
 * Aplica el ambiente de un mundo a la cámara de la escena.
 * Degrada en silencio si el navegador no tiene WebGL: el juego se ve plano
 * pero funciona igual.
 */
export function applyWorldFX(scene: Phaser.Scene, world: WorldId): DreamFXPipeline | undefined {
  if (scene.game.renderer.type !== Phaser.WEBGL) return undefined;
  const cam = scene.cameras.main;
  cam.setPostPipeline(DREAM_FX_KEY);
  const pipeline = cam.getPostPipeline(DREAM_FX_KEY);
  // getPostPipeline puede devolver un array si hay varios del mismo tipo
  const fx = (Array.isArray(pipeline) ? pipeline[0] : pipeline) as DreamFXPipeline | undefined;
  fx?.configure(FX_PRESETS[world]);
  return fx;
}

export { DreamFXPipeline, DREAM_FX_KEY };
export type { DreamFXSettings };
