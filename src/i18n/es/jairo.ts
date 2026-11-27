import type { DreamTexts, Line } from '../types';

export const jairo = {
  title: 'Salsa en la Sexta',
  owner: 'Jairo «el Mono» Cifuentes · coche 4',
  technique: 'Neón de salsoteca',
  tagline: 'Nunca tocar el piso.',
  acts: ['La Sexta', 'Los letreros se funden', 'Tocar el piso'],
  intro: [
    ['jairo', 'Mirá, vé, la revisora. Bienvenida a la Sexta, mija.'],
    [
      'jairo',
      'Treinta años de tarima en tarima. Nunca toqué el piso: del bus al escenario, del escenario al bus.',
    ],
    ['jairo', 'Esta máquina es mi voz ahora. Suena a radio de taxi, ¿cierto?'],
    ['celeste', 'Suena a usted.'],
    ['jairo', 'Eso dice mi hija. Ella exagera.'],
  ] as Line[],
  outro: [
    ['daniela', '¿Papi? ¿Usted vino?'],
    ['jairo', 'No traje la voz, mija. Traje esto.'],
    ['daniela', 'Esa es la clave de «la de las palmeras». Esa me la sé.'],
    ['jairo', 'Entonces cantala vos. Yo marco.'],
  ] as Line[],
  secret: {
    name: 'El primer disco',
    lines: [
      ['jairo', '¡Mi primer acetato! «La Sabrosura del Valle», 1979. Lo grabamos en una tarde.'],
      ['jairo', 'Se rayó en la tercera canción. Por eso siempre la cantaba en vivo.'],
      ['celeste', '¿Para que nadie oyera el rayón?'],
      ['jairo', 'Para que nadie oyera que el rayón era yo, desafinando.'],
    ] as Line[],
  },
  tickets: [
    {
      date: '25 de diciembre de 1979',
      route: 'Cali — Barranquilla, en bus de la orquesta',
      memory: 'Primer carnaval. Cantó con fiebre y nadie se dio cuenta.',
    },
    {
      date: '14 de agosto de 1988',
      route: 'Cali — Nueva York, en avión',
      memory: 'Cantó en un club del Bronx. Llamó a su mamá desde un teléfono de monedas.',
    },
    {
      date: '2 de junio de 1997',
      route: 'Cali — Buenaventura',
      memory: 'Nació Daniela. Él llegó tres días después, con un peluche de gira.',
    },
    {
      date: '30 de diciembre de 2009',
      route: 'Juanchito — Cali, en moto',
      memory:
        'Última función en la salsoteca Agapito. Se le quebró la voz en el bis y lo aplaudieron más.',
    },
    {
      date: '10 de enero de 2025',
      route: 'Cali, clínica',
      memory: 'Le quitaron la laringe. Daniela le llevó una pizarra para que escribiera.',
    },
  ],
  page: 'Jairo fue sonero de La Sabrosura del Valle durante treinta años y nunca durmió dos noches en la misma ciudad. Hace un año perdió la laringe; ahora habla con un aparato que zumba. Su hija se casa en Santa Marta y le pidió que cantara. Él tiene en el bolsillo un casete viejo para mover la boca encima.',
  madrugada: 'Los letreros se funden desde el primero y el Silencio va más rápido.',
  arrival: {
    base: 'Jairo se baja sin bufanda. En el matrimonio marca la clave en una mesa y doscientas personas cantan por él.',
    secret:
      'Jairo se baja con el acetato rayado bajo el brazo. Lo ponen en el matrimonio, y en el rayón canta todo el mundo.',
  },
};

export const _jairoCheck: DreamTexts = jairo;
