#!/bin/bash
# ==============================================================================
# Script de Despliegue y Actualización Automática - Hundir la Flota Online
# ==============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=================================================="
echo "⚡ [Hundir la Flota] Iniciando actualización..."
echo "📅 Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="

# 1. Obtener los últimos cambios de GitHub
if [ -d ".git" ]; then
  echo "🔄 [1/4] Descargando últimos cambios desde GitHub (main)..."
  git fetch origin main || git pull origin main || true
  git reset --hard origin/main || true
fi

# 2. Instalar dependencias
echo "📦 [2/4] Instalando dependencias de Node.js..."
npm install --omit=dev

# 3. Desplegar a /var/www/hundir-la-flota preservando .env y base de datos
echo "📂 [3/4] Sincronizando archivos a /var/www/hundir-la-flota..."
mkdir -p /var/www/hundir-la-flota
rsync -av --exclude='.git' --exclude='.env' --exclude='data' ./ /var/www/hundir-la-flota/
chown -R www-data:www-data /var/www/hundir-la-flota

# 4. Reiniciar PM2
echo "🚀 [4/4] Reiniciando servicio en PM2..."
pm2 restart hundir-la-flota || pm2 start /var/www/hundir-la-flota/ecosystem.config.js --env production
pm2 save

echo "=================================================="
echo "✅ ¡Juego actualizado y desplegado con éxito!"
echo "=================================================="
