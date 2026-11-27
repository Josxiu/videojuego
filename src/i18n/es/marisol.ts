import type { DreamTexts, Line } from '../types';

export const marisol = {
  title: 'Planos para un Puente',
  owner: 'Ing. Marisol Ortegón · coche 3',
  technique: 'Cianotipia',
  tagline: 'El camino tiene que ser perfecto.',
  acts: ['El taller', 'Fatiga del material', 'Sin tinta'],
  intro: [
    ['marisol', 'Qué pena, no la vi entrar. Estoy revisando unos planos.'],
    [
      'marisol',
      'Puente de San Rafael, sobre el Magdalena. Ciento ochenta metros. Mi primer puente.',
    ],
    ['marisol', 'Tiene una grieta. Si la canica no cruza, es porque yo calculé mal.'],
    ['celeste', '¿Y si cruza?'],
    ['marisol', 'Entonces calculé bien y tuve suerte. Que es casi peor.'],
  ] as Line[],
  outro: [
    ['marisol', 'Esa grieta… no es una grieta. Es la junta de dilatación.'],
    [
      'marisol',
      'La puse yo. Página cuarenta y uno. Para que el puente se pudiera mover con el calor.',
    ],
    ['celeste', '¿Los puentes se mueven?'],
    ['marisol', 'Los buenos sí. Para eso los diseñamos. Qué pena, se me olvidó.'],
  ] as Line[],
  secret: {
    name: 'La casa sobre el puente',
    lines: [
      ['marisol', 'Ese dibujo… lo hice a los ocho años. Una casa encima de un puente.'],
      ['marisol', 'Mi papá lo pegó en la nevera hasta que se puso amarillo.'],
      ['celeste', 'No tiene ni una regla derecha.'],
      ['marisol', 'Y aguantó quince años en una nevera. Mejor que muchos.'],
    ] as Line[],
  },
  tickets: [
    {
      date: '11 de enero de 1996',
      route: 'Bogotá — Honda, con el papá',
      memory: 'Él le mostró el puente Navarro y le dijo que el hierro también se cansa.',
    },
    {
      date: '3 de febrero de 2002',
      route: 'Bogotá — Tunja, primer semestre',
      memory: 'Sacó 2,9 en Estática. Lloró en el baño y repitió el ejercicio cuarenta veces.',
    },
    {
      date: '19 de octubre de 2009',
      route: 'Bogotá — El Banco',
      memory: 'Primera visita a la obra de San Rafael. Los obreros la llamaban «la niña».',
    },
    {
      date: '28 de junio de 2011',
      route: 'El Banco — San Rafael, en chalupa',
      memory: 'Inauguración del puente. No fue a la foto: estaba midiendo las juntas.',
    },
    {
      date: '4 de marzo de 2023',
      route: 'Bogotá, consultorio',
      memory: 'El médico le dijo «estrés». Ella pidió la cifra exacta.',
    },
  ],
  page: 'Marisol diseña puentes y no confía en ninguno que no haya revisado ella misma tres veces. Su papá era maestro de obra y le enseñó que «todo se mueve, mija, hasta lo quieto». Hace quince años firmó su primer puente. Hace una semana le llegó un correo con una foto y la palabra «grieta».',
  madrugada: 'Tienes la mitad de tinta y cada línea aguanta un solo paso de la canica.',
  arrival: {
    base: 'Marisol se baja con el tubo de planos bajo el brazo y se va derecho al puente. Llega con dos horas de sobra.',
    secret:
      'Marisol se baja sin abrir el tubo. Se toma un jugo de corozo en la estación antes de ir al puente.',
  },
};

export const _marisolCheck: DreamTexts = marisol;
