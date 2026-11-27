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
