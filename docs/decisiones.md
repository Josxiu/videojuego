# Registro de Decisiones Creativas y Técnicas — *Duermevela*

Este documento registra cada decisión tomada de forma autónoma durante el desarrollo, junto con su justificación narrativa, visual o técnica.

---

## D01 — Estructura de 10 sueños en 3 actos del edificio
- **Decisión**: Expandir el prototipo de 5 sueños a **10 sueños** (9 vecinos/antagonista + 1 sueño propio de Iris como clímax), organizados en 3 actos del Hub (3 + 4 + 2 + clímax).
- **Por qué**: El rango pedido es 8–10 sueños y 60–90 minutos. Con 10 sueños (y 3 actos internos dentro de cada uno) logramos conservar y profundizar los 5 originales e introducir **5 técnicas visuales completamente nuevas** (superando el mínimo de 4) sin apresurar la curva dramática ni diluir la calidad individual de cada nivel.

## D02 — Antagonista: Octavio Bravo (6A), ingeniero acústico y duelista del silencio
- **Decisión**: Crear a Octavio Bravo como dueño/administrador reciente del 6A que está aislando herméticamente el tiro de luz para «evitar que el sufrimiento de unos contamine el descanso de otros», en lugar de usar un monstruo abstracto o un casero codicioso genérico.
- **Por qué**: La premisa de Iris (once días con audífonos para no oír a sus vecinos) ya plantea una tentación real. Un antagonista que representa la versión extrema y trágicamente bienintencionada de esa misma huida —por el duelo de su esposa Elena— convierte el conflicto en un espejo moral para Iris, no en un trámite burocrático con Morfeo.

## D03 — Cinco técnicas visuales nuevas (sin repetir gis, papel, acuarela, crayola ni pixel art)
- **Decisión**: Incorporar:
  1. **Teatro de Sombras / Linterna Mágica** (Goyo, 1B): siluetas articuladas sobre proyector de carbón y acetatos de color.
  2. **Bordado Textil / Punto de Cruz sobre Lino** (Renata, 2B): tejido visible, aro de bastidor y puntadas con relieve.
  3. **Vitral Emplomado Translúcido** (Paloma, 4A): teselas Voronoi, plomo metálico y haces de refracción cromática.
  4. **Xilografía / Grabado en Linóleo** (Mateo, 3A): papel algodón, talla en negro/índigo con marcas de gubia, *cross-hatching* y sellos de lacre.
  5. **Arquitectura 3D en Primera Persona** (Octavio, 6A): cámara anecoica tridimensional con proyección perspectiva en tiempo real y ondas de ecolocalización.
- **Por qué**: Cada técnica está atada materialmente al oficio del vecino (cineasta, costurera, restauradora de vitrales, grabador, ingeniero acústico) y ofrece un contraste visual inmediato con los cuatro materiales anteriores. Además, extiende `stylize.ts` para que Iris y Morfeo se re-dibujen literalmente en esas texturas.

## D04 — Motor 3D propio en Canvas/WebGL sin dependencias externas pesadas
- **Decisión**: Implementar `src/gfx/engine3d.ts` como motor de proyección 3D matemática propia (clipping en plano cercano, ordenamiento de caras, iluminación por distancia/niebla, rejilla de perspectiva y anillos de pulso sonoro 3D) renderizado dentro del ciclo de Phaser en lugar de añadir Three.js.
- **Por qué**: El proyecto cuenta con una prueba automatizada de **degradación sin WebGL (Canvas)** y apunta a ejecutarse ligero tanto en navegador de escritorio como en celular. Un motor 3D ligero sobre Canvas2D dentro de Phaser garantiza 60 FPS, cero problemas de contexto WebGL dual, tamaño mínimo de bundle y compatibilidad absoluta con modo Canvas y WebGL.

## D05 — Todo texto en español separado del código (incluyendo preguntas y datos)
- **Decisión**: Refactorizar `src/i18n/es.ts` en submódulos ordenados por acto/sueño (`src/i18n/es/*.ts`) manteniendo una única exportación tipada `es`, y mover allí los textos que antes vivían en `src/data/examQuestions.ts` y `src/data/fallBiomes.ts`.
- **Por qué**: Cumplir estrictamente el requisito de textos en español separados del código y garantizar que los tests automáticos validen acentos, marcadores `{var}`, nombres propios y ausencia de claves rotas conforme el guion crece de 300 a +1,400 líneas.

## D06 — Controles de un dedo garantizados en los 10 sueños
- **Decisión**: Cada mecánica nueva y mejorada se diseña primero para interacción táctil continua con un solo pulgar/dedo (arrastre direccional, toque corto/largo, deslizamiento, stick virtual flotante de una mano en 3D y top-down), manteniendo atajos cómodos en teclado y ratón para PC.
- **Por qué**: Evita botones diminutos simultáneos en pantallas móviles y asegura que tanto en PC como en celular la sensación de respuesta sea inmediata e intuitiva.

## D07 — Sistema unificado de 3 actos internos, Sorpresa y Final que rompe su propia regla
- **Decisión**: Cada sueño implementa explícitamente una máquina de fases `Acto 1 → Acto 2 (+ Sorpresa) → Acto 3 (+ Ruptura de la regla central)` con indicador visual sutil y música por capas dinámicas (`setMusicLevel`).
- **Por qué**: En el prototipo original varios sueños mantenían una sola dinámica de principio a fin (excepto Tomás al sentarse). Estructurar los 10 niveles con tres actos y un cierre subversivo garantiza arco dramático, variedad jugable y resonancia emocional en todos ellos.

## D08 — Coleccionables con sentido, Secretos y Modo Desvelo
- **Decisión**:
  - Las **60 luciérnagas** (6 por sueño, almacenadas de forma permanente por ID para evitar frustración al rejugar) desbloquean relatos en el **Álbum del Entresueño**, potencian la orquestación visual y sonora del **Sueño 10** y habilitan los finales superiores.
  - Cada sueño incluye **1 secreto** ligado a su metáfora humana.
  - Completar un sueño desbloquea en su puerta el **Modo Desvelo** (variante difícil con modificador de reglas) que otorga medalla y mención en el epílogo.
- **Por qué**: Convertir los coleccionables en memoria narrativa, música y estado del mundo da peso real a explorar y rejugar sin inflar el juego con relleno artificial.

## D09 — Ramificación de finales con elección reversible antes del cierre
- **Decisión**: Incorporar una decisión moral frente a Octavio tras el 6A (aceptar el aislamiento *Cámara Anecoica* u oponerse para abrir el Entresueño) más 3 gradaciones del amanecer (*Tregua Frágil*, *Desayuno en el 4B*, *El Girasol Despierto*) construidas dinámicamente según luciérnagas, secretos, calificación de Élmer y hazañas de Desvelo.
- **Por qué**: Hace que el jugador sienta que sus acciones —incluso escuchar con atención o ayudar en Desvelo— determinan qué edificio Girasol amanece al día siguiente.
