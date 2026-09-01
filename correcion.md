Lo que el front de recepción necesita saber
Guía de los endpoints nuevos: mesas, teléfono/WhatsApp por invitado y confirmación de amigos. Ya está desplegado en producción.

Base URL
https://backinvitacionc.vercel.app
En esta página

Familias
Enviar invitación (WhatsApp)
Mesas
Amigos
Notas importantes
01

Familias
Sin cambios en el CRUD de siempre, pero cada familia ahora trae telefono, tipo y un whatsappLink ya calculado.

GET
/guests
Familias pendientes de confirmar

Sigue devolviendo solo status !== "confirmed", envuelto en { data, total, limit, skip }. Ojo: ver nota en "Notas importantes" — ahora también pueden aparecer aquí amigos sin confirmar.

POST
/guests
Crear familia

Campo	Tipo	Notas
name	string	Requerido
count	number	Requerido — personas invitadas
table	number	Opcional. Entero positivo (ya no hay tope de 24)
telefono	string	Opcional — habilita whatsappLink
PATCH
/guests/:id
Actualizar (confirmar asistencia, cambiar mesa, agregar teléfono, etc.)

Acepta cualquier subconjunto de los campos de arriba. `table` ya acepta cualquier entero positivo, sin tope de 24.

GET
/guests/:id
DELETE
/guests/:id
Sin cambios — obtener o borrar una familia por id.

02

Enviar invitación por WhatsApp
No hay un botón "enviar masivo" automático. En su lugar, cada invitado (familia o amigo) con telefono trae un link listo.

whatsappLink — presente en las respuestas de /guests, /guests/:id, /amigos

Es un link https://wa.me/<numero>?text=<mensaje>. Al abrirlo se abre WhatsApp (Web o app) con el destinatario y el mensaje ya escritos — alguien de recepción le da "Enviar" manualmente, desde su propio WhatsApp.

{
  "name": "Familia Luna",
  "telefono": "9671636739",
  "whatsappLink": "https://wa.me/529671636739?text=..."
}
Es null cuando no hay telefono — usa eso para deshabilitar u ocultar el botón "Enviar invitación" de esa fila.

03

Mesas
Vista para el día del evento: 24 mesas fijas, cada una con las familias asignadas.

GET
/mesas
Las 24 mesas con sus familias

Siempre trae las 24, aunque estén vacías. Al hacer clic en una mesa en el front, muestra familias de ese objeto — ya viene con nombre y pases, no hace falta otra llamada.

{
  "data": [
    { "mesa": 1, "familias": [
      { "id": "1", "name": "Familia García", "pases": 3 }
    ]},
    { "mesa": 2, "familias": [] }
  ]
}
Los amigos nunca tienen mesa (table: null), así que nunca aparecen aquí.

04

Amigos
Invitados individuales sin familia ni mesa. Son dos flujos separados a propósito — no se conectan entre sí.

POST
/amigos
Recepción registra el contacto (para poder enviarle la invitación)

Campo	Tipo	Notas
name	string	Requerido, o 400
telefono	string	Requerido, o 400
Queda con status: "pending" — todavía no ha confirmado nada, solo tienes su contacto y su whatsappLink.

POST
/amigos/confirmar
El invitado confirma que sí va a venir — botón "Soy amigo/a" en la invitación

Campo	Tipo	Notas
name	string	Requerido, o 400
Crea un registro nuevo e independiente, ya confirmed. No busca ni actualiza lo que haya registrado recepción con POST /amigos — si es la misma persona, van a existir dos filas. Si el invitado responde que no va a venir, el front no debe llamar a nada; no hay dato que guardar.

GET
/amigos
Listar amigos — con filtro opcional por estado

Query	Resultado
(sin filtro)	Todos los amigos, confirmados o no
?status=confirmed	Quiénes van a llegar
?status=pending	Contactos registrados, sin confirmar
05

Notas importantes
1
GET /guests mezcla familias y amigos pendientes
Un amigo recién registrado con POST /amigos (status pending) va a aparecer ahí junto con las familias. Si tu lista de "pendientes" es solo para familias, filtra por tipo === "familia" del lado del front.

2
No existe un "ver todas las familias confirmadas" de un solo endpoint
Para familias confirmadas con mesa, están en GET /mesas. Para una familia puntual, GET /guests/:id. Si necesitas una lista completa de confirmados (familias + amigos) para el día del evento, avísame y lo agregamos.

3
Los dos flujos de amigos no se cruzan
POST /amigos (recepción) y POST /amigos/confirmar (el invitado) no buscan coincidencias por nombre. Es normal ver el mismo nombre dos veces: una vez como contacto pendiente, otra vez como confirmado.

4
No uses POST /guests/enviar-invitaciones todavía
Existe en el backend pero está en pausa — depende de una cuenta de Twilio con WhatsApp Business aprobado por Meta, que no tenemos lista. Todo el envío hoy es manual vía whatsappLink.