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
  'intro.1': 'Edificio Girasol. Tres y catorce de la mañana.',
  'intro.2': 'Iris, la del 3, lleva once días durmiendo con audífonos para no oír a los vecinos.',
  'intro.3': 'Hoy se le acabó la batería.',
  'intro.4':
    'Y por primera vez oyó el edificio entero respirando: cuarenta personas dormidas, cuarenta sueños subiendo por el tiro de luz.',
  'intro.5': 'Tres se le quedaron pegados.',
  'intro.6': 'Se durmió con todos encima.',
  'intro.skip': 'tocar para continuar',

  // ── Hub: El Entresueño ──
  'hub.title': 'EL ENTRESUEÑO',
  'hub.interact': 'hablar',
  'hub.enter': 'entrar',
  'hub.desk': 'ADMINISTRACIÓN DE SUEÑOS · TURNO NOCTURNO',
  'hub.door.exam': 'CONSERJERÍA',
  'hub.door.fall': '5º',
  'hub.door.forest': '4B',
  'hub.door.chase': '2A',
  'hub.door.wake': '3',
  'hub.door.own': '¿?',
  'hub.wakeDoorLocked':
    'Tu puerta. Cerrada por dentro, con tres cosas ajenas atoradas en la cerradura.',
  'hub.wakeDoorNightmare':
    'Tu puerta gira a medias. Algo la traba desde el otro lado: alguien está soñando contigo.',
  'hub.wakeDoorOwn': 'Tu puerta espera. Pero todavía falta uno: el que llevas años sin reclamar.',

  // Primer encuentro con Morfeo
  'hub.meet.1': 'No toques nada.',
  'hub.meet.2': '¿¡Un gato que habla!?',
  'hub.meet.3':
    'Un gato que trabaja, que es peor. Morfeo, administración de sueños, turno nocturno.',
  'hub.meet.4':
    'Esto es el Entresueño: el tiro de luz por donde suben los sueños del edificio. Tú te dormiste con la ventana abierta, metafóricamente hablando.',
  'hub.meet.5': '¿Y eso qué significa?',
  'hub.meet.6':
    'Que se te pegaron tres sueños que no son tuyos. Del conserje, del 5º y del 4B. Y mientras los cargues, tu cuerpo no te deja volver: no reconoce lo que traes.',
  'hub.meet.7':
    'Entras, devuelves lo que te llevaste, sales. Sin improvisar. Sin conmoverte. Sobre todo, sin conmoverte.',
  'hub.meet.8': '¿Y si me pierdo?',
  'hub.meet.9':
    'Cada sueño está dibujado con lo que su dueño tiene a la mano: gis, cartón, acuarela. Aprende sus reglas; no impongas las tuyas. Y allí dentro, la rara eres tú.',

  // Comentarios de Morfeo según progreso
  'hub.morfeo.zero.1':
    'Tres puertas. Tres desconocidos que duermen a diez metros de ti y de los que no sabes ni el nombre.',
  'hub.morfeo.zero.2': 'Empieza por abajo, si quieres. El conserje lleva cuarenta años esperando.',
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
  'hub.morfeo.own.1': 'Al fondo, donde no miraste. Lleva años juntando polvo. Ya es hora.',
  'hub.morfeo.end.1':
    'Ya puedes despertar. Administrativamente, este ha sido el turno más raro de mi carrera.',
  'hub.morfeo.end.2': 'Si oyes un gato en el tiro de luz, no le hables. No le gusta que le hablen.',

  // ── Sueño de Don Élmer: El Examen Infinito (gis sobre pizarrón) ──
  'exam.title': 'SUEÑO DE LA CONSERJERÍA',
  'exam.name': 'EL EXAMEN INFINITO',
  'exam.intro.1':
    'Don Élmer es el conserje del Girasol desde hace treinta años. Y desde hace cuarenta sueña que llega tarde a un examen.',
  'exam.intro.2': 'Dejó la escuela en tercero para ponerse a trabajar. El sueño nunca se enteró.',
  'exam.intro.3': 'Aquí todo está hecho de gis. Y el gis, tarde o temprano, se borra.',
  'exam.intro.4': 'Corre. Y que no te alcance el borrador.',
  'exam.hint': 'toca: saltar (mantén: más alto) · desliza abajo: barrerse',
  'exam.hintKeys': '↑ / espacio: saltar (mantén: más alto) · ↓: barrerse',
  'exam.hintQuestion': 'arriba: salta para contestar · abajo: sigue corriendo',
  'exam.stairs':
    'La escuela de su sueño tiene la escalera del Girasol. Él la barre todos los días. Y la cuenta.',
  'exam.upstairs': 'Ciento doce. Siempre son ciento doce.',
  'exam.sprint': '¡El timbre! El salón está cerca.',
  'exam.right': '¡eso sí lo sabe!',
  'exam.wrong': 'Esa no. El borrador se acerca.',
  'exam.stumble': '¡tropiezo!',
  'exam.fell': 'Caes en un borrón. El gis te vuelve a dibujar del otro lado.',
  'exam.erased.1':
    'El borrador te alcanza. Por un momento no eres nada: una mancha blanca en el pizarrón.',
  'exam.erased.2':
    'Alguien te vuelve a dibujar, con la mano temblorosa de quien no ha escrito en años.',
  'exam.class.1': 'Salón 3º B. Todos los pupitres vacíos, menos uno.',
  'exam.class.2': 'Llegué tarde. Siempre llego tarde.',
  'exam.class.3': 'Y ya ni me acuerdo de qué era el examen. La hoja está en blanco.',
  'exam.class.4': 'Creo que ya lo presentaste. Allá afuera, en el pasillo.',
  'exam.class.5':
    'Lo del elevador, lo de las bisagras, lo del niño que llora de madrugada. Te lo sabías todo.',
  'exam.class.6':
    'Cuarenta años de examen oral en los pasillos de un edificio. Nadie se tomó la molestia de calificarlo.',
  'exam.class.7': 'Toma. Creo que esto es tuyo.',
  'exam.class.8': '...mi gis.',
  'exam.class.9':
    'Élmer pasa al pizarrón. Escribe su nombre despacio, con letra de tercero de primaria.',
  'exam.class.10': 'Presente.',
  'exam.board.name': 'Élmer Rosales · 3º B',
  'exam.board.grade': 'Aciertos: {n} de 5',
  'exam.grade.5': 'Diez. Con estrellita.',
  'exam.grade.4': 'Nueve. Muy bien.',
  'exam.grade.3': 'Ocho. Bien.',
  'exam.grade.2': 'Siete. Aprobado.',
  'exam.grade.1': 'Seis. De panzazo, pero pasó.',
  'exam.grade.0': 'Aprobado de todos modos: la asistencia también cuenta.',
  'exam.keyGet': 'DEVUELTO: EL GIS DE DON ÉLMER',
  'exam.fragment':
    'Un gis gastado hasta el tamaño de una uña. Lo guardó treinta años en el bolsillo del overol, por si algún día lo pasaban al pizarrón.',

  // ── Sueño de Nadia: La Caída Sin Fin (papel recortado) ──
  'fall.title': 'SUEÑO DEL QUINTO PISO',
  'fall.name': 'LA CAÍDA SIN FIN',
  'fall.intro.1': 'Nadia se mudó al 5º hace siete meses. Duerme entre cajas que no ha abierto.',
  'fall.intro.2': 'Todas las noches sueña que se cae. Nunca sueña que llega.',
  'fall.intro.3': 'Regla de este sueño: quien no desempaca, no aterriza.',
  'fall.intro.4': 'Abre sus cajas. Todas no: las suficientes.',
  'fall.hint': 'arrastra el dedo para moverte · arriba planeas, abajo caes en picada',
  'fall.hintKeys': '← → ↑ ↓ para moverte · arriba planeas, abajo caes en picada',
  'fall.boxHint': 'Una caja. Tócala para abrirla.',
  'fall.balloon': 'Un globo de la despedida. Te sostiene un momento.',
  'fall.repack': 'Te golpeas y algo vuelve a su caja. Así pasa: uno desempaca y vuelve a empacar.',
  'fall.ground': 'Abajo, por fin, algo que parece un piso.',
  'fall.land.1':
    'Iris aterriza sobre un plano. Las paredes se levantan como en un libro desplegable.',
  'fall.land.2': '¿Tú también te caes?',
  'fall.land.3': 'Ya no. Aterricé en tu sala.',
  'fall.land.4': 'No es sala. Es un cuarto con cajas.',
  'fall.land.5': 'Ahora tiene una taza, una foto y un tapete. Es bastante sala.',
  'fall.land.6': '...sí, ¿verdad?',
  'fall.land.7': 'Y esto. Se me quedó pegado. Es de tu otra casa.',
  'fall.land.8': 'Esa puerta ya no existe. No abre nada.',
  'fall.land.9': 'Las llaves viejas no abren. Se cuelgan.',
  'fall.land.10':
    'Nadia clava un clavo junto a la puerta nueva y cuelga la llave. Se queda mirándola un rato.',
  'fall.land.11': 'Mañana abro las otras.',
  'fall.keyGet': 'DEVUELTO: LA LLAVE DE LA OTRA CASA',
  'fall.fragment':
    'La llave de una puerta que ya no existe. Ahora cuelga de un clavo, junto a la puerta que sí.',

  // ── Sueño de Doña Chuy: El Patio de Atrás (acuarela) ──
  'forest.title': 'SUEÑO DEL 4B',
  'forest.name': 'EL PATIO DE ATRÁS',
  'forest.intro.1': 'Doña Chuy tiene ochenta y un años y todas las noches sueña el mismo patio.',
  'forest.intro.2':
    'El de la casa donde creció. Pero el sueño se le está despintando: ya casi no le quedan colores.',
  'forest.intro.3': 'Toma. El bote de leche que usaba de regadera. Gotea: siempre goteó.',
  'forest.intro.4': 'Donde cae el agua, vuelve el color. La pila está en medio del patio.',
  'forest.hint': 'joystick para caminar · ✦ junto a una maceta: regar · ✦ en la pila: llenar',
  'forest.hintKeys':
    'WASD / flechas para caminar · E junto a una maceta: regar · E en la pila: llenar',
  'forest.water': 'regar',
  'forest.fill': 'llenar el bote',
  'forest.empty': 'El bote está vacío. La pila está en medio del patio.',
  'forest.later': 'Todavía no. Ese recuerdo viene después.',
  'forest.done': 'Ya está regada. Brilla como recién pintada.',
  'forest.nextGroup': 'Se dibujan macetas nuevas en el boceto...',
  'forest.memory.1':
    'ECO I — Una niña de trenzas riega las macetas con un bote de leche agujerado. Su mamá le grita que no encharque. Ella encharca.',
  'forest.memory.1b': '—¡Chuy, el patio no es alberca!',
  'forest.memory.2':
    'ECO II — La misma niña, ya grande, le enseña a regar a su hijo. El bote es el mismo. El agujero también.',
  'forest.memory.2b': '—Despacito, mijo. Que les llegue a las de en medio.',
  'forest.memory.3':
    'ECO III — Una mujer de ochenta y uno riega una maceta en un balcón del 4B. Sola. El bote es el mismo.',
  'forest.memory.3b': 'Nadie le dice que no encharque. Nadie le dice nada.',
  'forest.heart.1': 'No está perdida, Iris. Sabe perfectamente dónde está.',
  'forest.heart.2': '¿Entonces qué busca?',
  'forest.heart.3':
    'A alguien a quien enseñarle. El patio lo recuerda entero; lo que le falta es alguien al lado.',
  'forest.heart.4':
    'Vive un piso arriba del tuyo. Todas las mañanas oyes gotear su balcón y nunca te has preguntado por qué.',
  'forest.chuy.1': 'Ay, mija. Estás encharcando.',
  'forest.chuy.2': 'El bote tiene un agujero.',
  'forest.chuy.3': 'Pues claro. Si no, ¿cómo les llega el agua a las de en medio?',
  'forest.chuy.4': 'Setenta años con este bote. Nunca nadie me lo pidió prestado.',
  'forest.chuy.5': 'Se me quedó pegado. Vine a devolvérselo.',
  'forest.chuy.6': 'Quédatelo un ratito... No. Mejor súbete mañana y te enseño con el de verdad.',
  'forest.win.1':
    'El patio entero se pinta de golpe, como cuando alguien abre la ventana en la mañana.',
  'forest.keyGet': 'DEVUELTO: EL BOTE DE DOÑA CHUY',
  'forest.fragment':
    'Un bote de leche con un agujero, que usó de regadera durante setenta años. El agujero es a propósito.',

  // ── Pesadilla de Tomás: La Persecución (crayola) ──
  'chase.title': 'PESADILLA DEL 2A',
  'chase.name': 'LA PERSECUCIÓN',
  'chase.intro.1':
    'Este sueño no estaba en la lista. Es de Tomás, del 2A. Siete años. El que llora de madrugada.',
  'chase.intro.2':
    'Las pesadillas de los niños están dibujadas con crayola. Por eso asustan tanto: nadie las borra.',
  'chase.intro.3':
    'Aquí no vienes a devolver nada. Escóndete, aguanta, y fíjate bien de qué tiene forma lo que te persigue.',
  'chase.hint': '◀ ▶ moverte · ✦ esconderte · la luz de las lamparitas te protege',
  'chase.hintKeys': '← → moverte · E esconderte · la luz de las lamparitas te protege',
  'chase.surge': '¡VIENE!',
  'chase.hidden': 'contén la respiración...',
  'chase.light': 'La lamparita de Tomás. Aquí la sombra no entra.',
  'chase.flicker': 'La lamparita parpadea...',
  'chase.crayon': '¡Una crayola! El dibujo se llena de color.',
  'chase.learned': 'Ya sabe que ahí te escondes.',
  'chase.caught.1':
    'Te alcanza. Tomás redibuja el cuarto: en las pesadillas de un niño, los muebles nunca están dos veces en el mismo sitio.',
  'chase.caught.2':
    'Otra vez. Los escondites cambiaron de lugar. Él también los ve cambiar cada noche.',
  'chase.caught.3': 'Ya sabe dónde te escondes. Aprende rápido para tener siete años.',
  'chase.door': 'La puerta no abre. Nunca abre: es su pesadilla, no la tuya.',
  'chase.turn': 'dejar de correr',
  'chase.sit': 'mantén ↓ para sentarte y hacerte pequeña',
  'chase.sitTouch': 'mantén ▼ para sentarte y hacerte pequeña',
  'chase.smaller': 'Mientras más pequeña se hace Iris, más pequeña se hace la sombra.',
  'chase.reveal.1': 'Iris deja de correr. Se da la vuelta.',
  'chase.reveal.2': 'La sombra se detiene a dos metros. Tiembla más que ella.',
  'chase.reveal.3':
    'La sombra se hace chiquita hasta que solo queda un dibujo en el piso: una desconocida enorme, con el pelo de Iris.',
  'chase.tomas.1': '¿Tú eres la que camina en el techo?',
  'chase.tomas.2': '...¿el techo?',
  'chase.tomas.3': 'Todas las noches. Tac, tac, tac. A las tres de la mañana.',
  'chase.tomas.4': 'Soy yo. Vivo arriba. No podía dormir, así que caminaba.',
  'chase.tomas.5': 'Yo tampoco podía dormir. Por ti.',
  'chase.tomas.6': 'Perdón. Desde mañana camino en calcetines.',
  'chase.tomas.7': '¿Y si mejor tocas el piso tres veces? Así sé que eres tú y no un monstruo.',
  'chase.tomas.8': 'Tres veces. Trato hecho.',
  'chase.tomas.9':
    'Tomás agarra una crayola y corrige su dibujo. Le quita los dientes. Le pone una sonrisa y un letrero.',
  'chase.tomas.10':
    'Luego se queda dormido ahí mismo, en el piso de la cocina, abrazado a su dibujo.',
  'chase.done': 'LA PESADILLA SE DISUELVE',
  'chase.fragment':
    'Te llevas un dibujo de crayola: una vecina enorme, pero sonriendo. Y un trato: tres golpes en el piso.',

  // ── El sueño de Iris: La Canción del Edificio ──
  'song.title': 'SUEÑO DEL 3',
  'song.name': 'LA CANCIÓN DEL EDIFICIO',
  'song.intro.1': 'Cuando Iris tenía nueve años grababa la lluvia con una grabadora de casete.',
  'song.intro.2':
    'Decía que iba a hacer canciones con los ruidos de las casas. Luego creció, estudió algo práctico y se compró audífonos.',
  'song.intro.3':
    'Tu sueño. Polvoso, pero entero. Solo le falta lo que siempre le faltó: material.',
  'song.intro.4': 'Quítate los audífonos. El edificio lleva toda la noche tocando para ti.',
  'song.hint': 'toca cuando cada sonido llegue a la grabadora',
  'song.hintKeys': 'espacio (o clic) cuando cada sonido llegue a la grabadora',
  'song.section.1': 'Planta baja: Don Élmer barre la escalera. Shh... shh...',
  'song.section.2': 'Quinto piso: Nadia abre otra caja. Tum.',
  'song.section.3': 'Cuarto piso: el balcón del 4B gotea. Plic.',
  'song.section.4': 'Segundo piso: tres golpes en el techo. Toc, toc, toc.',
  'song.section.5': 'Y tú. Tararea.',
  'song.perfect': '¡justo!',
  'song.good': 'bien',
  'song.dawn': 'Amanece en el edificio Girasol.',

  // Hub: la puerta de la pesadilla
  'hub.nightmare.appear.1': 'Espera. Esa puerta no estaba.',
  'hub.nightmare.appear.2':
    'Es el 2A. El niño. Su pesadilla se abrió sola porque hay alguien caminando por el edificio a deshoras... o sea, tú.',
  'hub.morfeo.night.1':
    'Ahí dentro no eres visita: eres lo que da miedo. Cuando entiendas eso, sabrás qué hacer.',
  'hub.morfeo.done.1':
    'Te dejaste ver por un niño de siete años y sobreviviste. Administrativamente, eso no lo había visto nunca.',

  // Hub: la revelación del cuarto sueño
  'hub.own.1': 'Tu puerta gira. Las tres cosas ajenas ya no traban la cerradura.',
  'hub.own.2': 'Un momento. Falta uno.',
  'hub.own.3': '¿Cómo que falta uno? Devolví los tres.',
  'hub.own.4':
    'Los tres ajenos. Queda uno que lleva aquí mucho más tiempo y que nadie ha venido a reclamar.',
  'hub.own.5': 'Al fondo del Entresueño, donde no miraste, hay un sueño tuyo cubierto de polvo.',
  'hub.own.6':
    'Lo dejaste aquí hace años, cuando decidiste que era más práctico ponerte audífonos que oír lo que tenías alrededor.',
  'hub.own.7':
    'Este tiro de luz está lleno de sueños que la gente abandona. Yo solo los barro. Es un trabajo bastante triste, si te soy sincero.',
  'hub.own.8': '¿Y si me lo llevo?',
  'hub.own.9':
    'Entonces vas a despertar cargando algo. Otra vez. Pero por primera vez va a ser tuyo.',

  // ── Final ──
  'ending.1': 'Iris abrió los ojos a las 6:40. No buscó los audífonos.',
  'ending.2': 'Oyó a Don Élmer barriendo la escalera. Ciento doce escalones.',
  'ending.3': 'Oyó a la del 5º abrir una caja. Y luego otra.',
  'ending.4': 'Oyó gotear el balcón del 4B. A propósito.',
  'ending.5': 'Tocó el piso tres veces. Desde abajo, alguien tocó el techo tres veces.',
  'ending.6': 'Sacó su grabadora de una caja que tampoco había abierto. Todavía tenía pilas.',
  'ending.7': 'A las 7:05, en vez de bajar por el correo, subió un piso.',
  'ending.8': 'Cuarto piso, puerta B. Tocó.',
  'ending.9': 'Abrió una señora de ochenta y uno con un bote de leche en la mano.',
  'ending.10': '— Buenos días. Soy la del 3. Vengo a que me enseñe a no encharcar.',
  'ending.11':
    'En el tiro de luz, un gato gris con ojos color agua las miró como quien revisa un trámite. Luego se fue a dormir.',
  'ending.thanks': 'FIN',
  'ending.stats': 'luciérnagas: {n} / {total}',
  'ending.exam': 'examen de Don Élmer: {n} de 5',
  'ending.continue': 'quedan treinta y seis puertas en este edificio',
  'ending.menu': 'volver al menú',

  // ── UI general ──
  'ui.pause': 'PAUSA',
  'ui.resume': 'seguir',
  'ui.exitDream': 'salir del sueño',
} as const;

export type TextKey = keyof typeof es;
