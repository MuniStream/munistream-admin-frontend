# H5 Multi-tenant Deployment - MuniStream Admin Frontend

Este documento describe la configuración de despliegue H5 multi-tenant para el panel administrativo de MuniStream.

## 🏗️ Arquitectura H5

La arquitectura H5 despliega **3 contenedores** del admin frontend en una sola instancia EC2 (Workflow), cada uno sirviendo a un cliente diferente con temas personalizados:

### 📋 Mapeo de Contenedores Admin Frontend

| Cliente | Container Name | Puerto Host | Puerto Interno | Tema | Base de Datos |
|---------|----------------|-------------|----------------|------|---------------|
| **Core** | `admin-panel-core` | `4000` | `3000` | Azul (#1976d2) | `munistream_core` |
| **Conapesca** | `admin-panel-conapesca` | `4001` | `3000` | Verde (#2e7d32) | `munistream_conapesca` |
| **Tesoreriacdmx** | `admin-panel-teso` | `4002` | `3000` | Rojo (#d32f2f) | `munistream_tesoreriacdmx` |

### 🌐 Routing ALB

El ALB dirige el tráfico basado en el dominio y path específico:

```
core-dev.munistream.local/admnpanel/admin/           → nginx → localhost:4000
conapesca-dev.munistream.local/admnpanel/admin/      → nginx → localhost:4001
tesoreriacdmx-dev.munistream.local/admnpanel/admin/  → nginx → localhost:4002
```

### 🎨 Personalización por Cliente

Cada contenedor incluye:
- **Título personalizado**: "MuniStream Admin - [Cliente]"
- **Tema de color**: Colores primarios específicos por cliente
- **Configuración Keycloak**: Realm específico por cliente
- **API endpoints**: URLs específicas por cliente

## 🚀 Archivos de Configuración

### `docker-compose.h5.yml`
Configuración Docker Compose para los 3 contenedores admin con temas específicos.

### `.env.h5`
Variables de entorno específicas para H5, incluyendo:
- URLs de base de datos por cliente
- Endpoints de API y Keycloak específicos
- Configuración de temas y colores
- Puertos de admin por cliente

### `deploy-h5.sh`
Script de despliegue inteligente que:
- Verifica contenedores existentes
- Despliega solo contenedores modificados
- Aplica temas específicos por cliente
- Verifica health checks

## 🔧 Despliegue Local

Para probar localmente:

```bash
# 1. Configurar variables de entorno
export AURORA_ENDPOINT="munistream-dev-cluster.cluster-ckf4usc8u21l.us-east-1.rds.amazonaws.com"
export DB_PASSWORD="your-db-password"

# 2. Ejecutar despliegue H5
./deploy-h5.sh

# 3. Verificar contenedores
docker-compose -f docker-compose.h5.yml ps

# 4. Acceder a los paneles admin
open http://localhost:4000  # Core Admin
open http://localhost:4001  # Conapesca Admin
open http://localhost:4002  # Tesoreriacdmx Admin
```

## 🔄 CI/CD Pipeline

### Rama `develop`
- **Trigger**: Push a la rama `develop`
- **Target**: Workflow EC2 instance (dev environment)
- **Acción**: Despliega solo contenedores admin modificados

### Despliegue Selectivo por Cliente
```bash
# Desplegar solo cliente específico
./deploy-h5.sh false core          # Solo Core admin
./deploy-h5.sh false conapesca     # Solo Conapesca admin
./deploy-h5.sh false tesoreriacdmx # Solo Tesoreriacdmx admin

# Forzar rebuild de todos
./deploy-h5.sh true all
```

## 🗂️ Variables de Entorno por Cliente

### Core Admin (Puerto 4000)
```yaml
CLIENT_NAME: core
VITE_APP_TITLE: "MuniStream Admin - Core"
VITE_THEME_PRIMARY_COLOR: "#1976d2"
VITE_API_URL: http://localhost:8000/api/v1
VITE_KEYCLOAK_URL: http://localhost:9000
VITE_KEYCLOAK_REALM: core
```

### Conapesca Admin (Puerto 4001)
```yaml
CLIENT_NAME: conapesca
VITE_APP_TITLE: "MuniStream Admin - Conapesca"
VITE_THEME_PRIMARY_COLOR: "#2e7d32"
VITE_API_URL: http://localhost:8001/api/v1
VITE_KEYCLOAK_URL: http://localhost:9001
VITE_KEYCLOAK_REALM: conapesca
```

### Tesoreriacdmx Admin (Puerto 4002)
```yaml
CLIENT_NAME: tesoreriacdmx
VITE_APP_TITLE: "MuniStream Admin - Tesorería CDMX"
VITE_THEME_PRIMARY_COLOR: "#d32f2f"
VITE_API_URL: http://localhost:8002/api/v1
VITE_KEYCLOAK_URL: http://localhost:9002
VITE_KEYCLOAK_REALM: tesoreriacdmx
```

## 🔍 Monitoring y Logs

### Verificar Estado de Contenedores Admin
```bash
docker-compose -f docker-compose.h5.yml ps
```

### Ver Logs por Cliente
```bash
# Todos los contenedores admin
docker-compose -f docker-compose.h5.yml logs

# Admin específico
docker-compose -f docker-compose.h5.yml logs admin-panel-conapesca
docker-compose -f docker-compose.h5.yml logs admin-panel-core
docker-compose -f docker-compose.h5.yml logs admin-panel-teso
```

### Health Check
```bash
# Verificar que todos los paneles admin respondan
curl http://localhost:4000  # Core Admin
curl http://localhost:4001  # Conapesca Admin
curl http://localhost:4002  # Tesoreriacdmx Admin
```

## 🔗 Integración con Otros Servicios

### API Backend
- Cada admin panel apunta a su API correspondiente:
  - Core Admin → API `localhost:8000`
  - Conapesca Admin → API `localhost:8001`
  - Tesoreriacdmx Admin → API `localhost:8002`

### Keycloak Authentication
- Cada admin panel usa su realm específico:
  - Core → `localhost:9000/realms/core`
  - Conapesca → `localhost:9001/realms/conapesca`
  - Tesoreriacdmx → `localhost:9002/realms/tesoreriacdmx`

### Citizen Portal Integration
- Los admins gestionan los datos del portal ciudadano correspondiente
- Mismas bases de datos por cliente

## 🎨 Personalización Visual

### Temas por Cliente
- **Core**: Azul corporativo (#1976d2)
- **Conapesca**: Verde institucional (#2e7d32)
- **Tesoreriacdmx**: Rojo gubernamental (#d32f2f)

### Elementos Personalizables
- Título de la aplicación
- Color primario del tema
- Logo del cliente (futura implementación)
- Configuraciones específicas del flujo de trabajo

## 📚 Próximos Pasos

1. ✅ **Admin Frontend H5** configurado
2. **Configurar** API Backend (`munistream-workflow`)
3. **Configurar** Keycloak realms (`munistream-keycloak`)
4. **Configurar** Airflow DAGs (`munistream-orchestra`)
5. **Integrar** logos y branding por cliente

## 🆘 Troubleshooting

### Contenedores Admin no inician
```bash
# Verificar logs
docker-compose -f docker-compose.h5.yml logs admin-panel-core

# Verificar puertos
netstat -tlnp | grep -E ':(4000|4001|4002)'

# Limpiar y reiniciar
docker-compose -f docker-compose.h5.yml down --remove-orphans
./deploy-h5.sh true all
```

### Temas no se aplican correctamente
```bash
# Verificar variables de entorno del contenedor
docker exec admin-panel-core env | grep VITE_THEME

# Reconstruir con variables actualizadas
./deploy-h5.sh true core
```

### Problemas de autenticación Keycloak
```bash
# Verificar configuración Keycloak por cliente
docker exec admin-panel-conapesca env | grep KEYCLOAK

# Verificar conectividad a Keycloak
curl http://localhost:9001/realms/conapesca
```