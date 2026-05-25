README - Backend
Plataforma de Gestión Colaborativa de Proyectos de Investigación

Backend desarrollado con Node.js, Express.js, Socket.io y MongoDB para la gestión colaborativa de proyectos de investigación académica.

Tecnologías Utilizadas
Node.js
Express.js
MongoDB + Mongoose
Socket.io
JWT Authentication
bcryptjs
Multer
Cloudinary / almacenamiento de archivos
Docker
Nginx
AWS EC2
Arquitectura del Backend

El backend fue desarrollado bajo una arquitectura modular basada en APIs REST y comunicación en tiempo real mediante WebSockets.

Módulos principales
Módulo	Descripción
auth	Autenticación y autorización
users	Gestión de usuarios
projects	Gestión de proyectos
tasks	Gestión de tareas
files	Gestión documental
chat	Mensajería en tiempo real
notifications	Notificaciones
reports	Generación de reportes
dashboard	Métricas y estadísticas
Instalación del Proyecto
1. Clonar repositorio
git clone https://github.com/USUARIO/backend-investigacion.git
cd backend-investigacion
2. Instalar dependencias
npm install
3. Configurar variables de entorno

Crear archivo:

.env

Basado en:

.env.example
4. Ejecutar proyecto
Desarrollo
npm run dev
Producción
npm start
Scripts Disponibles
npm run dev
npm run start
npm run build
Estructura del Proyecto
src/
 ├── config/
 ├── controllers/
 ├── middlewares/
 ├── models/
 ├── routes/
 ├── services/
 ├── sockets/
 ├── utils/
 ├── validations/
 └── app.js
Funcionalidades Principales
Registro e inicio de sesión con JWT
Gestión de roles y permisos
CRUD de proyectos
Gestión de tareas Kanban
Subida de archivos
Chat en tiempo real
Notificaciones automáticas
Dashboard de métricas
Exportación de reportes PDF y Excel
Seguridad

El sistema implementa:

Autenticación JWT
Hash de contraseñas con bcrypt
Middleware de autorización
Validación de datos
Protección CORS
Variables de entorno seguras
Control de acceso por roles
Despliegue

La aplicación backend puede desplegarse mediante:

Docker
AWS EC2
Nginx como proxy inverso
MongoDB Atlas
Autor

Proyecto académico desarrollado para trabajo de grado universitario.
