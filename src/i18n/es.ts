// Todos los textos del juego. Para agregar un idioma: copiar este archivo y traducir.
export const es = {
  // ── Menú ──
  'menu.title': 'DUERMEVELA',
  'menu.subtitle': 'un juego sobre no poder despertar',
  'menu.play': 'Jugar',
  'menu.continue': 'Continuar',
  'menu.reset': 'Borrar progreso',
  'menu.resetConfirm': '¿Seguro? Toca otra vez para borrar',
  'menu.credits': 'hecho con sueño',

  // ── Intro ──
  'intro.1': 'Iris llevaba tres semanas sin dormir bien.',
  'intro.2': 'Exámenes. Trabajos. Café. Repetir.',
  'intro.3': '— Solo voy a cerrar los ojos cinco minutos... —',
  'intro.4': 'Esa noche, el sueño la atrapó.',
  'intro.5': 'Literalmente.',
  'intro.skip': 'tocar para continuar',

  // ── Hub: El Entresueño ──
  'hub.title': 'EL ENTRESUEÑO',
  'hub.interact': 'hablar',
  'hub.enter': 'entrar',
  'hub.locked': 'La puerta está sellada... todavía.',
  'hub.wakeDoorLocked': 'La Puerta del Despertar. Necesita tres llaves.',
  'hub.wakeDoorReady': 'La Puerta del Despertar. Tus tres llaves vibran...',

  // Primer encuentro con Morfeo
  'hub.meet.1': 'Miau. Digo... bienvenida, Iris.',
  'hub.meet.2': '¿¡Un gato que habla!?',
  'hub.meet.3': 'Un gato de HUMO que habla. Los detalles importan. Me llamo Morfeo.',
  'hub.meet.4': 'Esto es el Entresueño: el pasillo entre tus sueños. Y tengo malas noticias: tu mente no quiere despertar.',
  'hub.meet.5': '¿Cómo que no quiere? ¡Mañana tengo un día importante!',
  'hub.meet.6': 'Por eso mismo, sospecho. Mira: cada puerta guarda un sueño, y en el fondo de cada sueño hay una Llave del Despertar.',
  'hub.meet.7': 'Tres llaves abren la puerta grande. Sin llaves... siesta eterna.',
  'hub.meet.8': 'A mí la siesta eterna me suena bien, pero los humanos se ponen dramáticos.',
  'hub.meet.9': 'Empecemos. Elige una puerta. Yo estaré aquí, supervisando. Acostado, pero supervisando.',

  // Comentarios de Morfeo según progreso
  'hub.morfeo.zero.1': '¿Consejo? Las puertas no se abren solas. Bueno, sí, pero primero entra tú.',
  'hub.morfeo.one.1': 'Una llave. Nada mal para alguien que duerme abrazando sus apuntes.',
  'hub.morfeo.one.2': 'Los sueños saben lo que te pesa, Iris. Por eso se sienten tan... tuyos.',
  'hub.morfeo.two.1': 'Dos llaves. Casi puedo oler el desayuno del otro lado.',
  'hub.morfeo.two.2': 'La última puerta es distinta. Ahí guardas lo que no quieres mirar. Ve con calma.',
  'hub.morfeo.three.1': 'Tres llaves. Te dije que supervisar acostado funcionaba.',
  'hub.morfeo.three.2': 'La puerta grande te espera. Yo... voy a extrañar este pasillo.',
  'hub.morfeo.fireflies': 'Llevas {n} luciérnagas de memoria. Brillan más cuando las coleccionas. Como los recuerdos.',

  // ── Sueño 1: El Examen Infinito ──
  'exam.title': 'SUEÑO I',
  'exam.name': 'EL EXAMEN INFINITO',
  'exam.intro.1': 'Llegas tarde. AL EXAMEN. Corre.',
  'exam.hint': 'toca: saltar · desliza abajo: agacharse',
  'exam.hintKeys': '↑ saltar · ↓ deslizarse',
  'exam.checkpoint': '¡Timbre! Sigue corriendo...',
  'exam.section2': 'El pasillo se estira. Típico.',
  'exam.section3': '¡El aula está cerca! ¡CORRE!',
  'exam.win.1': '*JADEO* ...llegué... ¡llegué al examen!',
  'exam.win.2': 'La hoja está... ¿en blanco?',
  'exam.win.3': 'En los sueños nunca hay preguntas. Solo la prisa. Injusto, ¿verdad?',
  'exam.win.4': '¡Y mira lo que dejó el profesor sobre el pupitre!',
  'exam.keyGet': '¡LLAVE DEL DESPERTAR OBTENIDA!',
  'exam.fail': 'Tropiezas... pero el sueño te levanta de nuevo.',

  // ── Sueño 2: La Caída Sin Fin ──
  'fall.title': 'SUEÑO II',
  'fall.name': 'LA CAÍDA SIN FIN',
  'fall.intro.1': 'El suelo desaparece. Estás cayendo. Otra vez ese sueño...',
  'fall.hint': 'arrastra el dedo para moverte',
  'fall.hintKeys': '← → para moverte',
  'fall.ring': 'El viento te sostiene un momento...',
  'fall.depth': '{n} m',
  'fall.win.1': '...¿Un colchón de nubes? Podría ser peor.',
  'fall.win.2': 'Caer no siempre es malo. A veces es la única forma de soltar.',
  'fall.win.3': 'Y mira: el cielo te dejó un regalo entre las plumas.',
  'fall.keyGet': '¡LLAVE DEL DESPERTAR OBTENIDA!',
  'fall.fail': 'El cielo te recoge y te deja caer de nuevo...',

  // ── Sueño 3: El Bosque de los Recuerdos ──
  'forest.title': 'SUEÑO III',
  'forest.name': 'EL BOSQUE DE LOS RECUERDOS',
  'forest.intro.1': 'Niebla. Árboles quietos. Aquí tu mente guarda lo que no quiere mirar.',
  'forest.hint': 'muévete con el joystick · toca ✦ para activar ecos',
  'forest.hintKeys': 'WASD/flechas para moverte · E para activar ecos',
  'forest.echoLocked': 'El eco parpadea... aún no es su turno.',
  'forest.echoWrong': 'Los recuerdos se desordenan. La niebla suspira.',
  'forest.gateOpen': 'La niebla se abre un poco...',
  // Los tres ecos de memoria (en orden)
  'forest.memory.1': 'ECO I — La abuela regando iris en el patio. «Se llaman como tú, mija. Florecen aunque nadie las mire.»',
  'forest.memory.2': 'ECO II — La mudanza a la ciudad. El patio quedó atrás. «Cuando termine el semestre, la visito», dijiste.',
  'forest.memory.3': 'ECO III — El mensaje sin responder: «Te espero el domingo con pan de dulce. — Abuela». Fue hace un mes.',
  'forest.heart.1': 'Por eso no quieres despertar, ¿verdad?',
  'forest.heart.2': 'Despertar es volver a un mundo donde el domingo ya pasó.',
  'forest.heart.3': 'Pero mira este bosque, Iris. Tu abuela sigue aquí. En cada recuerdo que enciendes.',
  'forest.heart.4': 'Despertar no es olvidar. Es llevarla contigo. Y responder ese mensaje: aún hay domingos.',
  'forest.win.1': 'El bosque entero se enciende de luciérnagas.',
  'forest.keyGet': '¡LLAVE DEL DESPERTAR OBTENIDA!',
  'forest.lanternHint': 'Los faroles recuerdan el orden de la historia: patio, ciudad, mensaje.',

  // ── Final ──
  'ending.1': 'Las tres llaves giran solas en la cerradura.',
  'ending.2': '¿Lista? Del otro lado hay ruido, tareas, café frío...',
  'ending.3': '...y también domingos. Vamos, Morfeo.',
  'ending.4': '¿"Vamos"? Miau. Está bien. Pero yo no madrugo.',
  'ending.5': 'Iris abrió los ojos.',
  'ending.6': 'Por primera vez en semanas, había dormido de verdad.',
  'ending.7': 'En su teléfono, un mensaje enviado: «Abuela: este domingo sí voy. Guárdame pan de dulce.»',
  'ending.8': 'Y sobre la almohada... una huella de gato hecha de humo.',
  'ending.thanks': 'FIN DEL PROTOTIPO — gracias por jugar',
  'ending.stats': 'luciérnagas de memoria: {n} / {total}',
  'ending.continue': '...continuará',

  // ── UI general ──
  'ui.pause': 'PAUSA',
  'ui.resume': 'seguir',
  'ui.exitDream': 'salir del sueño',
  'ui.retry': 'reintentar',
  'ui.tapToContinue': 'toca para continuar',
  'ui.keyCount': 'llaves',
  'ui.mute': 'sonido',
} as const;

export type TextKey = keyof typeof es;
