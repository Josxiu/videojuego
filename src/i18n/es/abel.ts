import type { DreamTexts, Line } from '../types';

export const abel = {
  title: 'La Maqueta',
  owner: 'Abel Ruano · locomotora',
  technique: 'Maqueta en 3D',
  tagline: 'El tren nunca para.',
  acts: ['Las estaciones', 'Lo que desarman', 'Frenar'],
  intro: [
    [
      'abel',
      'Mi papá y yo la armamos en el patio de Puerto Berrío. Cuarenta metros de vía, en tablitas.',
    ],
    [
      'abel',
      'Usted cambia las agujas. El tren va solo. La única regla, ¿sí me entiende?, es que no pare.',
    ],
    ['celeste', '¿Y si para?'],
    ['abel', 'Nunca ha parado.'],
  ] as Line[],
  outro: [
    ['abel', 'Paró.'],
    [
      'abel',
      'Treinta y ocho años y no sabía que la maqueta tenía andén en Santa Marta. Lo hizo mi papá.',
    ],
    ['abel', 'Con una muñequita en la punta. Yo pensaba que era mi mamá.'],
    ['celeste', '¿Y quién es?'],
    [
      'abel',
      'Tiene el pelo de Nelly y los ojos bravos de Yolima. Es la que espera, mija. Siempre hubo una.',
    ],
  ] as Line[],
  secret: {
    name: 'La voz del tanque de agua',
    lines: [
      ['abel', 'Esa es la voz de mi papá. «Frenar también es manejar, Abelito.»'],
      ['abel', 'Me lo decía cada vez que yo quería ir más rápido.'],
      ['celeste', '¿Y le hizo caso?'],
      ['abel', 'Treinta y ocho años sin frenar donde tocaba. No, mija.'],
    ] as Line[],
  },
  tickets: [
    {
      date: '12 de octubre de 1971',
      route: 'Puerto Berrío — Barrancabermeja, en la cabina',
      memory: 'Su papá lo dejó tocar el pito. Tenía nueve años.',
    },
    {
      date: '3 de mayo de 1988',
      route: 'La Dorada — Bogotá',
      memory: 'Conoció a Nelly vendiendo almojábanas en el andén. Le compró veinte para hablarle.',
    },
    {
      date: '17 de septiembre de 1991',
      route: 'Barrancabermeja — Santa Marta',
      memory: 'Nació Yolima. Él llegó en el tren de carga, lleno de carbón.',
    },
    {
      date: '22 de abril de 2014',
      route: 'Gamarra — Chiriguaná',
      memory: 'El día del entierro de Nelly. Iba manejando. No había reemplazo, dijo.',
    },
    {
      date: 'esta noche',
      route: 'Bogotá — Santa Marta, último servicio',
      memory: 'En el bolsillo de la camisa, una carta de Nelly sin abrir desde hace doce años.',
    },
  ],
  page: 'Abel aprendió a manejar en la locomotora de su papá y nunca quiso otra cosa. Treinta y ocho años en El Lucero, ni una falta. Cuando murió Nelly él iba manejando, y Yolima no se lo perdonó. Desde entonces duerme en la cabina y se devuelve. Mañana no hay vuelta.',
  madrugada: 'El tren de juguete va más rápido y hay más trenes fantasma.',
  arrival: {
    base: 'Abel se baja último, con la gorra en la mano.',
    secret:
      'Abel le enseña a su nieto a frenar en la maqueta. «Frenar también es manejar», le dice.',
  },
};

export const _abelCheck: DreamTexts = abel;
