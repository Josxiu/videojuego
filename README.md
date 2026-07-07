# 🌙 Duermevela

*Un juego sobre no poder despertar.*

Iris, una estudiante agotada tras semanas sin dormir bien, se queda dormida la noche
antes de un día importante… y queda atrapada en **El Entresueño**, el pasillo entre
sus propios sueños. Con la ayuda de **Morfeo** —un gato de humo que habla— debe
cruzar tres puertas y recuperar las **Llaves del Despertar**. Cada sueño es un mundo
distinto, con su propio género, mecánicas y estilo de pixel art.

## Los sueños

| Sueño | Género | Mecánica |
|---|---|---|
| 🏫 **El Examen Infinito** | runner cómico | salta y deslízate llegando tarde al examen |
| 🌌 **La Caída Sin Fin** | arcade vertical | esquiva restos de sueños mientras caes |
| 🌲 **El Bosque de los Recuerdos** | exploración/puzzle | enciende los ecos de memoria en orden |
| 👁 **La Persecución** (pesadilla final) | sigilo/escape · roguelike | escóndete de la Sombra; si te atrapa, el sueño se reorganiza |

Coleccionable: **luciérnagas de memoria** repartidas por los sueños.
Con las 3 llaves, la Puerta del Despertar aún no abre: aparece una cuarta puerta
oscura — la pesadilla — con una estética completamente distinta (mundo de siluetas
sin color) y un elemento roguelike: cada captura reorganiza los escondites.

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
npm run test:smoke # smoke test con Playwright (requiere npm run dev activo)
```

### Cómo está hecho

- **Phaser 3 + TypeScript + Vite**, sin backend.
- **Pixel art en runtime**: los sprites están definidos como mapas de texto en
  `src/gfx/sprites.ts` (una letra = un color) y se convierten en texturas al arrancar.
  No hay archivos de imagen en el repo.
- **Audio chiptune procedural**: música y efectos generados con Web Audio API en
  `src/systems/AudioManager.ts`. No hay archivos de audio.
- **Textos**: todos en `src/i18n/es.ts`, listos para traducir a más idiomas.
- **Progreso**: guardado en `localStorage`.

### Publicación

El workflow `.github/workflows/deploy.yml` publica el juego en **GitHub Pages** en
cada push. Solo hay que activarlo una vez en el repo:
*Settings → Pages → Source: GitHub Actions*.

## Ideas para futuros sueños

- 🎭 **El Teatro de los Nervios** — juego de ritmo/QTE: actuar en una obra sin conocer el guion.
- ✏️ **La Ciudad del Escritorio** — plataformas siendo diminuta: saltar entre lápices, libros y tazas gigantes.
- 📚 **La Biblioteca Infinita** — laberinto 100% roguelike generado en cada visita, con palabras que cobran vida.
- 🪞 **El Espejo** — puzzle controlando dos Iris espejadas a la vez.
- 🌊 **El Océano de Almohadas** — nado suave en un mundo pastel con gravedad de agua.
