import type { DreamTexts, Line } from '../types';

export const celeste = {
  title: 'Andén al Amanecer',
  owner: 'Celeste Arango · revisora',
  technique: 'Óleo empastado',
  tagline: 'Siempre el siguiente tren.',
  acts: ['Los once pueblos', 'Los que se quedaron', 'No subirse'],
  intro: [
    ['celeste', 'Ah. Así que esto es dormir.'],
    ['celeste', 'Trenes. Claro que iba a soñar con trenes.'],
    ['celeste', 'Regla de la casa: siempre el siguiente. El que se queda en el andén, pierde.'],
  ] as Line[],
  outro: [
    ['celeste', 'Se fue el tren.'],
    ['celeste', 'Y yo sigo aquí.'],
    ['mecha', 'Celeste. Celeste, mija, despierte. Llegamos.'],
  ] as Line[],
  secret: {
    name: 'La voz del tren de vuelta',
    lines: [
      ['narra', '«¿Ya llegaste, mija? Te dejé tinto en el termo. No te pregunto nada, ¿oíste?»'],
      ['celeste', 'Ma.'],
      ['celeste', 'Todavía no he llegado. Pero ya casi.'],
    ] as Line[],
  },
  tickets: [
    {
      date: '2012',
      route: 'Barrancabermeja — Yondó',
      memory: 'La primera mudanza que recuerda. Se le quedó un perro que se llamaba Tigre.',
    },
    {
      date: '2015',
      route: 'Aguachica — Gamarra',
      memory: 'Su mejor amiga, Yesenia, le dio una manilla. Celeste se fue sin decirle.',
    },
    {
      date: '2017',
      route: 'El Banco — Mompox',
      memory: 'Una profesora la puso a leer en voz alta. A la semana se mudaron.',
    },
    {
      date: '2020',
      route: 'Plato — Fundación',
      memory: 'Encerradas en la pandemia. Aprendió a dormir con los ojos abiertos, de mentiras.',
    },
    {
      date: '2024',
      route: 'Ciénaga — Bogotá, sola',
      memory: 'Se fue sin despedirse de su mamá. Le dejó una nota: «ya te llamo». No la llamó.',
    },
  ],
  page: 'Celeste tiene diecinueve años y once tiquetes en una lata de galletas. Su mamá cocinaba en campamentos petroleros y se mudaba con cada contrato; Celeste aprendió a irse antes de que la dejaran. Hace dos años se fue sola a Bogotá. Su mamá vive en Santa Marta y no sabe que su hija viene en ese tren.',
  madrugada: 'Los trenes van más rápido y los huecos son más anchos.',
  arrival: {
    base: 'Celeste se baja última.',
    secret: 'Celeste se baja y marca un número que se sabe de memoria.',
  },
};

export const _celesteCheck: DreamTexts = celeste;
