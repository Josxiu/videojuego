import type { DreamTexts, Line } from '../types';

export const reme = {
  title: 'La Finca de los Puntos',
  owner: 'Doña Remedios Cárdenas · coche 1',
  technique: 'Puntillismo',
  tagline: 'Para encontrar, hay que mirar.',
  acts: ['La cocina', 'El viento', 'Lo que suena'],
  intro: [
    ['reme', '¿Sumercé es la del tren? Siga, siga, que está haciendo frío.'],
    [
      'reme',
      'Me tengo que llevar lo importante en un solo costal. El hijo dice que allá hay de todo.',
    ],
    [
      'reme',
      'Ayúdeme a encontrar las cosas, que con esta luz no distingo. Es la luz, ¿oyó? No son los ojos.',
    ],
    ['celeste', 'Listo. ¿Qué es lo primero?'],
  ] as Line[],
  outro: [
    ['reme', '¿Oye eso, sumercé? Así suena el maizal cuando hace viento.'],
    ['celeste', 'Eso es el mar, doña Reme.'],
    ['reme', 'Ya sé, mija. Por eso no me voy a perder.'],
    ['reme', 'Dígale a mi hijo que ya no veo bien. Pero dígaselo después del desayuno.'],
  ] as Line[],
  secret: {
    name: 'Las gafas en el azúcar',
    lines: [
      ['reme', '¡Ay, mis gafas! Las escondí en el azúcar. Las gafas son de viejas, mija.'],
      ['celeste', 'Usted tiene setenta y nueve años.'],
      ['reme', 'Por dentro tengo cuarenta. Póngamelas un ratico, que quiero ver la cocina entera.'],
    ] as Line[],
  },
  tickets: [
    {
      date: '14 de mayo de 1961',
      route: 'Ventaquemada — Tunja, en bus de escalera',
      memory: 'El día que conoció a Ananías. Él le pagó el pasaje porque ella se lo pidió.',
    },
    {
      date: '2 de febrero de 1968',
      route: 'Tunja — Chiquinquirá',
      memory: 'Fueron a pedir por el primer hijo. Llegó a los once meses, gordo y bravo.',
    },
    {
      date: '20 de julio de 1974',
      route: 'Ventaquemada — Bogotá',
      memory: 'La primera vez que vio un edificio de diez pisos. Le dio vértigo mirarlo.',
    },
    {
      date: '8 de diciembre de 1999',
      route: 'Tunja — Villa de Leyva',
      memory: 'Velitas con los nietos. Fue la última vez que bailó con Ananías.',
    },
    {
      date: '3 de marzo de 2019',
      route: 'Ventaquemada — Tunja, al oculista',
      memory: 'No entró. Se tomó un tinto en la plaza y le dijo al hijo que todo estaba bien.',
    },
  ],
  page: 'Doña Reme crió cuatro hijos y treinta gallinas en una finca de Ventaquemada. Lleva dos años viendo el centro de las cosas deshecho en puntos y sigue enhebrando agujas de memoria. Su hijo mayor trabaja en Santa Marta y le arregló un cuarto con ventilador. Ella nunca ha visto el mar.',
  madrugada: 'La lupa es la mitad y los puntos se vuelan desde el principio.',
  arrival: {
    base: 'Doña Reme se baja agarrada del brazo de su hijo. Le pide que la lleve primero al mar, no a la casa.',
    secret:
      'Doña Reme se baja con las gafas puestas. Le dice a su hijo que ve regular, y que le compre un radio.',
  },
  // ----- Propios de este sueño -----
  items: {
    olla: {
      name: 'la olla de barro',
      line: 'En esa olla hice la mazamorra de cincuenta años. Sabe a humo, como debe ser.',
    },
    radio: {
      name: 'el radio',
      line: 'Ananías lo prendía para oír las noticias y se dormía en la segunda.',
    },
    santo: {
      name: 'el San Isidro',
      line: 'San Isidro Labrador: quita el agua y pon el sol. Allá dicen que sol sobra.',
    },
    foto: {
      name: 'la foto del matrimonio',
      line: 'Mire qué flaco era. Y yo con ese peinado, Dios mío.',
    },
    taza: {
      name: 'la taza del tinto',
      line: 'Desportillada desde el ochenta. Por ese lado no se toma.',
    },
    ruana: { name: 'la ruana de Ananías', line: '' },
    reloj: {
      name: 'el reloj de pared',
      line: 'Se atrasa cinco minutos. Así llegaba a todo puntual.',
    },
    gallina: {
      name: 'la Coqueta',
      line: 'La gallina más vieja de Boyacá. Que se la quede la vecina, pero que se despida.',
    },
    llaves: { name: 'las llaves de la casa', line: 'Ya no abren nada mío. Igual me las llevo.' },
    mar: { name: 'el mar', line: '' },
  },
  ask: '¿Me encuentra {item}?',
  found: 'Eso, eso.',
  wrong: [
    'Eso no, mija. Eso es otra cosa.',
    'Mire bien, que yo no puedo.',
    'Esa no es. ¿Sí ve? Es la luz.',
  ],
  act2: [
    ['reme', '¿Quién abrió la ventana? Se me están volando las cosas.'],
    ['reme', 'Búsqueme la ruana de Ananías. Esa sí no la dejo.'],
  ] as Line[],
  ananias: [
    ['ananias', 'Remedios. Siempre tan enruanada.'],
    ['reme', 'Ananías… ¿Usted qué hace aquí? Usted está muerto hace ocho años.'],
    ['ananias', 'Vine a cargar el costal. No lo deje caer, que la ruana pesa.'],
  ] as Line[],
  ananiasGo: [
    ['ananias', "Hasta aquí la acompaño. De aquí pa'llá es tierra caliente y yo soy de páramo."],
    ['reme', 'Váyase, pues. Pero despacio.'],
  ] as Line[],
  ananiasLost: 'Ananías se deshace en puntos. Vuelve a buscarlo.',
  act3: [
    ['reme', 'Se rompió la lupa, mija. Ahora estamos iguales las dos.'],
    ['reme', 'No mire. Oiga. Las cosas de uno suenan.'],
  ] as Line[],
  listen: 'Escucha. Toca donde suene.',
  seaAsk: 'Ya solo falta una cosa, sumercé. La que nunca he visto.',
  hintLens: 'Arrastra la lupa · toca para recoger',
  costal: 'En el costal:',
};

// Comprobación de tipo: el sueño cumple la forma común.
export const _remeCheck: DreamTexts = reme;
