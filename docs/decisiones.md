# Registro de decisiones — *Trasnocho*

Decisiones creativas y técnicas tomadas sin consultar, como pide el brief, con su porqué.

---

## D01 — Un juego nuevo, no una versión de *Duermevela*
- **Decisión**: descartar la historia, los personajes, las técnicas y las mecánicas de *Duermevela* y hacer un juego distinto. Se parte de la rama `claude/game-polish-graphics-story-7iqqls`, como dice el brief, pero solo se conserva la configuración de herramientas (Vite, TypeScript, ESLint, Prettier, Vitest, el flujo de Pages).
- **Por qué**: el pedido fue «una nueva versión completamente diferente». La rama `duermevela-edicion-definitiva` ya es la versión ampliada de esa historia; repetirla no aporta nada para comparar.

## D02 — Premisa: el tren nocturno
- **Decisión**: el último viaje de un tren nocturno de pasajeros entre Bogotá y Santa Marta. Cada camarote es el sueño de un pasajero. La protagonista es la revisora.
- **Por qué**: es una de las diez premisas de la lluvia de ideas del plan maestro («Tren nocturno: estructura lineal y fácil de producir; el paisaje real avanza por la ventana»). Le añade lo que al plan le faltaba en la premisa del edificio: un reloj (el amanecer), un antagonista con cara y una razón por la que todos van hacia algo difícil.

## D03 — Colombia, con habla regional
- **Decisión**: ambientar en Colombia y dar a cada pasajero el habla de su región (boyacense, chocoano en Bogotá, rolo, caleño, santandereano, momposino, paisa, costeño).
- **Por qué**: el plan pide «español con sabor local» y personajes que «hablen distinto entre sí». Un tren que cruza el país de la sabana al Caribe junta acentos de forma natural, y es un ángulo que *Duermevela* (mexicano) no tenía.

## D04 — Antagonista: el maquinista que no quiere llegar
- **Decisión**: Abel Ruano detiene el amanecer en el túnel porque al final de este viaje no hay vuelta: tendría que bajarse en la ciudad donde vive la hija que no le habla.
- **Por qué**: el brief pide un antagonista con motivos. Abel es el espejo de Celeste: él nunca se baja, ella nunca se queda. Los dos evitan llegar, y él le ofrece a ella lo que más quiere (un viaje que no termina).

## D05 — La guía también quiere algo (y esconde algo)
- **Decisión**: Mecha, la farola de señales, guía a Celeste; ella misma le dio a Abel el vidrio rojo con el que detiene el tren.
- **Por qué**: el plan señala que el guía de *Duermevela* «solo comenta». Mecha tiene miedo a que la desguacen, culpa, y un cambio de opinión a mitad del juego.

## D06 — Ocho sueños
- **Decisión**: seis pasajeros + el sueño del antagonista + el de la protagonista.
- **Por qué**: es el mínimo del rango del brief (8–10) y el plan recomienda «ocho sueños excelentes antes que doce regulares». Cada sueño tiene tres actos, sorpresa y ruptura, lo que pesa más que sumar niveles.

## D07 — Ocho técnicas nuevas, ninguna de las prohibidas ni de *Duermevela*
- **Decisión**: puntillismo, plastilina, cianotipia, neón, pintura de chiva, filigrana de plata, maqueta en 3D y óleo empastado; el tren (hub, menú, intro, final) en risografía.
- **Por qué**: el brief pide al menos cuatro técnicas que no sean gis, papel, acuarela, crayola ni pixel art. Para que la versión sea «completamente diferente», tampoco se repiten las de la edición definitiva (sombras, bordado, vitral, xilografía, cámara anecoica). Cada técnica sale del oficio o la herida del dueño (la filigrana del joyero, el plano azul de la ingeniera, los puntos de quien pierde la vista).

## D08 — Un solo sueño en 3D, con three.js cargado aparte
- **Decisión**: La Maqueta usa three.js en un lienzo debajo del de Phaser (que se vuelve transparente en esa escena para dibujar la interfaz). three.js se carga con `import()` dinámico solo al entrar a ese sueño.
- **Por qué**: el plan recomienda «un solo sueño en 3D sencillo (una maqueta)». Un motor 3D propio cuesta tiempo que conviene gastar en los sueños; la carga diferida evita que el resto del juego pague el peso.

## D09 — Todo el arte y el sonido por código
- **Decisión**: sin archivos de imagen ni de audio. Las técnicas se pintan por código en lienzos fuera de pantalla; la música es un secuenciador de Web Audio con instrumentos sintetizados. Tipografías libres (OFL) instaladas por npm (`@fontsource`).
- **Por qué**: el juego debe publicarse en GitHub Pages sin pasos manuales, y cada técnica necesita variar con el estado (puntos que se vuelan, neones que se funden, óleo que se termina de pintar), cosa que una imagen fija no permite.

## D10 — Controles de un dedo como diseño base
- **Decisión**: todo sueño se diseña primero para un dedo (tocar, mantener, arrastrar) y luego se le da equivalente de teclado. El pinball usa media pantalla por paleta: sigue siendo un dedo.
- **Por qué**: es una de las tres cosas fijas del brief, y el plan advierte que portar al revés (de teclado a táctil) cuesta más.

## D11 — Textos fuera del código, como datos tipados
- **Decisión**: todo texto vive en `src/i18n/es/` como objetos tipados (interfaz, tren, un archivo por sueño). Las escenas solo leen claves. Un test verifica que no haya cadenas vacías, que los diálogos respeten el máximo de dos líneas y que los marcadores `{x}` coincidan.
- **Por qué**: el brief exige textos en español separados del código, y el plan pide «máximo dos líneas por globo».

## D12 — Sueño 1: la lupa como punto de vista
- **Decisión**: la escena de Reme existe en dos capas de puntos: la que ella ve (puntos grandes, ralos y corridos con ruido) y la nítida, que solo aparece dentro de la lupa (máscara circular). Los tiquetes solo existen en la capa nítida. En el Acto III la lupa se raja y la búsqueda pasa al oído: cada objeto suena con volumen y paneo según la distancia, y un anillo pulsante alrededor de la lupa da la misma información a quien juega sin sonido.
- **Por qué**: la mecánica tenía que ser la metáfora de la degeneración macular (el centro deshecho en puntos) y su ruptura, la aceptación («ahora estamos iguales las dos»). El anillo visual evita que el Acto III sea imposible para personas sordas o con el celular en silencio.

## D13 — Modo de prueba `?auto`
- **Decisión**: cada sueño acepta `?auto` para jugarse solo (y los diálogos avanzan solos), además de `?skip`, `?act=N` y `?madrugada`.
- **Por qué**: el brief pide jugar cada nivel con el navegador automatizado y tomar capturas. Un bot dentro del propio sueño recorre los tres actos de forma reproducible.

## D14 — Sueño 2: maletas verificadas por un solucionador
- **Decisión**: las maletas son poliominós sobre una rejilla. Un solucionador por búsqueda exhaustiva (`src/data/samu.ts`) se usa en los tests para garantizar que cada maleta tiene solución contando los tiquetes, y que la del Acto III es imposible a propósito; el mismo solucionador juega el modo `?auto`. En PC se arrastra con el ratón; `R` gira la pieza que se arrastra.
- **Por qué**: un rompecabezas sin solución por error arruina el sueño, y el giro del Acto III («la maleta no cierra») solo funciona si de verdad no cierra. El ratón es el equivalente natural del dedo para arrastrar; un control de teclado completo para empacar se dejó fuera por costo.

## D15 — Sueño 3: física propia y planos verificados por simulación
- **Decisión**: la canica usa una física mínima de bola contra segmentos (`src/systems/physics2d.ts`, que también usará el pinball). Cada plano trae una solución de referencia y un test la simula para comprobar que se puede cruzar dentro de la tinta disponible, que no se cruza sin dibujar, y que en el Acto II (líneas que se rompen tras 1,2 s de contacto) la solución en tramos aguanta. Al soltar, la canica recibe un empujoncito hacia la meta.
- **Por qué**: un rompecabezas de física se rompe con cualquier ajuste de números; la simulación en los tests lo detecta antes que un jugador. La fatiga enseña sin decirlo que un puente largo se hace por tramos.

## D16 — Los intentos fallidos se guardan como borradores
- **Decisión**: cada intento fallido deja sus líneas como borrador. En el Acto III (sin tinta) aparecen los borradores de Marisol más los del jugador; tocarlos los pasa en limpio. El plano siempre trae borradores suficientes para cruzar, aunque el jugador no haya fallado nunca.
- **Por qué**: «el puente se hace con los errores» solo es verdad si los errores son del jugador; los borradores de base garantizan que el acto no dependa de haber fallado.

## D17 — Sueño 4: columpio de un dedo con impulso automático
- **Decisión**: mantener presionado engancha el letrero más conveniente por delante (marcado con un anillo); soltar suelta con un 8 % de impulso extra. Mientras cuelga, Celeste recibe un empuje tangencial hacia adelante. En el Acto II los letreros que solo encienden con la clave se sincronizan con el reloj real del audio (ventana de ~0,7 s por golpe) y se puede «adelantar» el toque: si se mantiene presionado, engancha en cuanto el letrero prende.
- **Por qué**: con un solo dedo no hay forma de «bombear» el columpio; el empuje automático deja la decisión en lo que importa (cuándo soltar). Ligar la mecánica a la clave 3-2 hace que la salsa no sea decoración sino la regla del acto.

## D18 — Sueño 5: pinball con paletas de velocidad real y una ruptura pasiva
- **Decisión**: las paletas son segmentos que giran; al chocar, la bola recibe la velocidad de la superficie de la paleta en el punto de contacto (no un rebote fijo). Un dedo en la mitad izquierda o derecha mueve esa paleta. En el Acto III solo se avanza dejando caer la bola sin tocar nada: la máquina tienta tres veces («¡Una más y ya!») y una bola en la que se tocó una paleta no cuenta.
- **Por qué**: un pinball sin golpe de paleta creíble no divierte. La ruptura tenía que ser lo contrario de la regla del sueño (mantener la bola viva) y de la adicción de Chepe (una más): ganar es no jugar.

## D19 — Sueño 6: los recuerdos falsos se ven, no se adivinan
- **Decisión**: en los brazos del río, el recuerdo verdadero brilla y el falso está opaco; las etiquetas («En la albarrada» / «En la estación») cuentan la vida de Efraín, pero elegir no exige saberla. En el Acto III el río corre al revés (los hilos de agua bajan) y se avanza remando con toques repetidos o manteniendo espacio.
- **Por qué**: castigar al jugador por no recordar datos de un personaje con alzhéimer sería cruel y aburrido; distinguir el brillo de la plata vieja es justo y coherente con el oficio de filigranero. Remar contra la corriente es la única mecánica de fuerza del juego, y está reservada para la ruptura de la regla «todo río va para abajo».
