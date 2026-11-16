# Guía de Instalación y Configuración en Servidor Apache

Esta guía describe paso a paso cómo configurar **Apache como Proxy Inverso** con soporte de **WebSockets (WSS/HTTPS)** para servir el juego Hundir la Flota Online en producción.

---

## 1. Requisitos Previos

1. Servidor Linux (Ubuntu, Debian, AlmaLinux, Rocky o CentOS).
2. Servidor web Apache 2.4+ instalado.
3. Node.js (versión 18, 20 o 22 LTS) y npm instalados.
4. Nombre de dominio o subdominio apuntando a la IP pública de tu servidor (ej: `batalla.tudominio.com`).

---

## 2. Habilitar Módulos Necesarios en Apache

En distribuciones basadas en Debian/Ubuntu:

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl
sudo systemctl restart apache2
```

En distribuciones basadas en RedHat/CentOS:
Asegúrate de que `mod_proxy`, `mod_proxy_wstunnel` y `mod_ssl` estén cargados en `/etc/httpd/conf.modules.d/`.

---

## 3. Instalar la Configuración del VirtualHost

1. Copia el archivo `apache/hundir-la-flota.conf` al directorio de sitios disponibles:

```bash
sudo cp apache/hundir-la-flota.conf /etc/apache2/sites-available/hundir-la-flota.conf
```

2. Edita el archivo y reemplaza `midominio.com` por tu nombre de dominio real:

```bash
sudo nano /etc/apache2/sites-available/hundir-la-flota.conf
```

3. Si aún no tienes certificados SSL, puedes generar un certificado gratuito con Let's Encrypt (Certbot).

---

## 4. Obtención de Certificado SSL Gratuito con Certbot

Instala Certbot:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-apache
```

Genera el certificado para tu dominio:

```bash
sudo certbot --apache -d tudominio.com -d www.tudominio.com
```

Certbot actualizará automáticamente las rutas de los certificados SSL en tu configuración de Apache.

---

## 5. Activar el Sitio y Verificar Configuración

1. Habilita el sitio:

```bash
sudo a2ensite hundir-la-flota.conf
```

2. Comprueba que no existan errores de sintaxis en Apache:

```bash
sudo apache2ctl configtest
```

Debe responder: `Syntax OK`.

3. Recarga Apache para aplicar los cambios:

```bash
sudo systemctl reload apache2
```

---

## 6. Probar Conexión WebSocket desde Internet

Una vez iniciado el servidor Node.js en el puerto 3000 (mediante systemd o PM2), accede desde tu navegador a:

`https://tudominio.com`

Abre la consola de desarrollo del navegador (`F12` -> pestaña *Console* o *Red/Network* -> filtro *WS*):
- Debes ver la conexión WebSocket establecida con estado HTTP 101 Switching Protocols.
- El juego sincronizará las salas en tiempo real entre ordenadores, tablets y teléfonos móviles.
