Control de extintores (matafuegos)

Sistema web para registrar y controlar los extintores de la escuela. Se escanea el código QR de la estampilla de la AGC (CABA), el sistema trae los datos del extintor, calcula su estado y los guarda en una planilla de Google Sheets.

Proyecto de la materia Desarrollo de Sistemas, desarrollado con el Modelo de Desarrollo Incremental.

Página en funcionamiento: https://rubenarias11.github.io/Matafuegos-programa/

Qué hace
Escanea el QR con la cámara del celular, o desde una foto del QR, o pegando el enlace.
Completa los datos solo, leyendo la página oficial de la AGC que abre el QR.
Muestra un resumen con las fechas importantes: último mantenimiento, prueba hidráulica, fabricación y vida útil.
Calcula el estado de cada extintor: vigente, por vencer (menos de 30 días) o vencido.
Guarda una foto de respaldo de la etiqueta, por si la física se borra o se rompe.
Registra cada extintor en Google Sheets, una fila por cada QR escaneado.
Datos que se leen de la AGC

Domicilio de instalación, empresa fabricante, empresa recargadora, fecha de mantenimiento y su vencimiento, fecha de fabricación, vencimiento de vida útil, vencimiento de la prueba hidráulica (PH), Nro. de tarjeta, agente extintor, capacidad, Nro. de extintor y uso.

La página de la AGC informa cuándo vence la prueba hidráulica, no cuándo se hizo. La fecha en que se hizo se calcula restando 5 años al vencimiento.

Cómo funciona
Celular (página web) --> escanea el QR --> Google Apps Script --> lee la página de la AGC
                                                  |
                          devuelve los datos <----+
Celular (página web) --> Guardar --> Google Apps Script --> fila nueva en Google Sheets

El navegador no puede leer directamente la página de la AGC, por eso se usa un script de Google Apps Script como intermediario. Los datos también quedan guardados en el navegador del dispositivo.

Tecnologías
HTML, CSS y JavaScript (sin librerías propias de interfaz)
jsQR para leer el QR cuando el navegador no tiene lector nativo
Google Apps Script y Google Sheets
GitHub Pages para publicar la página
Estructura del proyecto
Archivo	Para qué sirve
index.html	Estructura de la página
style.css	Diseño visual
script.js	Lectura del QR, formulario, cálculo de estados y guardado

El código del script de Google (doGet y doPost) vive en Google Apps Script, dentro de la planilla de Google Sheets.

Cómo usarlo
Abrir la página desde Chrome, con el link de arriba.
Tocar Escanear con cámara, o Foto del QR, o pegar el enlace del QR y tocar Usar.
Revisar los datos que se completaron solos.
Tocar Guardar.

Si la cámara en vivo no se activa, revisar el permiso de cámara en Chrome o usar Foto del QR.

Incrementos del desarrollo
Incremento	Contenido	Estado
1. Núcleo (caso ideal)	Escaneo del QR, carga automática de datos, estado con semáforo, foto de respaldo y guardado en Google Sheets	Hecho
2. Contingencias	Encontrar un extintor cuando el QR o la etiqueta están dañados: búsqueda por Nro. de extintor, Nro. de tarjeta o fabricante	Pendiente
3. Alertas y reportes	Listado de vencidos y por vencer, filtros y totales	Pendiente
4. Pruebas y entrega	Pruebas con usuarios, ajustes, manual de uso y presentación final	Pendiente
Limitaciones conocidas
Solo lee los QR de la AGC (Ciudad de Buenos Aires). Las estampillas de la DPS de Provincia de Buenos Aires usan otro sistema y todavía no están contempladas.
Si la AGC cambia el diseño de su página, la lectura automática puede dejar de funcionar y habría que ajustar el script.
Los datos guardados en el navegador son propios de cada dispositivo. Para tener todos juntos hay que mirar la planilla de Google Sheets.
La fecha de la última prueba hidráulica es una estimación calculada, no un dato oficial.
Mejoras futuras
Búsqueda de extintores sin QR (Incremento 2).
Registrar la ubicación exacta del extintor en la escuela.
Compatibilidad con las estampillas de la DPS.
Alertas automáticas de vencimientos.
