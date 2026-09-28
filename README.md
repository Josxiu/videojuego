# 🌙 Duermevela

*Los sueños de este edificio no son todos tuyos.*

Iris, la del 3, lleva once días durmiendo con audífonos para no oír a sus vecinos. La
noche que se le acaba la batería oye el edificio Girasol entero respirando —cuarenta
personas dormidas, cuarenta sueños subiendo por el tiro de luz— y se duerme con todos
encima.

Despierta en **El Entresueño**, el tiro de luz visto desde adentro. Se le pegaron tres
sueños que no son suyos, y su cuerpo no la deja volver mientras los cargue. **Morfeo**,
gato de administración de sueños del turno nocturno, se lo explica sin demasiada
paciencia: entra, devuelve lo que te llevaste, sal.

Cada puerta es la mente de un vecino, **dibujada con lo que ese vecino tiene a la
mano**. Y dentro de un sueño ajeno, la rara eres tú.

## Los sueños

Cada sueño tiene su propia técnica: los escenarios se pintan con pinceles
procedurales y los personajes se re-dibujan en ese estilo (es la misma Iris, vista por
otra persona).

| Sueño | De quién | Técnica | Mecánica |
|---|---|---|---|
| 🏫 **El Examen Infinito** | **Don Élmer**, el conserje, que dejó la escuela en tercero | **Gis sobre pizarrón** | Auto-runner. El **borrador** (lo único que no es de gis) persigue y borra el mundo: tropezar o contestar mal lo acerca, acertar lo aleja. El pasillo pregunta sobre su vida (saltas para la respuesta de arriba, corres por la de abajo). Huecos borrados y la **escalera de 112 escalones** del edificio. Al final, Élmer niño escribe su nombre en el pizarrón. |
| 📦 **La Caída Sin Fin** | **Nadia**, del 5º, siete meses sin desempacar | **Papel recortado y cartón** | Caída libre en dos ejes (arriba planeas, abajo en picada). *Quien no desempaca, no aterriza*: la caída no tiene fondo hasta abrir seis cajas. Cada caja cambia el cielo por otro papel de su mudanza (clasificados, cartón, papel de regalo, papel de china, las cartas de su mamá, el plano del depa nuevo). Aterrizaje como libro desplegable. |
| 🌿 **El Patio de Atrás** | **Doña Chuy**, del 4B, 81 años | **Acuarela sobre boceto a lápiz** | El patio de su infancia se le está despintando. Iris carga su bote de leche agujereado: **donde gotea, vuelve el color**. Hay que llenar el bote en la pila, planear la ruta (se vacía caminando) y regar las macetas de cada etapa de su vida para recuperar sus recuerdos, con cambio de luz del día. |
| 🖍️ **La Persecución** | **Tomás**, del 2A, siete años | **Crayola** | Sigilo. La Sombra acecha, avisa y embiste; no entra en la luz de las lamparitas (algunas parpadean). Aprende los escondites donde te vio, y cada vez que te atrapa Tomás redibuja su casa. Al final no se gana huyendo: hay que darse la vuelta y **sentarse para hacerse pequeña**. La Sombra tiene la silueta de Iris. |
| 🎵 **La Canción del Edificio** | **Iris**: el sueño que dejó abandonado | Pixel art y luz de amanecer | Ritmo de un botón. Los sonidos de cada vecino (escoba, cajas, goteo, tres golpes en el techo) salen de su ventana —pintada con la técnica de su sueño— y viajan hasta la grabadora de Iris. Cada sección suma un instrumento; al final Iris tararea y el edificio florece como un girasol. |

Coleccionables: **luciérnagas**, restos de sueños que nadie reclamó (en cada sueño se
ven distinto: estrellas de gis, luciérnagas de papel doblado, luces de acuarela que
solo aparecen donde ya hay color, crayolas que le devuelven el color a la pesadilla).

## Jugar

Funciona en el navegador de **PC y celular** (en horizontal).

| | PC | Celular |
|---|---|---|
| Moverse | flechas / WASD | botones ◀ ▶ o joystick |
| Saltar (examen) | ↑ / espacio (mantener = más alto) | tocar (mantener = más alto) |
| Barrerse / caer en picada | ↓ | deslizar hacia abajo |
| Caída | flechas en dos ejes | arrastrar el dedo |
| Interactuar | E / espacio / Enter | botón ✦ |
| Sentarse (pesadilla) | mantener ↓ | mantener ▼ |
| Ritmo | espacio o clic | tocar la pantalla |

## Desarrollo

```bash
npm install
npm run dev        # servidor local en http://localhost:5173
npm run build      # build de producción en dist/
npm run lint       # ESLint + Prettier
npm test           # tests unitarios (Vitest)
npm run test:smoke # smoke test con Playwright (requiere npm run dev activo)
npm run check      # lint + tests + build, todo junto
```

### Depuración por URL

- `?scene=DreamFall` abre una escena directamente (`Gallery` muestra todo el pixel art
  y, en su segunda página, cómo lo re-interpreta cada sueño).
- `&skip` salta tarjeta de título y diálogos de entrada.
- `&at=N` arranca más adelante: distancia en el examen, cajas abiertas en la caída,
  recuerdos en el patio, posición en la pesadilla, pasos en la canción.
- `&god` (examen) el borrador no alcanza; `&auto` (canción) toca solo.

### Cómo está hecho

- **Phaser 3 + TypeScript + Vite**, sin backend y **sin archivos de imagen ni de
  audio**: todo el arte y todo el sonido se generan en el navegador.
- **Estilizador** (`src/gfx/stylize.ts`): los personajes se dibujan una vez como pixel
  art (mapas de texto en `src/gfx/sprites/`) y cada sueño los re-interpreta a mayor
  resolución como gis, papel recortado (con borde blanco y sombra), acuarela
  (pigmento acumulado en el borde, trazo de lápiz) o crayola (veta de cera).
- **Pinceles procedurales** (`src/gfx/brush.ts`) con semilla (`src/gfx/noise.ts`):
  trazo de gis grano a grano, lápiz repasado, lavados de acuarela por capas de
  polígonos deformados, papel con sombra y fibras, crayola con huecos de cera,
  garabatos. Cada escenario se pinta al entrar al sueño y sale idéntico siempre.
- **Post-procesado por mundo** (`src/gfx/postfx/`): un solo shader configurable por
  uniformes —textura de papel/pizarrón, *line boil* (las líneas tiemblan como animación
  a mano), suavizado de pigmento, ondulación, grano, viñeta— con transiciones
  interpoladas. Si no hay WebGL se omite y el juego funciona igual en Canvas.
- **Audio** (`src/systems/audio/`): sintetizador con instrumentos por mundo (marimba,
  caja de música, guitarra, piano de juguete desafinado, tarareo) y percusiones (escoba,
  caja de cartón, gota, golpe en el techo). La música se escribe en una notación de
  pasos compacta, tiene **capas** que crecen con el juego y se agenda sobre el reloj del
  `AudioContext`; el ritmo juzga cada toque con ese mismo reloj.
- **Contenido como datos** (`src/data/`): recorrido del examen, cielos y cajas de la
  caída, macetas y recuerdos del patio, escondites de la pesadilla.
- **Textos**: todos en `src/i18n/es.ts`, listos para traducir.
- **Tipografías** auto-alojadas (OFL, ver `public/fonts/LICENSE.md`): Silkscreen y
  Pixelify Sans para el mundo «real», Cabin Sketch (gis), Patrick Hand (letra a mano) y
  Gochi Hand (letra de niño).
- **Progreso** en `localStorage`, con migración de partidas guardadas viejas.
- **Tests**: validación de todos los mapas de pixel art, de la notación musical, de la
  coherencia de los datos de cada nivel, del guardado y del diccionario.

### Publicación

El workflow `.github/workflows/deploy.yml` compila el juego y lo publica en
**GitHub Pages** en cada push.

> **Importante:** en *Settings → Pages → Build and deployment → Source* hay que elegir
> **"GitHub Actions"**, NO "Deploy from a branch". Con "Deploy from a branch" GitHub
> sirve el código fuente sin compilar (el `index.html` apunta a `/src/main.ts`, que solo
> existe en desarrollo) y la página se ve en blanco/azul oscuro sin cargar el juego.

## Ideas para futuros sueños

Quedan treinta y seis puertas en el edificio:

- 🎭 **El Teatro de los Nervios** — ritmo/QTE en teatro de sombras: actuar en una obra sin conocer el guion.
- ✏️ **La Ciudad del Escritorio** — plataformas en fotografía de juguetes: diminuta entre lápices y tazas gigantes.
- 📚 **La Biblioteca Infinita** — laberinto roguelike en grabado: palabras que cobran vida.
- 🪞 **El Espejo** — puzzle en vitral: controlar dos Iris espejadas a la vez.
- 🌊 **El Océano de Almohadas** — nado suave en fieltro y tela bordada.
