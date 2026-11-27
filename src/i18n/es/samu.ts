import type { DreamTexts, Line } from '../types';

export const samu = {
  title: 'La Maleta de Plastilina',
  owner: 'Samuel Rentería · coche 2',
  technique: 'Plastilina',
  tagline: 'Todo tiene que caber.',
  acts: ['Lo mío', 'Lo que le gusta a él', 'La maleta que no cierra'],
  intro: [
    ['samu', '¡Revisora! Ayúdeme a empacar, que llegamos y no tengo nada listo.'],
    ['samu', 'Mi papá trabaja en el puerto. Carga contenedores. Con la mano, creo.'],
    ['samu', 'Tiene que caber todo. Si no cabe, se queda. ¿Cierto que sí?'],
    ['celeste', 'Eso dicen las aerolíneas.'],
  ] as Line[],
  outro: [
    ['wilmer', 'Yo… le traje un balón. Y unos guayos. Y una camiseta. Y otro balón.'],
    ['samu', 'Yo le traje la vaca. La hice yo.'],
    ['wilmer', '¿Usted la hizo? Está igualita a una vaca.'],
    ['samu', 'Es una vaca, papá.'],
    ['wilmer', 'Ah, por eso.'],
  ] as Line[],
  secret: {
    name: 'La foto de la vaca',
    lines: [
      ['samu', '¡Muuu! Ja, la vaca tenía algo adentro.'],
      ['samu', 'Es una foto. Un señor cargando un bebé. El bebé está bravo.'],
      ['celeste', 'El bebé eres tú, Samu.'],
      ['samu', 'Entonces el señor es… ah. Tiene la misma risa torcida que yo.'],
    ] as Line[],
  },
  tickets: [
    {
      date: '9 de agosto de 2017',
      route: 'Quibdó — Medellín, en bus',
      memory: 'Se mudaron de noche. Samu tenía nueve meses y vomitó en Carmen de Atrato.',
    },
    {
      date: '24 de diciembre de 2018',
      route: 'Bogotá — Quibdó',
      memory: 'La última Navidad que pasó con su papá. No se acuerda; se lo contaron.',
    },
    {
      date: '15 de julio de 2022',
      route: 'Bogotá — Girardot, paseo del colegio',
      memory: 'Le ganó a todo el curso en la piscina. Nadie le tomó foto.',
    },
    {
      date: '2 de abril de 2024',
      route: 'TransMilenio, portal Suba',
      memory: 'Se perdió una hora. Le dijo a un policía el número de su mamá de memoria.',
    },
    {
      date: 'hoy',
      route: 'Bogotá — Santa Marta, menor no acompañado',
      memory: 'Su mamá le cosió por dentro de la chaqueta el número de su papá.',
    },
  ],
  page: 'Samu tiene nueve años, juega de nueve y se sabe de memoria la tabla de posiciones de un equipo que nunca ha visto jugar. Su papá, Wílmer, es estibador en el puerto de Santa Marta y lo llama los domingos a las ocho. Hablan de fútbol porque es lo único que tienen seguro.',
  madrugada: 'El pito del tren cuenta el tiempo y cada sacudida descoloca una pieza.',
  arrival: {
    base: 'Samu se baja con la maleta medio abierta. Un señor enorme con casco de puerto le hace señas con las dos manos.',
    secret:
      'Samu se baja corriendo. Wílmer se ríe torcido, igualito a la foto, y le pide que le enseñe a hacer vacas.',
  },
};

export const _samuCheck: DreamTexts = samu;
