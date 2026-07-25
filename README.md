# 🌙 Duermevela

*Los sueños de este edificio no son todos tuyos.*

Iris lleva once días durmiendo con audífonos para no oír a sus vecinos. La noche que
se le acaba la batería, oye el edificio Girasol entero respirando —cuarenta personas
dormidas, cuarenta sueños subiendo por los ductos— y se duerme con todos encima.

Despierta en **El Entresueño**, el cruce por donde pasan los sueños del edificio. Se
le pegaron tres que no son suyos, y su cuerpo no la deja volver mientras los cargue.
**Morfeo**, gato de administración de sueños del turno nocturno, se lo explica sin
demasiada paciencia: entra, devuelve lo que te llevaste, sal.

Cada puerta es la mente de un vecino concreto, con sus reglas, su estética y su
mecánica. Y dentro de un sueño ajeno, la rara eres tú.

## Los sueños

| Sueño | De quién | Mecánica |
|---|---|---|
| 🏫 **El Examen Infinito** | **Don Élmer**, el conserje | Lleva 40 años soñando un examen que nunca presentó. El pasillo pregunta sobre su vida y respondes **saltando** (respuesta de arriba) o **corriendo por el suelo** (la de abajo). Fallar estira el pasillo. |
| 🌌 **La Caída Sin Fin** | **Nadia**, del 5º | Siete meses sin desempacar, siete meses cayendo. Las puertas flotantes **se cruzan** y cambian el cielo entero: el de cartón, el mojado, el sin señal. |
| 🌲 **El Patio de Atrás** | **Doña Chuy**, del 4B | 81 años soñando el patio de su infancia. No está perdida: busca a quien enseñarle a regar. Enciende los ecos en el orden de su vida. |
| 👁 **La Persecución** | **Tomás**, del 2A, 7 años | Su pesadilla se abrió sola. La Sombra **aprende**: los escondites donde te atrapó quedan vigilados. Y tiene forma de algo que reconocerás. |

Coleccionable: **luciérnagas**, restos de sueños que nadie reclamó.
Al devolver los tres fragmentos tu puerta todavía no abre: falta un cuarto sueño
por reclamar, y ese lleva mucho más tiempo ahí.

## Jugar

Funciona en el navegador de **PC y celular** (en horizontal).

- **PC**: flechas/WASD para moverse, ↑/espacio salta, ↓ desliza, E/espacio interactúa.
- **Celular**: toca para saltar, desliza hacia abajo para agacharte, arrastra el dedo
  para moverte en la caída, joystick virtual en el bosque.

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

### Cómo está hecho

- **Phaser 3 + TypeScript + Vite**, sin backend.
- **Post-procesado por mundo**: un único shader configurable por uniformes
  (`src/gfx/postfx/`) da a cada sueño su «cámara» — scanlines, aberración cromática,
  grano, viñeta, ondulación, desaturación. Degrada solo si no hay WebGL.
- **Contenido como datos**: preguntas del examen y cielos de la caída viven en
  `src/data/`; ampliarlos no toca la lógica de las escenas.
- **Tipografía**: Silkscreen y Pixelify Sans auto-alojadas (OFL, ver
  `public/fonts/LICENSE.md`).
- **Pixel art en runtime**: los sprites están definidos como mapas de texto en
  `src/gfx/sprites.ts` (una letra = un color) y se convierten en texturas al arrancar.
  No hay archivos de imagen en el repo.
- **Audio chiptune procedural**: música y efectos generados con Web Audio API en
  `src/systems/AudioManager.ts`. No hay archivos de audio.
- **Textos**: todos en `src/i18n/es.ts`, listos para traducir a más idiomas.
- **Progreso**: guardado en `localStorage`.

### Publicación

El workflow `.github/workflows/deploy.yml` compila el juego y lo publica en
**GitHub Pages** en cada push.

> **Importante:** en *Settings → Pages → Build and deployment → Source* hay que elegir
> **"GitHub Actions"**, NO "Deploy from a branch". Con "Deploy from a branch" GitHub
> sirve el código fuente sin compilar (el `index.html` apunta a `/src/main.ts`, que solo
> existe en desarrollo) y la página se ve en blanco/azul oscuro sin cargar el juego.

## Ideas para futuros sueños

Quedan treinta y seis puertas en el edificio:

- 🎭 **El Teatro de los Nervios** — juego de ritmo/QTE: actuar en una obra sin conocer el guion.
- ✏️ **La Ciudad del Escritorio** — plataformas siendo diminuta: saltar entre lápices, libros y tazas gigantes.
- 📚 **La Biblioteca Infinita** — laberinto 100% roguelike generado en cada visita, con palabras que cobran vida.
- 🪞 **El Espejo** — puzzle controlando dos Iris espejadas a la vez.
- 🌊 **El Océano de Almohadas** — nado suave en un mundo pastel con gravedad de agua.
