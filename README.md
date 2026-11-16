# 🚢 Hundir la Flota Online - Batalla Naval Multijugador en Tiempo Real

Aplicación web completa y moderna del clásico juego **Hundir la Flota** (*Battleship*) con arquitectura cliente-servidor en tiempo real, diseñada específicamente para ser alojada en un servidor propio con **Apache como Proxy Inverso** y **Node.js** con **Socket.IO**.

---

## 📋 Características Principales

1. **Multijugador Real entre Dispositivos:**
   - Dos jugadores reales pueden jugar desde ordenadores, móviles o tablets conectados a través de Internet o redes distintas.
   - Creación instantánea de salas privadas con código naval único (ej: `NAVAL-842`).
   - Enlace directo de invitación (`?room=NAVAL-842`) con botón para copiar al portapapeles y botón para compartir por WhatsApp con un solo toque.
   - Control estricto de aforo: máximo 2 jugadores por sala, impidiendo accesos no autorizados.

2. **Mecánica de Juego Clásica y Servidor Autoritativo (Anti-Trampas):**
   - Tablero táctico de 10x10 casillas (A-J, 1-10).
   - Flota oficial de 5 buques:
     - 1 Portaaviones (5 casillas)
     - 1 Acorazado (4 casillas)
     - 2 Cruceros (3 casillas cada uno)
     - 1 Destructor (2 casillas)
   - Despliegue interactivo con selector de barco, rotación (Horizontal / Vertical), colocación aleatoria táctica y validación de colisiones/límites.
   - **Privacidad estricta:** El servidor **NUNCA** envía las coordenadas de barcos ocultos al cliente rival; solo se revelan impactos y barcos hundidos.
   - Disparo por turnos: Agua (pasa el turno), Tocado (repite turno con impacto en buque), Hundido (aviso sonoro y revelación del barco destruido).

3. **Tolerancia a Desconexiones y Recuperación de Partida:**
   - Generación de token criptográfico único por jugador en `localStorage`.
   - Si un jugador refresca la página, cambia de red WiFi a datos móviles o se le apaga el dispositivo temporalmente, al volver a entrar a la web **recupera su partida en el punto exacto** donde estaba.
   - Aviso en tiempo real al rival si el oponente se desconecta o regresa.

4. **Chat Militar y Notificaciones en Tiempo Real:**
   - Chat interactivo integrado con filtro de caracteres y control de inundación.
   - Notificaciones automáticas de radar militar en tiempo real: *"Comandante se ha conectado"*, *"¡AGUA!"*, *"¡TOCADO!"*, *"¡BARCO HUNDIDO!"*, *"¡VICTORIA!"*.

5. **Efectos Visuales y Sonido Procedural Web Audio API:**
   - Estilo naval con fondo azul oscuro, tonos cian neón, radar y efectos de impacto/agua.
   - Efectos sonoros sintetizados en tiempo real mediante **Web Audio API** (ping de sonar, disparo, chapoteo de agua, explosión metálica, sirena de hundimiento y fanfarria).
   - Cero dependencias de archivos de sonido externos: sin errores 404 ni tiempos de carga.
   - Botón para silenciar/activar sonido persistente en el navegador.
   - Pestañas adaptativas en smartphones para alternar cómodamente entre el *Radar Enemigo* y *Mi Flota*.

6. **Persistencia y Resiliencia en Servidor:**
   - Base de datos **SQLite** embebida de alta velocidad con modo WAL.
   - Guarda el estado completo de salas y el histórico de partidas.

---

## 📁 Estructura del Proyecto

```text
hundir-la-flota/
├── .env.example                # Variables de entorno de ejemplo
├── .env                        # Variables de entorno activas
├── package.json                # Dependencias y scripts de npm
├── server.js                   # Servidor Express, Socket.IO, seguridad y rutas
├── ecosystem.config.js         # Configuración del gestor de procesos PM2
├── apache/
│   ├── hundir-la-flota.conf    # Configuración de VirtualHost Apache 2.4 (Proxy + WSS)
│   └── README_APACHE.md        # Guía paso a paso para Apache y Certbot
├── systemd/
│   └── hundir-la-flota.service # Archivo de servicio para inicio automático con systemd
├── src/
│   ├── db/
│   │   └── database.js         # Base de datos SQLite (salas, partidas y persistencia)
│   ├── game/
│   │   ├── Board.js            # Lógica matemática de tablero 10x10, barcos y disparos
│   │   ├── GameRoom.js         # Máquina de estados de sala, turnos y anti-trampas
│   │   └── RoomManager.js      # Gestor de salas en memoria y persistencia
│   └── utils/
│       └── codeGenerator.js    # Generador de códigos navales y tokens seguros
├── public/
│   ├── index.html              # Estructura de las 8 pantallas/secciones del juego
│   ├── css/
│   │   └── style.css           # Estilos temáticos navales, animaciones y responsive
│   └── js/
│       ├── sound.js            # Efectos de sonido procedurales con Web Audio API
│       ├── socket-client.js    # Enlace de WebSockets y reconexión automática
│       ├── board-ui.js         # Renderizado y manipulación de tableros
│       └── app.js              # Controlador principal de interfaz y eventos
└── test/
    ├── test-game.js            # Pruebas unitarias de reglas, barcos y turnos
    └── test-multiplayer-e2e.js # Prueba E2E de conexión multijugador en tiempo real
```

---

## 🛠️ Requisitos del Sistema

- **Sistema Operativo:** Linux (Ubuntu 20.04/22.04/24.04, Debian 11/12, CentOS/Rocky Linux 8/9).
- **Node.js:** Versión 18, 20 o 22 LTS (o superior).
- **Apache Web Server:** Versión 2.4 o superior.
- **npm:** Versión 8 o superior.

---

## 🚀 Instalación y Puesta en Marcha Paso a Paso

### 1. Clonar o subir el proyecto a tu servidor
Por ejemplo en el directorio `/var/www/hundir-la-flota`:
```bash
sudo mkdir -p /var/www/hundir-la-flota
sudo chown -R $USER:$USER /var/www/hundir-la-flota
cd /var/www/hundir-la-flota
```

### 2. Instalar las dependencias de Node.js
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
nano .env
```
Configura:
```ini
PORT=3005
HOST=127.0.0.1
NODE_ENV=production
APP_URL=https://batalla.tudominio.com
```

### 4. Probar las pruebas automatizadas
Para verificar que toda la lógica de juego y multijugador funciona al 100%:
```bash
npm test
```

---

## 🌐 Configuración de Apache 2.4 como Servidor Web y Proxy Inverso

Apache actuará como la puerta de entrada principal para gestionar el tráfico HTTPS y canalizar las conexiones WebSocket hacia Node.js en el puerto interno `3005`.

### 1. Activar los módulos de Apache necesarios
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl
sudo systemctl restart apache2
```

### 2. Copiar y activar el VirtualHost
```bash
sudo cp apache/hundir-la-flota.conf /etc/apache2/sites-available/hundir-la-flota.conf
sudo nano /etc/apache2/sites-available/hundir-la-flota.conf
```
*Edita `midominio.com` con tu dominio o subdominio.*

### 3. Generar certificado SSL gratuito con Let's Encrypt
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d midominio.com
```

### 4. Habilitar el sitio y reiniciar Apache
```bash
sudo a2ensite hundir-la-flota.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## 🔄 Arranque Automático del Servidor Node.js

Puedes utilizar **systemd** (nativo de Linux) o **PM2**:

### Opción A: Con Systemd (Recomendado para servidores Linux)

1. Copia el archivo de servicio:
```bash
sudo cp systemd/hundir-la-flota.service /etc/systemd/system/
```
2. Recarga systemd y activa el servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable hundir-la-flota
sudo systemctl start hundir-la-flota
```
3. Comprobar estado:
```bash
sudo systemctl status hundir-la-flota
```

### Opción B: Con PM2

1. Instalar PM2 globalmente:
```bash
sudo npm install -g pm2
```
2. Iniciar la aplicación:
```bash
pm2 start ecosystem.config.js --env production
```
3. Configurar persistencia al reiniciar el servidor:
```bash
pm2 save
pm2 startup
```

---

## 🧪 Guía de Pruebas: Verificación de Partida Real entre 2 Dispositivos

Para comprobar el juego de extremo a extremo entre dos personas reales:

### Dispositivo A (ej: Ordenador o Portátil):
1. Abre el navegador y visita tu dominio: `https://batalla.tudominio.com`.
2. Introduce tu nombre militar (ej: *Comandante Drake*) y pulsa **"CREAR SALA PRIVADA"**.
3. Llegarás a la *Sala de Espera*. Verás tu código naval (ej: `ALFA-482`) y el enlace de invitación.
4. Pulsa **"Copiar Enlace"** o **"Invitar por WhatsApp"** y envíaselo al Jugador B.

### Dispositivo B (ej: Teléfono Móvil o Tablet en otra red):
1. Abre el enlace recibido en el navegador del móvil (ej: `https://batalla.tudominio.com/?room=ALFA-482`).
2. El código ya aparecerá pre-rellenado. Introduce tu nombre (ej: *Almirante Nelson*) y pulsa **"Entrar a la Sala"**.
3. De forma instantánea, la pantalla de ambos dispositivos cambiará a la **Fase de Preparación de la Flota**.

### Fase de Despliegue:
1. En cada dispositivo, coloca los 5 barcos arrastrando/tocando la cuadrícula, o pulsa **"🎲 Aleatorio"**.
2. Cada jugador pulsa **"⚔️ ¡Listo para el Combate!"**.
3. Cuando ambos hayan pulsado el botón, se reproducirá el sonido de radar y la pantalla cambiará a la **Fase de Batalla**.

### Fase de Combate:
1. En la parte superior verás claramente el banner de turno:
   - Si es tu turno: *"🎯 ¡ES TU TURNO DE DISPARAR!"* con animación verde brillante.
   - Si es turno del rival: *"⏳ TURNO DEL RIVAL"*.
2. En tu turno, toca cualquier casilla del **Radar Enemigo**.
3. Ambos dispositivos escucharán el sonido y verán la notificación:
   - Si cae en agua: 💧 Chapoteo y pasa el turno.
   - Si impacta: 💥 Explosión metálica y puedes disparar de nuevo.
   - Si destruyes todas las casillas de un barco: 🚨 Sonido de alarma de hundimiento y el barco se revela como destruido en ambos tableros.
4. Escribe mensajes en el chat para verificar la mensajería en vivo.

### Prueba de Reconexión:
1. En el móvil, apaga el Wi-Fi o refresca la página mientras juegas.
2. Observa cómo en el ordenador aparece: *"El comandante ha perdido la conexión. Esperando reconexión..."*.
3. Vuelve a encender el Wi-Fi en el móvil o abre la página de nuevo.
4. La sesión se restaurará automáticamente sin perder ningún barco, disparo o turno.

### Fin de Partida y Revancha:
1. Al hundir el último barco, el ganador verá la pantalla de victoria con fanfarria y el perdedor la pantalla de derrota.
2. Pulsa **"Solicitar Revancha 🔄"** para volver a jugar inmediatamente sin tener que compartir un nuevo enlace.
