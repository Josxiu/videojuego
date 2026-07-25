import Phaser from 'phaser';
import { DreamFXPipeline, DREAM_FX_KEY, type DreamFXSettings } from './DreamFXPipeline';
import type { WorldId } from '../../systems/Palette';

/**
 * Cada mundo tiene su "cámara": el post-procesado es lo que más hace sentir que
 * un sueño ocurre en otro sitio. Son datos, no código: añadir un mundo es añadir
 * una entrada aquí.
 */
export const FX_PRESETS: Record<WorldId, DreamFXSettings> = {
  // Recuerdo escolar proyectado en una tele vieja
  exam: { scanline: 0.35, grain: 0.12, vignette: 0.25, contrast: 1.12, chroma: 0.6 },
  // Cielo nocturno: lente amplia, colores que se separan al caer
  fall: { chroma: 1.6, vignette: 0.45, grain: 0.08, contrast: 1.05, wave: 0.0012, waveSpeed: 0.8 },
  // Patio recordado: cálido, granulado como una foto vieja
  forest: { grain: 0.2, vignette: 0.55, contrast: 1.08, tint: 0xffd166, tintAmount: 0.08 },
  // Pesadilla infantil: casi sin color, mucho grano, bordes que se cierran
  chase: { desat: 0.85, contrast: 1.35, grain: 0.3, vignette: 0.6 },
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
