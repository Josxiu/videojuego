import type { Line } from '../types';

/** Interfaz, menú, intro, tren, libreta y finales. */
export const core = {
  names: {
    celeste: 'Celeste',
    mecha: 'Mecha',
    abel: 'Abel',
    reme: 'Doña Reme',
    samu: 'Samu',
    marisol: 'Marisol',
    jairo: 'Jairo',
    chepe: 'Chepe',
    efrain: 'Don Efraín',
    wilmer: 'Wílmer',
    daniela: 'Daniela',
    carmenza: 'Carmenza',
    yolima: 'Yolima',
    ananias: 'Ananías',
    altavoz: 'Altavoz',
    jefe: 'Jefe de estación',
    narra: '',
  },
  ui: {
    title: 'TRASNOCHO',
    subtitle: 'el último tren de la noche',
    play: 'Abordar',
    continue: 'Seguir el viaje',
    newGame: 'Viaje nuevo',
    libreta: 'Libreta',
    sound: 'Sonido',
    on: 'sí',
    off: 'no',
    calm: 'Menos sacudidas',
    confirmNew: '¿Empezar de cero? Se borra el viaje guardado.',
    yes: 'Sí, de cero',
    no: 'Mejor no',
    pause: 'Pausa',
    resume: 'Seguir',
    restart: 'Repetir sueño',
    exitDream: 'Volver al tren',
    tap: 'toca',
    tapToContinue: 'toca para seguir',
    holdToSkip: 'mantén para saltar',
    tickets: 'Tiquetes',
    ticketFound: 'Tiquete viejo',
    secretFound: 'Secreto',
    madrugada: 'Madrugada',
    madrugadaDone: 'Madrugada superada',
    madrugadaOffer: '¿Entrar en Madrugada?',
    madrugadaNormal: 'Sueño normal',
    stampArrival: 'LLEGADA',
    act: 'Acto {n}',
    loading: 'cargando la maqueta…',
    rotate: 'Gira el celular',
    punchPrompt: 'Picar el tiquete',
    replay: 'Volver a soñar',
    locked: 'Todavía no',
    back: 'Volver',
    retry: 'Otra vez',
    hint: 'pista',
    credits: 'Créditos',
    endTitle: 'Fin del viaje',
    endingName: 'Final: {name}',
    stats: '{t} de 40 tiquetes · {s} de 8 secretos · {m} madrugadas',
    toMenu: 'Volver al andén',
    backToChoice: 'Volver a la cabina',
  },

  menuFooter: 'Bogotá — Santa Marta · Nocturno 14 · Último servicio',

  intro: {
    cards: {
      station: 'Estación de la Sabana · 7:02 p. m.',
      depart: '7:10 p. m. · Sale El Lucero por última vez',
      night: 'Puerto Berrío · 1:31 a. m.',
      tunnel: 'Túnel de La Sierpe · 2:47 a. m.',
    },
    jefe: [
      ['jefe', '¿Usted es la de reemplazo? ¿Arango?'],
      ['celeste', 'Celeste. Por una noche.'],
      ['jefe', 'Una noche es lo que le queda a este tren. Tenga la ponchadora: pica, no rompe.'],
      ['jefe', 'Y no le hable al maquinista. Abel no se baja en Santa Marta hace doce años.'],
      ['celeste', 'Listo. No me bajo, no hablo, pico.'],
    ] as Line[],
    boarding: {
      reme: [
        ['reme', "Buenas noches, sumercé. ¿Este es el que va pa'l mar?"],
        ['celeste', 'Este va para Santa Marta. Su tiquete está al revés, señora.'],
        ['reme', 'Ay, es que lo imprimen muy chiquito. ¿No quiere una almojábana?'],
      ] as Line[],
      samu: [
        ['samu', 'Menor no acompañado. Aquí dice. ¿Cierto que sí?'],
        ['samu', '¿Usted sabe cuántos goles lleva el Unión Magdalena este año?'],
        ['celeste', 'Ni idea.'],
        ['samu', 'Yo tampoco. Por eso pregunto. Mi papá sí sabe, creo.'],
      ] as Line[],
      marisol: [
        ['marisol', 'Qué pena, ¿el coche tres queda a favor o en contra de la marcha?'],
        ['celeste', 'Queda en el coche tres.'],
        ['marisol', 'Perfecto. Gracias. Cuidado con el tubo, que son planos.'],
      ] as Line[],
      jairo: [
        ['jairo', 'Mirá, vé… coche cuatro.'],
        ['celeste', 'Va a sudar con esa bufanda en Santa Marta.'],
        ['jairo', "La bufanda no es pa'l frío, mija."],
      ] as Line[],
      chepe: [
        ['chepe', '¿Coche cinco? Ah, mano, el cinco es buen agüero.'],
        ['chepe', 'Píquemelo por la esquina de abajo, que la de arriba es la de la suerte.'],
        ['celeste', 'Se pica donde dice «pica».'],
        ['chepe', 'Usted no es de por aquí, ¿cierto?'],
      ] as Line[],
      abel: [
        ['abel', '¿Usted es la nueva? Tranquila, mija.'],
        ['abel', 'Esta noche no se acaba.'],
      ] as Line[],
    },
    night: [
      ['celeste', 'Uno, dos, tres, cuatro, cinco. Todos dormidos.'],
      ['celeste', 'Once pueblos y nunca he dormido en un bus. Esto no va a ser la excepción.'],
    ] as Line[],
    tunnel: [
      ['mecha', '¡Ajá! ¿Y usted por qué está despierta?'],
      ['celeste', '…¿La farola habla?'],
      [
        'mecha',
        'Hablo cuando hay alguien despierto, que es nunca. Mire debajo de la puerta del uno.',
      ],
      ['mecha', 'Los están soñando. Y el reloj se paró a las tres menos trece.'],
      ['mecha', 'Este túnel se traga los trenes que no quieren llegar, mija. Yo ya estuve en uno.'],
      ['celeste', 'Todos los trenes llegan.'],
      ['mecha', 'Eso dice el horario. Saque la ponchadora y descuélgueme, que esto es largo.'],
    ] as Line[],
  },

  train: {
    coachNames: [
      'Coche 1',
      'Coche 2',
      'Coche 3',
      'Comedor',
      'Coche 4',
      'Coche 5',
      'Coche 6',
      'Furgón',
      'Locomotora',
    ],
    firstVisit: [
      ['mecha', 'Píquele el tiquete a la señora del uno. El huequito es la puerta.'],
      ['celeste', '¿Y si no quiero meterme en sueños ajenos?'],
      ['mecha', 'Se queda aquí conmigo, en las tres menos trece, para siempre. Usted verá.'],
      ['celeste', 'Listo. El uno.'],
    ] as Line[],
    howTo: 'Toca donde quieras ir · toca una puerta para entrar',
    locked: {
      door2: [['mecha', 'Esa puerta la cerró el maquinista. Primero los de este lado.']] as Line[],
      loco: [['mecha', 'A la locomotora no se entra sin que él quiera.']] as Line[],
      celeste: [['mecha', 'Ese camarote es el suyo. Todavía no le toca dormir.']] as Line[],
    },
    look: {
      reme: 'Doña Reme duerme abrazada al costal. Debajo de la puerta se cuelan puntitos de color.',
      samu: 'Samu duerme con los guayos puestos. Por debajo de la puerta sale olor a plastilina.',
      marisol:
        'La ingeniera duerme sentada, con el tubo de planos en las rodillas. La rendija brilla azul.',
      jairo: 'Jairo duerme con la bufanda subida. Por la rendija entra un zumbido de neón.',
      chepe: 'Chepe duerme con una mano en cada bolsillo. Se oyen campanitas de feria.',
      efrain:
        'Un señor que no está en la lista duerme en el coche seis. Por la rendija corre agua de plata.',
      abel: 'Abel, de espaldas, con la mano en el freno. Allá adelante cuelga una luz roja.',
    },
    doneLook: {
      reme: 'Doña Reme sonríe dormida. Afuera de la puerta quedó una olla de barro.',
      samu: 'Samu ronca. Un balón de plastilina rueda por el pasillo.',
      marisol: 'La ingeniera se quitó los zapatos. En la puerta, una escuadra.',
      jairo: 'Jairo se bajó la bufanda. En la puerta, unas maracas.',
      chepe: 'Chepe duerme con las manos fuera de los bolsillos. En la puerta, una estampita.',
      efrain: 'Don Efraín duerme con el pañuelo en el pecho. En la puerta, un pescadito de plata.',
      abel: 'El reloj de la cabina vuelve a andar.',
    },
    afterDream: {
      reme: [
        ['mecha', 'Ya duerme como gente. ¿Vio el reloj del pasillo? Se movió.'],
        [
          'mecha',
          'Esa señora se va a vivir donde el hijo. Lleva tres días practicando cómo decir que ve bien.',
        ],
      ] as Line[],
      samu: [
        [
          'mecha',
          'El pelado viaja solo desde Bogotá. La mamá le cosió el número del papá en la chaqueta.',
        ],
        ['celeste', 'Por dentro, para que no se vea.'],
      ] as Line[],
      marisol: [
        ['mecha', 'La ingeniera trae un plano por coche. Ya revisó los rieles dos veces.'],
        ['celeste', 'Y el reloj otra vez. Listo, van tres.'],
      ] as Line[],
      jairo: [
        [
          'mecha',
          'En el setenta y nueve ese señor cantó en el carnaval. Yo iba colgada en el furgón; lo oí.',
        ],
      ] as Line[],
      chepe: [
        ['mecha', 'Ese hombre le reza a cuatro santos y a dos números. Ojalá le alcance con uno.'],
      ] as Line[],
      efrain: [
        [
          'mecha',
          'La esposa ya llamó a la policía de tres pueblos. Va a ver que lo encuentran en el andén.',
        ],
      ] as Line[],
    },
    abelReveal: [
      [
        'altavoz',
        'Señores pasajeros, les habla el maquinista. Sigan durmiendo. No hay ninguna novedad.',
      ],
      ['abel', 'Siéntese, revisora. ¿Un tinto? Está frío, pero es tinto.'],
      ['celeste', 'Usted paró el reloj.'],
      [
        'abel',
        'A las tres menos trece. A esa hora no hay nada abierto, ¿sí me entiende? Nadie llega a nada.',
      ],
      ['celeste', 'La gente tiene que llegar.'],
      [
        'abel',
        '¿Para qué? La señora va para un ancianato con nombre de hotel. El pelado, donde un desconocido.',
      ],
      ['abel', 'Yo los llevo dormidos. Nadie llega, nadie pierde.'],
      ['celeste', 'Y usted no se baja.'],
      ['abel', 'Treinta y ocho años sin bajarme en Santa Marta. No me ha hecho falta.'],
      ['abel', '¿Y usted, Celeste? ¿Cuántos pueblos lleva?'],
      ['celeste', '…Once.'],
      ['abel', 'Ahí está. Usted entiende el tren mejor que nadie.'],
      [
        'abel',
        'Vaya, despierte a los del cuatro, el cinco y el seis, si puede. Va a ver que ninguno quiere llegar.',
      ],
      ['mecha', 'Ese hombre maneja mejor de lo que habla. Y habla bonito.'],
    ] as Line[],
    announcements: [
      'Próxima estación: ninguna.',
      'El coche comedor permanecerá abierto toda la noche. Toda.',
      'Se recuerda a los señores pasajeros que el que duerme no se marea.',
      'Hora oficial del tren: tres menos trece. Ajusten sus relojes.',
      'Les habla el maquinista. Afuera está lloviendo. Mejor quedarse.',
    ],
    efrainTicket: [
      ['celeste', 'Señor, ¿su tiquete?'],
      ['efrain', 'Carmenza… ya voy, ya voy, no me apure.'],
      [
        'mecha',
        'Ese no tiene tiquete. Se subió en Gamarra cuando paramos por agua. Nadie lo vio, sino yo.',
      ],
      ['celeste', 'Sin tiquete no hay hueco.'],
      ['mecha', 'Usted carga once en esa lata.'],
      ['celeste', 'El primero es de Barranca. Tenía cinco años y mi mamá lloró todo el camino.'],
      ['celeste', 'Listo. Que le sirva a alguien.'],
    ] as Line[],
    mechaConfession: [
      ['mecha', 'Celeste… el vidrio rojo. El que está colgado allá afuera, a la salida del túnel.'],
      ['mecha', 'Yo se lo di.'],
      ['celeste', '¿Usted?'],
      [
        'mecha',
        'Mañana me ponen en la vitrina de un museo, si tengo suerte. Si no, a la chatarra con los coches.',
      ],
      [
        'mecha',
        'Pensé que si la noche no se acababa, yo tampoco. Pero sin rojo no le puedo decir que no a nadie.',
      ],
      ['mecha', 'Ni a él.'],
      ['celeste', 'Listo. Vamos a la locomotora.'],
      ['mecha', 'Lléveme en la mano. A usted no le abre. A mí sí.'],
    ] as Line[],
    abelCab: [
      ['abel', 'Llegó la revisora. ¿Viene a picarme el tiquete?'],
      ['celeste', 'El carné.'],
      ['abel', 'Treinta y ocho años de carné. Píquelo, a ver qué encuentra.'],
    ] as Line[],
    beforeCeleste: [
      ['mecha', 'Salimos, mija. Ya se ve el cielo gris por la ventana.'],
      ['mecha', "Cuarenta minutos pa' Santa Marta. Duérmase, que se lo ganó."],
      ['celeste', 'Yo no duermo en trenes.'],
      [
        'mecha',
        'Usted no ha dormido en nada desde los cinco años. Cierre los ojos. Yo la despierto.',
      ],
    ] as Line[],
  },

  abelChoice: {
    lead: [
      ['abel', 'Ahí estaba la estación. Ni me acordaba de que tenía andén.'],
      [
        'abel',
        'Yolima va a estar ahí, ¿sabe? Nelly me lo escribió en una carta que no abrí hasta hoy.',
      ],
      ['abel', 'Si yo me bajo, ¿usted qué hace, Celeste?'],
    ] as Line[],
    options: {
      bajar: 'Me bajo con usted. Lo acompaño hasta el andén.',
      solo: 'Bájese usted. Yo sigo para otro lado.',
      quedarse: 'Me quedo en el tren. Con usted. Que no amanezca.',
    },
    after: {
      bajar: [
        ['abel', 'Entonces suelte la luz roja, Mecha. Que se vea el gris.'],
        ['mecha', '¡Ajá! ¡Por fin! Ya me estaba oxidando de decir que sí.'],
      ] as Line[],
      solo: [
        ['abel', 'Uno siempre va solo en la cabina, mija. Pero listo. Que amanezca.'],
        ['mecha', 'Suelto el rojo. No es lo que yo quería, pero amanece igual.'],
      ] as Line[],
      quedarse: [
        ['abel', 'Entonces nadie llega.'],
        ['mecha', '…Celeste.'],
      ] as Line[],
    },
  },

  libreta: {
    title: 'Libreta de la revisora',
    lockedPage: 'Todavía no conoces a este pasajero.',
    ticketsOf: '{n} de 5 tiquetes',
    secretYes: 'Secreto: {name}',
    secretNo: 'Secreto: ¿?',
    missing: 'Falta un tiquete.',
    replay: 'Soñar otra vez',
    madrugada: 'Madrugada',
  },

  endings: {
    names: {
      via_muerta: 'Vía muerta',
      cada_quien: 'Cada quien a lo suyo',
      anden_lleno: 'Andén lleno',
      trasnocho: 'Trasnocho',
    },
    via_muerta: [
      'El Lucero sigue dando vueltas en La Sierpe. Adentro son las tres menos trece.',
      'Afuera amaneció hace once años. Los de Chiriguaná dicen que a veces se oye un pito en el monte.',
      'Celeste revisa los mismos cinco tiquetes cada noche. Ya no los pica: no hay a dónde.',
    ],
    arriveCard: 'Santa Marta · 6:50 a. m.',
    cada_quien: {
      abel: 'Abel se queda en la cabina hasta que llegan los del desguace. Les explica los frenos.',
      celeste: 'Celeste compra un tiquete de bus a Riohacha y lo guarda en la lata. Van doce.',
      close: 'Doce pueblos. Ninguno con desayuno.',
    },
    anden_lleno: {
      abel: 'Abel se baja con la gorra en la mano. Yolima lo mira un rato largo y le recibe el morral.',
      abelSecret:
        'Yolima trae a un niño de seis años. Se llama Abel, como el abuelo que nunca había visto.',
      celeste:
        'Celeste llama desde el teléfono de la estación: «Ma, estoy en Santa Marta. ¿Tiene tinto?»',
      close: 'La lata queda con once tiquetes. El doce no hizo falta.',
    },
    trasnocho: {
      card: 'Un año después',
      abel: 'La locomotora del Lucero quedó de monumento en la estación. Abel la limpia los domingos con su nieto.',
      mecha:
        'Mecha alumbra en una vitrina con sus tres vidrios. Le dejan el rojo encendido de noche, por si acaso.',
      celeste:
        'Celeste es guía del museo del ferrocarril. Lleva un año en el mismo pueblo y duerme como una piedra.',
      close: 'Cada aniversario vuelven todos. Nadie trae tiquete.',
    },
    madrugadaLine: '{n} madrugadas superadas. Celeste las tiene marcadas con sello dorado.',
  },

  credits: [
    'TRASNOCHO',
    'Historia, diseño, programación, arte y música por código',
    'hechos con Claude Code a partir del plan maestro',
    'Tipografías libres (SIL OFL): Big Shoulders Display, Atkinson Hyperlegible,',
    'Monoton, Yellowtail, Sancreek, Fredoka, Architects Daughter,',
    'Cinzel Decorative, Fraunces, Cormorant Garamond',
    'Motor: Phaser 3 · 3D: three.js',
    'A todos los trenes de pasajeros que ya no pasan.',
  ],
};
