# Informe de Cierre — *Duermevela* (Edición Definitiva)

Este documento resume lo implementado sobre la rama `duermevela-edicion-definitiva` (creada a partir de `claude/game-polish-graphics-story-7iqqls` sin alterar el resto de ramas), realiza una autocrítica honesta de lo que quedó más débil y propone mejoras concretas para una hipotética versión comercial en **Godot 4**.

---

## 1. Qué se hizo

### 1.1 Historia, voces, conflicto y algo en juego
- Se redactó la biblia narrativa (`docs/biblia.md`), 10 fichas de diseño (`docs/suenos/01..10-*.md`) y el registro de decisiones (`docs/decisiones.md`) antes de programar los niveles nuevos.
- Se introdujo un antagonista con motivaciones humanas y dramáticamente simétricas a las de Iris: **Octavio Bravo (6A)**, ingeniero acústico viudo de Elena que sella el tiro de luz con espuma anecoica para preservar el último tictac grabado de su esposa sin «ruido externo».
- Los 10 vecinos hablan con registros, léxicos y timbres sintetizados distintos (`VoiceId`: `kid`, `old`, `goyo`, `renata`, `paloma`, `mateo`, `octavio`, además de `iris` y `morfeo`), y cada texto de interfaz, pregunta y ficha vive fuera de la lógica del juego en `src/i18n/es/` (`core.ts`, `dreamsA.ts`, `dreamsB.ts`).
- El Hub (`src/scenes/hub/Hub.ts`) evoluciona visual y sonoramente a lo largo de 3 actos del edificio (espuma acústica invadiendo el tiro de luz en los actos II–III, sueños enfrascados en 6A y amanecer de rayos cálidos al despertar el Girasol) y conduce a **4 desenlaces** en `src/scenes/Ending.ts` (*El Silencio / Cámara Anecoica*, *Tregua Frágil*, *Desayuno en el 4B* y *El Girasol Despierto*).

### 1.2 Los 10 sueños (cada uno con 3 actos internos, sorpresa y ruptura de su propia regla)
1. **Sueño 01 — Don Élmer (PB, Gis sobre pizarrón, `DreamExam.ts`)**: escalón 112 del conserje que no terminó tercero de primaria; Acto II incorpora huecos borrados y pupitres flotantes; secreto de boleta escolar oculta; el cierre rompe la regla cuando Iris toma el borrador y borra la palabra `TARDE`.
2. **Sueño 02 — Nadia (5A, Papel recortado, `DreamFall.ts`)**: caída libre por 6 cajas sin desempacar; vientos ascendentes y cintas de embalaje que solo se cortan cayendo en picada; carta secreta en el Cielo 5; ruptura final cortando tres muebles suspendidos para formar su cuarto al aterrizar.
3. **Sueño 03 — Doña Chuy (4B, Acuarela sobre boceto a lápiz, `DreamForest.ts`)**: patio de atrás despintándose con bote agujereado; evaporación de tarde en Acto II y recuerdos detrás del zaguán; ruptura final abrazando a Doña Chuy con el bote completamente vacío (`0%`) cuando el agua deja de ser necesaria.
4. **Sueño 04 — Don Goyo (1B, Teatro de sombras / Linterna mágica, `DreamShadow.ts`)**: técnica visual nueva. Siluetas proyectadas sobre lona con filtros de acetato ámbar/azul; sorpresa con aparición de Rosa en azul; secreto de las orejas de conejo de Morfeo tras el proyector; ruptura apagando la lámpara en el Acto III cuando la luz blanca ciega el escenario.
5. **Sueño 05 — Renata (2B, Bordado textil / Punto de cruz sobre lino, `DreamEmbroidery.ts`)**: técnica visual nueva (`linenWeave`, bastidor circular y puntadas con relieve). Costura de un dedo sin cruzar hilos mientras acechan tijeras y una polilla que descose; secreto de las iniciales `S.M.` en un babero; ruptura en Acto III mediante zurcido visible dorado (*kintsugi* textil) tras romper la regla de no cruzar puntadas.
6. **Sueño 06 — Paloma (4A, Vitral emplomado translúcido, `DreamGlass.ts`)**: técnica visual nueva (`glassPane`, plomo y refracción cromática RGB + Cian). Espejos discretos de un toque; sorpresa del prisma agrietado; lámpara Tiffany secreta a la izquierda; ruptura reuniendo Rojo + Verde + Azul en el cristal roto central para estallarlo en luz blanca.
7. **Sueño 07 — Tomás (2A, Crayola infantil, `DreamChase.ts`)**: sigilo nocturno frente a La Sombra (con silueta de Iris); Acto II invierte la Sombra al techo y le permite apagar lámparas pisoteando el suelo; cohete de cartón secreto tras la cama; ruptura interactiva en el suelo haciendo exactamente 3 golpes de pacto (`toc, toc, toc`).
8. **Sueño 08 — Mateo (3A, Xilografía / Grabado en papel algodón, `DreamWoodcut.ts`)**: técnica visual nueva (`cottonPaper`, `woodcutBlock`, tinta negra/índigo y lacre carmesí). Laberinto por turnos con navegación BFS de un dedo y deslizamiento en tinta fresca; mirilla `3A → 3B` secreta en Acto I; Acto II invierte a negativo blanco-sobre-negro con el Sello de Lacre persiguiendo; ruptura tallando el propio marco de la estampa en el Acto III para salir al papel en blanco junto a Mateo.
9. **Sueño 09 — Octavio Bravo (6A, Cámara Anecoica 3D en primera persona, `DreamChamber3D.ts`)**: técnica visual nueva sobre motor 3D matemático propio (`src/gfx/engine3d.ts`), compatible con WebGL y fallback Canvas2D. Ecolocalización en 3D con amortiguadores móviles, habitación cálida de madera de Elena en el Acto II y casete secreto tras la consola; en el Acto III, emitir pulsos engrosa el muro final y empuja atrás — solo quedarse 4 segundos quieto en silencio disuelve la espuma y abre la decisión moral ante Octavio.
10. **Sueño 10 — Iris (3B, Pixel art + fachadas con las 10 técnicas, `DreamSong.ts`)**: clímax rítmico con las 9 ventanas vecinas sumando sus capas musicales reales (`TRACKS.song`), filtro pasa-bajas en el Acto I (`setMuffle`) que literalmente retira los audífonos, contratiempo frío del péndulo 6A en el Acto II, pausa entre Cara A y Cara B donde mantener pulsado revela su grabación de los 9 años, y Cara B invirtiendo la regla al enviar notas **desde Iris (3B) hacia cada vecino despierto** mientras amanece y florece el Edificio Girasol.

### 1.3 Sensación de juego, controles de un dedo y rejugabilidad
- Controles táctiles de un solo dedo (`InputManager.ts`: joystick flotante + botón único de acción/toque directo en puzles y laberinto BFS) más atajos completos de teclado/ratón en PC.
- **60 luciérnagas permanentes** (6 por sueño, guardadas individualmente por ID), **Álbum del Entresueño** (`src/scenes/Album.ts`) con 20 memorias desbloqueables y lanzador directo, **10 secretos** con estandarte y **Modo Desvelo** (variantes nocturnas difíciles tras completar cada nivel).
- Audio 100 % procedural (`src/systems/audio/`) con capas musicales reactivas, timbres por personaje, filtro pasa-bajas y efectos por técnica (carrete de cine, tijera, prisma, gubia, sonar 3D, rebobinado de casete).
- Verificación continua con ESLint + Prettier + 41 tests unitarios (`Vitest`) + scripts Playwright por sueño con inspección visual de capturas en Chromium headless (WebGL y Canvas sin WebGL).

---

## 2. Qué quedó flojo (autocrítica honesta)

1. **Rendimiento del rasterizador 3D por CPU (`engine3d.ts`) en equipos muy lentos**: al no usar buffer de profundidad hardware ni geometría WebGL nativa en la escena 3D (por garantizar el fallback obligatorio a Canvas2D), el render depende del algoritmo del pintor sobre polígonos ordenados por profundidad media (`Z`). Funciona estable con un mapa compacto de muros ortogonales, pero no escalaría a pasillos complejos ni geometrías entrecruzadas sin z-fighting o pérdida de FPS bajo SwiftShader sin hardware GL.
2. **Duración efectiva entre jugada directa y juego contemplativo**: si un jugador completa los 10 sueños buscando sus 60 luciérnagas, leyendo diálogos/Álbum y rejugando variantes en Modo Desvelo, la experiencia ronda la hora completa (60–75 min); sin embargo, en una partida lineal sin explorar secretos ni Desvelo, el recorrido principal se acerca más a ~30–40 minutos.
3. **Techo expresivo de la síntesis vocal e instrumental Web Audio**: generar todo el sonido con osciladores y ruido filtrado evita dependencias de MP3/OGG, pero las voces de tarareo (`hum`) y los timbres acústicos largos (como el reloj/violín emocional del 6A o el amanecer final) suenan inevitables a sintetizador chiptune/FM sencillo frente a grabaciones íntimas reales.
4. **Precisión rítmica y gestual en dispositivos heterogéneos**: en `DreamSong` y `DreamWoodcut` se tuvo que compensar con reloj real (`performance.now()`) y tolerancias pensadas para un dedo; aun así, en **Modo Desvelo** la exigencia de precisión en táctil se siente menos afilada que en teclado por la latencia táctil del navegador móvil.
5. **Escala fija `960×540` con fuentes pixeladas bajo zoom fraccionario**: en pantallas ultrapanorámicas o celulares con relación de aspecto alargada, el modo `Phaser.Scale.FIT` deja franjas laterales oscuras en lugar de extender el fondo del cielo o las fachadas más allá de los bordes.
6. **Cobertura E2E en CI**: aunque cada uno de los 10 sueños superó su propia suite Playwright con capturas durante la implementación, el comando estándar `npm run test:smoke` comprueba arranque, transición menú-intro-hub, modo táctil y degradación Canvas de todas las escenas sin recorrer los 10 finales en cada ejecución por tiempo de CI.

---

## 3. Ideas concretas para llevar *Duermevela* a una versión comercial en Godot

1. **Shaders nativos y texturas materiales en `SubViewport` por técnica (Godot 4)**:
   - Reemplazar las pinceladas Canvas2D pre-pintadas por materiales `CanvasItemMaterial` / shaders GLSL en tiempo real con **normal maps procedurales** por oficio: relieve real del hilo cruzado reaccionando a una luz direccional en el sueño de Renata, cáusticas y refracción cromática auténtica en el vitral de Paloma, desgaste dinámico de tinta en papel algodón en el grabado de Mateo y *line boil* configurable sin penalizar CPU.
2. **El Sueño 9 (Octavio, 6A) en 3D real con Forward+ y ecolocalización en shader**:
   - Migrar el laberinto matemático a nodos `GridMap` / `CSGBox3D` + `CharacterBody3D`, usando luz volumétrica sutil y un *post-process / world-position shader* que propague ondas de sonar esféricas reales por las paredes (`distance(world_pos, pulse_origin)`) revelando texturas ocultas y reflejando eco con `AudioEffectDelay` + `AudioEffectReverb` en buses espaciales `AudioStreamPlayer3D`.
3. **Audio interactivo híbrido (`AudioStreamInteractive` + grabaciones íntimas)**:
   - Mantener el concepto de capas que se desbloquean por ventana, pero grabado con instrumentos reales (cajón de cartón, escoba de mijo, máquina de coser, péndulo, vasos de cristal y tarareo humano real de varias edades para Cara B) combinados con stems sincronizados por compás en Godot 4.3+, además de audio *lowpass* real en el Acto I y compresión ambiental para el tiro de luz del Hub.
4. **Responsividad real en pantallas móviles y *haptics* de un dedo**:
   - Configurar `stretch/aspect = expand` extendiendo cielos y bordes arquitectónicos más allá del marco `16:9`, ofrecer sensibilidad ajustable para el joystick flotante de un pulgar y usar `Input.vibrate_handheld()` en eventos táctiles clave (los 3 golpes de Tomás, cada puntada correcta en lino, el golpe de prensa en xilografía y el latido del reloj de Elena).
5. **Profundización narrativa, accesibilidad y rejugabilidad comercial**:
   - Expandir el **Álbum del Entresueño** en un diario ilustrado interactivo donde escuchar fragmentos de casete recuperados tras cada secreto, incluir asistencias granulares de accesibilidad (modo sin prisa en Desvelo, indicadores visuales para personas sordas en la cámara anecoica y alto contraste opcional por técnica) y añadir logros/finales comentados tras los créditos (*New Game+* con notas de Morfeo).
6. **Arquitectura de localización y empaquetado multiplataforma**:
   - Exportar las claves de `src/i18n/es/` a tablas CSV/Gettext `.po` nativas de Godot para habilitar traducción simultánea a inglés, portugués y japonés conservando el tono coloquial mexicano/latinoamericano y publicar builds nativos para PC/Steam Deck (sin latencia WebAudio ni barras de navegador móvil), web HTML5 e itch.io, y tiendas móviles.
