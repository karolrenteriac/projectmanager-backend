# Backend - Project Manager

Backend API para el sistema de gestión de proyectos con sistema de invitaciones y roles.

## Estructura del Proyecto

```
backend/
├── src/
│   ├── controllers/         # Controladores de API
│   │   ├── authController.js
│   │   ├── invitationController.js
│   │   └── ...
│   ├── services/           # Lógica de negocio
│   │   ├── userService.js
│   │   ├── invitationService.js
│   │   └── ...
│   ├── models/             # Modelos Mongoose
│   │   ├── user.js
│   │   ├── invitation.js
│   │   └── ...
│   ├── routes/             # Definición de rutas
│   │   ├── authRouters.js
│   │   ├── invitationRoutes.js
│   │   └── ...
│   ├── middleware/         # Middlewares
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── dtos/               # Data Transfer Objects
│   │   ├── userDto.js
│   │   ├── invitationDto.js
│   │   └── ...
│   ├── constants/          # Constantes centralizadas
│   │   ├── roles.js
│   │   └── index.js
│   ├── utils/              # Utilidades
│   ├── errors/             # Manejo de errores
│   ├── sockets/            # Configuración de sockets
│   ├── config/             # Configuración
│   ├── app.js              # Configuración de Express
│   └── server.js           # Punto de entrada
├── package.json
├── package-lock.json
└── .gitignore
```

## Características

- **Sistema de Invitaciones**: Creación y gestión de invitaciones con tokens seguros
- **Gestión de Roles**: Admin, Coordinator, Principal, Co-researcher
- **Autenticación JWT**: Sistema seguro de autenticación
- **Validaciones**: Validaciones robustas en todos los endpoints
- **DTOs**: Transformación consistente de datos
- **Manejo de Errores**: Sistema centralizado de manejo de errores

## Instalación

```bash
npm install
```

## Variables de Entorno

Asegúrate de configurar las siguientes variables de entorno:

- `JWT_SECRET`: Secreto para tokens JWT
- `MONGODB_URI`: URL de conexión a MongoDB

## Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión

### Invitaciones (solo admin)
- `POST /api/invitations` - Crear invitación
- `GET /api/invitations` - Listar invitaciones
- `GET /api/invitations/:token` - Verificar invitación

## Scripts

```bash
npm start      # Iniciar servidor
npm dev        # Modo desarrollo (si está configurado)
npm test       # Ejecutar tests
```

## Arquitectura

El proyecto sigue una arquitectura modular y limpia:

- **Controllers**: Manejan las peticiones HTTP
- **Services**: Contienen la lógica de negocio
- **Models**: Definen la estructura de datos
- **DTOs**: Transforman los datos para las respuestas API
- **Middleware**: Manejan autenticación y autorización
- **Constants**: Centralizan configuraciones y constantes
