import type { DreamTexts, Line } from '../types';

export const chepe = {
  title: 'La Chiva de la Suerte',
  owner: 'José «Chepe» Rueda · coche 5',
  technique: 'Pintura de chiva',
  tagline: 'Mantener la bola viva.',
  acts: ['La ruta', 'Los agüeros', 'Dejarla caer'],
  intro: [
    ['chepe', '¡Qué hubo, revisora! Súbase, que esta chiva sale llena.'],
    ['chepe', 'Aquí la cosa es fácil, mano: la bola no se cae y uno no pierde.'],
    [
      'chepe',
      'Yo tengo la suerte medida. Calzoncillo amarillo, ruda en el bolsillo, el número de la placa.',
    ],
    ['celeste', '¿Y le ha funcionado?'],
    ['chepe', 'Ahorita es que me va a funcionar. Esa es la gracia.'],
  ] as Line[],
  outro: [
    ['chepe', 'Mano… me jugué la plata del semestre de Laura.'],
    ['chepe', 'Toda. Al 4721. Era la placa de la ambulancia que se llevó a mi papá.'],
    ['celeste', '¿Y su hermano le va a prestar?'],
    ['chepe', 'No le voy a pedir. Le voy a decir a mi mujer. Que es peor, pero es de una vez.'],
  ] as Line[],
  secret: {
    name: 'El billete premiado',
    lines: [
      ['chepe', '¡Ese es! El billete del noventa y ocho. Me gané dos millones.'],
      ['chepe', 'Hice una fiesta de tres días. Invité a toda la ruta Girón.'],
      ['celeste', '¿Y qué le quedó?'],
      [
        'chepe',
        'Un guayabo de una semana y el gusto de ganar. El gusto es lo que no se quita, mano.',
      ],
    ] as Line[],
  },
  tickets: [
    {
      date: '6 de enero de 1985',
      route: 'Bucaramanga — Girón, en chiva',
      memory: 'Su primer día de ayudante. El chofer le enseñó a cobrar sin mirar la plata.',
    },
    {
      date: '31 de diciembre de 1998',
      route: 'Girón — Bucaramanga',
      memory: 'Se ganó el chance. Dos millones de pesos y tres días de fiesta.',
    },
    {
      date: '12 de octubre de 2004',
      route: 'Bucaramanga — San Gil',
      memory:
        'Pidió la mano de Gladys en el Parque Gallineral. Ella dijo que sí antes de la pregunta.',
    },
    {
      date: '7 de febrero de 2006',
      route: 'Bucaramanga, hospital',
      memory: 'Nació Laura. Jugó la hora de nacimiento. No salió.',
    },
    {
      date: '20 de enero de 2026',
      route: 'Bucaramanga, la UIS',
      memory: 'Laura pasó a Medicina. Él lloró en el bus de vuelta y se bajó en la lotería.',
    },
  ],
  page: 'Chepe maneja el bus de la ruta Bucaramanga–Girón desde hace veintiséis años y sabe qué número cae según cómo amanece el cielo. No ha acertado desde 1998. Su hija Laura pasó a Medicina en la UIS; él tenía la plata del semestre en una lata. Ahora tiene la lata.',
  madrugada: 'Dos bolas a la vez y paletas más cortas.',
  arrival: {
    base: 'Chepe se baja y llama a Gladys desde la estación. Habla once minutos. Cuelga, respira, vuelve a llamar.',
    secret:
      'Chepe se baja y bota los agüeros en la caneca de la estación, menos el billete del noventa y ocho. Ese lo enmarca.',
  },
};

export const _chepeCheck: DreamTexts = chepe;
