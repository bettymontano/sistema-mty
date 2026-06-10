********************   SISTEMA MONTERREY   ********************
******************** Beatriz Montaño, 2026 ********************

Sistema Monterrey es una visualización de datos sobre la calidad del aire en la ciudad de Monterrey durante el 2024.
Cada día del año es representado por un "petri dish", o un plato de cultivo de laboratorio, y la contaminación del aire
se vuelve colonias de moho. Mientras más sucio estuvo el aire (medido en partículas PM2.5, las más pequeñas y capaces
de entrar en los pulmones), más moho brota y más oscuro se ve el cultivo.


-------------------- Sobre la Idea --------------------
Es difícil para alguien que no es un experto entender qué significan los datos de contaminación que vemos anunciados en 
las noticias. Son números invisibles y abstractos que no nos dicen gran cosa. Quise convertir ese número en algo que 
se pudiera ver, y que diera incluso un poquito de asco (como debería). Darnos cuenta que un número que puede parecernos
"bajo" porque no tenemos contra qué compararlo, es en realidad bastante dañino, nos mantiene informados como sociedad
y nos motiva a exigir mejoras a las políticas ambientales del estado.

-------------------- ¿Cómo funciona? --------------------
- Elige cualquier fecha del 2024 (el día de hoy es seleccionado por defecto) y mira crecer la huella de las partículas
que respiramos ese día.
- Según el nivel de contaminación del día elegido, el código de JavaScript decide más o menos cuántas manchas de moho
hacer crecer y las agrupa en clusters orgánicos, como se verían las colonias de moho reales. Éstos crecen en 5 etapas,
en forma de stop motion, para dar una apariencia casi como de zombies.
- El color del plato y la densidad de la colonia de moho son 100% dictados por datos reales, obtenidos de SINAICA y SIMA.
- Cada mancha es clickeable. Puedes hacerla desaparecer al hacerle clic, pero otra nueva crecerá en su lugar siempre.

-------------------- Contenidos --------------------
- index.html : La estructura base del proyecto
- styles.css : Estilos, animaciones y responsividad
- script.js : Funciones que manejan la colonia de hongos, interactividad, el calendario y las animaciones
- data.json : "API" local, con los daots de lecturas diarias de PM2.5 del 2024
- assets/ : Fuentes, imágenes y texturas
