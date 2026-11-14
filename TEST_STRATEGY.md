# Estrategia de Pruebas y Arquitectura E2E — Catálogo Liverpool

## 1. ¿Qué no automatizarías en este flujo y por qué?
Debemos tener en cuenta que el uso de playwright para pruebas de ui son lentas y pesadas debido a la gran cantidad de estilos y animaciones que tienen ciertos sitios web, por lo tanto debemos ser prudentes y usar playwright solamente para validar la experiencia dentro del ambiente web, en este ambiente no automatizaria muchos productos desde la interfaz de usuario, pero si usaria playwright para que con la API pueda hacer puebas con un gran volumen de datos.
ya que las peticiones van directas al servidor, sin estilos ni animaciones.

## 2. Gestión de un CAPTCHA en el flujo de búsqueda
En este caso debemos tener en cuenta que la finalidad de un captcha es precisamente un filtro de bots no es prudente forzar el captcha con plugins para resolverlos por esa razon podemos atacar esta situación co la ayuda de una puerta trasera controlada con el equipo de QA y seguridad

## 3. Riesgos de inestabilidad (*Flakiness*) y mitigaciones implementadas
Uno de los problemas mas notorios en esta prueba fue cuando en nuestro modulo que extraia el costo de las tarjetas de nuestros productos nos causaba un bug en el programa debido a que el precio de la UI salía sin punto decimal (24430) porque React mete los centavos en un <sup> separado, la documentacion realizada nos permitio tener en cuenta que las paginas modernas al trabajar estan sujetas a cambios, dichos cambios que pueden afectarnos pero al tener modulos de testeo y documentacion interna podemos mitigar dichos cambios.


## 4. Si tuvieras que añadir esto a la pipeline de CI de un equipo ejecutando 50+ suites de pruebas más, ¿qué cambiarías?
lo que yo haria es quitar esperas estaticas con 50 suites el tener pausas estaticas lo vuelve contraproducente y nada viable con mas de 50 suites, tambien  debemos evitar el riesgo de rate limiting tambien es contra producente para produccion realizar tantas peticiones porque el sistema de seguridad de liverpoool por ejemplo que esta protegido por akamai esto detecta miles de busquedas y puede aplicar bloqueos temporales o cortes de conexion.
tambien anfrontaria esta situacion usando fragmentacion usando un arreglo de maquinas virtuales para que en cada una se ejecutan pruebas de 25 en 25

