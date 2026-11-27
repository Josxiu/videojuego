import type { DreamTexts, Line } from '../types';

export const efrain = {
  title: 'El Río de Plata',
  owner: 'Don Efraín Ballestas · coche 6',
  technique: 'Filigrana de plata',
  tagline: 'Todo río va para abajo.',
  acts: ['El brazo de Mompox', 'Los brazos del río', 'Contra la corriente'],
  intro: [
    ['efrain', 'Carmenza, ¿eres tú? Ah, no. Disculpe, niña. Con esta luz…'],
    ['efrain', 'Voy para Santa Marta a pedir una mano. Llevo los topitos en el pañuelo.'],
    ['efrain', 'Es mil novecientos setenta y uno, ¿no? El río está alto.'],
    ['celeste', 'El río está alto, don Efraín.'],
  ] as Line[],
  outro: [
    ['carmenza', 'Efraín Ballestas. Cincuenta años y todavía te me escapas.'],
    ['efrain', 'Usted tiene mis topitos. Esos los hice yo, en el setenta y uno.'],
    ['carmenza', 'Me los diste en la albarrada. Me pediste que me casara contigo.'],
    ['efrain', '¿Y qué me dijo?'],
    ['carmenza', "Que ya. Que ya me había casado. Vamos pa' la casa, viejo."],
  ] as Line[],
  secret: {
    name: 'El primer pescadito',
    lines: [
      ['efrain', 'Mi taller. Y ese es mi primer pescadito. Doce años tenía.'],
      ['efrain', 'Le salió torcida la cola. Mi papá dijo que así nadaba mejor.'],
      ['celeste', '¿Se acuerda de eso?'],
      ['efrain', 'De eso sí, niña. Las manos se acuerdan solas.'],
    ] as Line[],
  },
  tickets: [
    {
      date: '18 de marzo de 1962',
      route: 'Mompox — Magangué, en champán',
      memory: 'Fue a vender su primera pieza. Se la cambiaron por un bocachico.',
    },
    {
      date: '29 de junio de 1971',
      route: 'Mompox — Santa Marta',
      memory: 'Fue a buscar a Carmenza, que estaba donde una tía. Le llevaba unos topitos.',
    },
    {
      date: '15 de octubre de 1980',
      route: 'Mompox — Cartagena',
      memory: 'Vendió un collar en el centro. Con eso pagaron el techo nuevo.',
    },
    {
      date: '2 de febrero de 1995',
      route: 'Mompox, procesión de la Candelaria',
      memory: 'Su hija Ruth cargó el paso por primera vez. Él lloró y dijo que era el humo.',
    },
    {
      date: '20 de noviembre de 2026',
      route: 'Mompox — Gamarra, sin tiquete',
      memory:
        'Salió a comprar pan. Llegó a la estación de Gamarra preguntando por el tren de 1971.',
    },
  ],
  page: 'Don Efraín hizo filigrana de plata en Mompox durante sesenta años: hilos más finos que un pelo, enroscados a mano. Ahora se le enredan los años como se le enredaba el hilo de joven. Salió a comprar pan y apareció en Gamarra. Carmenza, su esposa, lleva dos días llamando a la policía de tres pueblos.',
  madrugada: 'La corriente es más fuerte y hay más remolinos.',
  arrival: {
    base: 'En el andén de Santa Marta espera una sobrina de Carmenza con una foto de Efraín. Él la saluda como si la conociera. La conoce.',
    secret:
      'Don Efraín se baja con el pescadito de cola torcida en el bolsillo. Le dice a la sobrina que nada mejor así.',
  },
};

export const _efrainCheck: DreamTexts = efrain;
