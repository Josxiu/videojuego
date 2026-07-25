import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../src/systems/SaveManager';

const KEY = 'duermevela-save-v1';

describe('SaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
    SaveManager.reset();
  });

  it('arranca con un progreso vacío', () => {
    SaveManager.load();
    expect(SaveManager.keyCount()).toBe(0);
    expect(SaveManager.fireflyCount()).toBe(0);
    expect(SaveManager.data.nightmareDone).toBe(false);
  });

  it('guarda y recupera el progreso', () => {
    SaveManager.giveKey('exam');
    SaveManager.recordFireflies('exam', 3);
    SaveManager.load();
    expect(SaveManager.data.keys.exam).toBe(true);
    expect(SaveManager.data.fireflies.exam).toBe(3);
  });

  it('solo sube el récord de luciérnagas, nunca lo baja', () => {
    SaveManager.recordFireflies('fall', 5);
    SaveManager.recordFireflies('fall', 2);
    expect(SaveManager.data.fireflies.fall).toBe(5);
  });

  it('migra guardados antiguos sin los campos nuevos', () => {
    // Un guardado de una versión previa: sin nightmareDone ni la llave 'forest'
    localStorage.setItem(
      KEY,
      JSON.stringify({ keys: { exam: true }, fireflies: { exam: 2 }, introSeen: true }),
    );
    SaveManager.load();
    expect(SaveManager.data.keys.exam).toBe(true);
    expect(SaveManager.data.keys.forest).toBe(false); // campo nuevo con valor por defecto
    expect(SaveManager.data.fireflies.fall).toBe(0);
    expect(SaveManager.data.nightmareDone).toBe(false);
    expect(SaveManager.data.introSeen).toBe(true);
  });

  it('no explota con un guardado corrupto', () => {
    localStorage.setItem(KEY, '{ esto no es json');
    expect(() => SaveManager.load()).not.toThrow();
    expect(SaveManager.keyCount()).toBe(0);
  });

  it('cuenta las llaves obtenidas', () => {
    SaveManager.giveKey('exam');
    SaveManager.giveKey('forest');
    expect(SaveManager.keyCount()).toBe(2);
  });
});
