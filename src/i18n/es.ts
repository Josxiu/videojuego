// Todos los textos del juego. Para agregar un idioma: copiar este archivo y traducir.
//
// Premisa: El Entresueño es el cruce por donde pasan los sueños de todos los que
// duermen esta noche en el edificio Girasol. A Iris se le pegaron fragmentos de
// sueños ajenos y no puede volver a su cuerpo mientras cargue con lo que no es suyo.
export const es = {
  // ── Menú ──
  'menu.title': 'DUERMEVELA',
  'menu.subtitle': 'los sueños de este edificio no son todos tuyos',
  'menu.play': 'Dormir',
  'menu.continue': 'Seguir soñando',
  'menu.reset': 'Borrar progreso',
  'menu.resetConfirm': '¿Seguro? Toca otra vez para borrar',
  'menu.credits': 'edificio Girasol, 3:14 a. m.',

  // ── Intro ──
  'intro.1': 'Edificio Girasol. Tercer piso. Tres y cuarto de la mañana.',
  'intro.2': 'Iris lleva once días durmiendo con los audífonos puestos para no oír a los vecinos.',
  'intro.3': 'Hoy se le acabó la batería.',
  'intro.4':
    'Y por primera vez oyó el edificio entero respirando: cuarenta personas dormidas, cuarenta sueños subiendo por los ductos.',
  'intro.5': 'Se durmió con todos encima.',
  'intro.skip': 'tocar para continuar',

  // ── Hub: El Entresueño ──
  'hub.title': 'EL ENTRESUEÑO',
  'hub.interact': 'hablar',
  'hub.enter': 'entrar',
  'hub.locked': 'La puerta no es tuya. Todavía no te deja pasar.',
  'hub.wakeDoorLocked':
    'Tu puerta. Cerrada por dentro, con tres cosas ajenas atoradas en la cerradura.',
  'hub.wakeDoorReady': 'Tu puerta. Ahora sí gira.',

  // Primer encuentro con Morfeo
  'hub.meet.1': 'No toques nada.',
  'hub.meet.2': '¿¡Un gato que habla!?',
  'hub.meet.3':
    'Un gato que trabaja, que es peor. Morfeo, administración de sueños, turno nocturno.',
  'hub.meet.4':
    'Esto es el Entresueño: el tiro de luz por donde suben los sueños del edificio. Tú te dormiste con la ventana abierta, metafóricamente hablando.',
  'hub.meet.5': '¿Y eso qué significa?',
  'hub.meet.6':
    'Que se te pegaron tres sueños que no son tuyos. Del 5º, del 4B y del conserje. Y mientras los cargues, tu cuerpo no te deja volver: no reconoce lo que traes.',
  'hub.meet.7':
    'Entras, devuelves lo que te llevaste, sales. Sin improvisar. Sin conmoverte. Sobre todo, sin conmoverte.',
  'hub.meet.8': '¿Y si me pierdo?',
  'hub.meet.9':
    'Los sueños ajenos tienen reglas ajenas: aprende las suyas, no impongas las tuyas. Ah, y algo importante: allí dentro, la rara eres tú.',

  // Comentarios de Morfeo según progreso
  'hub.morfeo.zero.1':
    'Tres puertas. Tres desconocidos que duermen a diez metros de ti y de los que no sabes ni el nombre.',
  'hub.morfeo.one.1': 'Uno devuelto. ¿Ves? No era tuyo y ya se te nota más ligera.',
  'hub.morfeo.one.2':
    'Cuidado con quedarte a mirar. Los sueños ajenos son cómodos justamente porque no duelen igual.',
  'hub.morfeo.two.1': 'Dos. Vas rápido para alguien que no sabía nada de sus vecinos.',
  'hub.morfeo.two.2':
    'La del 4B lleva meses sin bajar por el correo. Nadie en el edificio lo ha notado. Tú tampoco, hasta hoy.',
  'hub.morfeo.three.1': 'Los tres devueltos. Impecable. Te tocaría despertar.',
  'hub.morfeo.three.2': '«Tocaría». Fíjate en esa palabra. Yo me fijé.',
  'hub.morfeo.fireflies':
    'Llevas {n} luciérnagas. Son restos: pedacitos de sueño que nadie reclamó. El edificio está lleno.',

  // ── Sueño de Don Élmer: El Examen Infinito ──
  'exam.title': 'SUEÑO DEL CONSERJE',
  'exam.name': 'EL EXAMEN INFINITO',
  'exam.intro.1':
    'Don Élmer lleva treinta años barriendo esta escuela y cuarenta soñando que llega tarde al examen.',
  'exam.intro.2': 'Nunca lo presentó: se salió en tercero para trabajar. El sueño no se enteró.',
  'exam.hint': 'toca: saltar · desliza abajo: agacharse',
  'exam.hintKeys': '↑ saltar · ↓ deslizarse',
  'exam.checkpoint': '¡Timbre! Sigue corriendo...',
  'exam.section2': 'El pasillo se estira. En su sueño siempre se estira.',
  'exam.section3': '¡El aula está cerca!',
  'exam.win.1': '*JADEO* ...llegué. Llegué al examen.',
  'exam.win.2': 'La hoja está en blanco. Las dos caras.',
  'exam.win.3':
    'Claro que sí. Nunca supo qué le iban a preguntar: por eso lleva cuarenta años corriendo hacia una hoja vacía.',
  'exam.win.4': 'Entonces no hay examen que aprobar. Solo hay que devolverle esto.',
  'exam.keyGet': 'DEVUELTO: EL GIS DE DON ÉLMER',
  'exam.fragment':
    'Un gis gastado hasta el tamaño de una uña. Lo guardó treinta años en el bolsillo del overol.',
  'exam.fail': 'Tropiezas. El pasillo se alarga un poco más, burlón.',
  'exam.wrong': 'Esa no. El pasillo se estira para darte otra oportunidad.',
  'exam.right': '¡eso sí lo sabe!',
  'exam.score': 'aciertos: {n}/{total}',

  // ── Sueño de Nadia: La Caída Sin Fin ──
  'fall.title': 'SUEÑO DEL 5º',
  'fall.name': 'LA CAÍDA SIN FIN',
  'fall.intro.1': 'Nadia se mudó hace siete meses. Sigue durmiendo entre cajas sin abrir.',
  'fall.intro.2': 'Todas las noches sueña que se cae. Nunca sueña que llega.',
  'fall.hint': 'arrastra el dedo para moverte',
  'fall.hintKeys': '← → para moverte',
  'fall.ring': 'El viento te sostiene un momento...',
  'fall.depth': '{n} m',
  'fall.win.1': '...¿nubes? Esperaba concreto.',
  'fall.win.2': 'Ella también. Por eso lleva siete meses cayendo: quien no desempaca, no aterriza.',
  'fall.win.3': 'Estaba en el fondo, entre las plumas. Lo que se trajo y no ha usado ni una vez.',
  'fall.keyGet': 'DEVUELTO: LA LLAVE DE LA OTRA CASA',
  'fall.fragment':
    'Una llave de una puerta que ya no existe, en una ciudad a la que no piensa volver.',
  'fall.fail': 'El cielo te recoge y te suelta otra vez. A ella le hace lo mismo cada noche.',

  // ── Sueño de la señora del 4B: El Patio de Atrás ──
  'forest.title': 'SUEÑO DEL 4B',
  'forest.name': 'EL PATIO DE ATRÁS',
  'forest.intro.1': 'Doña Chuy tiene ochenta y un años y sueña siempre el mismo patio.',
  'forest.intro.2': 'El de la casa donde creció. Lleva semanas sin encontrar el camino de vuelta.',
  'forest.hint': 'muévete con el joystick · toca ✦ para activar ecos',
  'forest.hintKeys': 'WASD/flechas para moverte · E para activar ecos',
  'forest.echoLocked': 'Ese recuerdo va después. Ella los ordena así, no como tú quieras.',
  'forest.echoWrong': 'Los recuerdos se desordenan. La niebla se cierra un poco.',
  'forest.gateOpen': 'La niebla se abre. Vas por buen camino.',
  // Los tres ecos de memoria (en orden)
  'forest.memory.1':
    'ECO I — Una niña riega macetas con un bote de leche agujerado. Su madre le grita que no encharque. Ella encharca.',
  'forest.memory.2':
    'ECO II — La misma niña, más alta, le enseña a regar a su hijo. El bote es el mismo. El agujero también.',
  'forest.memory.3':
    'ECO III — Una mujer de ochenta y uno riega una maceta en un balcón del 4B. Sola. El bote es el mismo.',
  'forest.heart.1': 'No está perdida, Iris. Sabe perfectamente dónde está.',
  'forest.heart.2': '¿Entonces qué busca?',
  'forest.heart.3':
    'A alguien a quien enseñarle. El patio lo recuerda entero; lo que le falta es alguien al lado.',
  'forest.heart.4':
    'Vive cuatro puertas abajo de la tuya. Cuando despiertes te vas a acordar de esto, y va a ser incómodo.',
  'forest.win.1': 'El patio entero se enciende. Ella encuentra el camino.',
  'forest.keyGet': 'DEVUELTO: EL CAMINO DE VUELTA',
  'forest.fragment': 'Un bote de leche con un agujero, que usó de regadera durante setenta años.',
  'forest.lanternHint':
    'Los faroles guardan el orden de su vida: la niña, la madre, la mujer sola.',

  // ── Pesadilla de Tomás: La Persecución ──
  'chase.title': 'PESADILLA DEL 2A',
  'chase.name': 'LA PERSECUCIÓN',
  'chase.intro.1':
    'Este sueño no estaba en la lista. Es de Tomás, siete años, el que llora de madrugada.',
  'chase.intro.2': 'Y aquí las reglas cambian: aquí tú no vienes a devolver nada.',
  'chase.hint': '◀ ▶ moverte · ✦ esconderte en los armarios',
  'chase.hintKeys': '← → para moverte · E para esconderte',
  'chase.surge': '¡VIENE!',
  'chase.hidden': 'contén la respiración...',
  'chase.caught.1':
    'Te alcanza. El cuarto se reacomoda: en las pesadillas de un niño, los muebles nunca están dos veces en el mismo sitio.',
  'chase.caught.2':
    'Otra vez. Los armarios cambiaron de lugar. Él también los ve cambiar cada noche.',
  'chase.caught.3': 'Ya sabe dónde te escondes. Aprende rápido para tener siete años.',
  'chase.door': 'La puerta no abre. Nunca abre: es su sueño, no el tuyo.',
  'chase.turn': 'dejar de esconderse',
  'chase.reveal.1': 'Iris deja de correr. Se da la vuelta. Levanta las manos.',
  'chase.reveal.2': 'La sombra se detiene a dos metros. Tiembla más que ella.',
  'chase.reveal.3': 'Y entonces entiende de qué tiene forma la sombra.',
  'chase.reveal.4': 'De ella. De una desconocida enorme entrando de noche al cuarto de un niño.',
  'chase.reveal.5': 'La monstrua era yo. Llevo toda la noche huyendo de mí misma vista por él.',
  'chase.reveal.6':
    'Iris se sienta en el suelo para ser más pequeña. Espera. Es lo único que sirve.',
  'chase.reveal.7':
    'La sombra se acerca, la olfatea y se deshace. Al fondo, un niño duerme sin apretar los ojos.',
  'chase.done': 'LA PESADILLA SE DISUELVE',

  // Hub: la puerta de la pesadilla
  'hub.nightmare.appear.1': 'Espera. Esa puerta no estaba.',
  'hub.nightmare.appear.2':
    'Es el 2A. El niño. Su pesadilla se abrió sola porque hay alguien merodeando el edificio por dentro... o sea, tú.',
  'hub.wakeDoorNightmare':
    'Tu puerta gira a medias. Algo la traba desde el otro lado: alguien está soñando contigo.',
  'hub.morfeo.night.1':
    'Ahí dentro no eres visita: eres lo que da miedo. Cuando entiendas eso, sabrás qué hacer.',
  'hub.morfeo.done.1':
    'Te dejaste ver por un niño de siete años y sobreviviste. Administrativamente, eso no lo había visto nunca.',

  // ── Final ──
  'ending.1': 'Las tres cosas ajenas ya no traban la cerradura. Tu puerta gira.',
  'ending.2': 'Un momento. Falta una.',
  'ending.3': '¿Cómo que falta una? Devolví las tres.',
  'ending.4':
    'Las tres ajenas. Queda una que lleva aquí mucho más tiempo y que nadie ha venido a reclamar.',
  'ending.5': 'Al fondo del Entresueño, donde no miraste, hay un sueño tuyo cubierto de polvo.',
  'ending.6':
    'Lo dejaste aquí hace años, cuando decidiste que era más práctico soñar lo que otros esperaban de ti.',
  'ending.7':
    'Este tiro de luz está lleno de sueños que la gente abandona. Yo solo los barro. Es un trabajo bastante triste, si te soy sincero.',
  'ending.8': '¿Y si me lo llevo?',
  'ending.9':
    'Entonces vas a despertar cargando algo. Otra vez. Pero por primera vez va a ser tuyo.',
  'ending.10': 'Iris abrió los ojos a las 6:40.',
  'ending.11':
    'Once días de audífonos y hoy oyó el edificio: el conserje arrastrando el bote, la del 5º moviendo cajas, alguien regando en el 4B.',
  'ending.12': 'A las 7:05 bajó por el correo. Se detuvo en el cuarto piso, puerta B, y tocó.',
  'ending.13': 'Abrió una señora de ochenta y uno con un bote de leche en la mano.',
  'ending.14': '— Buenos días. Soy la del 3. Vengo a que me enseñe a no encharcar.',
  'ending.thanks': 'FIN DEL PROTOTIPO',
  'ending.stats': 'luciérnagas: {n} / {total}',
  'ending.continue': 'quedan treinta y seis puertas en este edificio',

  // ── UI general ──
  'ui.pause': 'PAUSA',
  'ui.resume': 'seguir',
  'ui.exitDream': 'salir del sueño',
  'ui.retry': 'reintentar',
  'ui.tapToContinue': 'toca para continuar',
  'ui.keyCount': 'devueltos',
  'ui.mute': 'sonido',
} as const;

export type TextKey = keyof typeof es;
