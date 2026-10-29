# tick

[English](README.md)

Un espacio personal para organizar películas, series, libros, cómics, juegos, tareas y notas Markdown. Usa Next.js y Supabase. Cada instalación tiene su propia cuenta y base de datos.

## Funciones

- Búsqueda de títulos y entrada manual.
- Etiquetas, filtros, ordenación y archivo de completados.
- Vista de pendientes o atajos por categoría con imágenes de fondo.
- Listas de tareas con iconos Lucide y cuatro niveles de prioridad.
- Bloc con pestañas, listas, casillas, descarga Markdown y vista maximizada.
- Perfil editable con foto opcional.
- Interfaz en español e inglés y temas claro y oscuro.
- Demo pública en `/demo`, con datos de ejemplo en inglés. Los cambios de la demo se guardan solo en el navegador.

## Instalación local

Necesitas Node.js 24 y un proyecto de Supabase.

```sh
npm ci
cp .env.example .env.local
```

En PowerShell puedes usar `Copy-Item .env.example .env.local`.

1. Aplica los archivos SQL de `supabase/migrations/` en orden de nombre, desde el editor SQL de Supabase o su CLI.
2. Completa en `.env.local` la URL del proyecto, la clave pública y la clave secreta.
3. Desactiva el registro público en Supabase Auth y conserva habilitado el acceso por email y contraseña.
4. Crea tu cuenta:

```sh
npm run admin
```

El comando solicita usuario, email y contraseña. La contraseña se escribe de forma oculta y se almacena en Supabase Auth. Los datos de configuración de la cuenta se guardan en tu `.env.local`. Si la cuenta ya existe, su contraseña se conserva.

```sh
npm run dev
```

Abre `http://127.0.0.1:3006`. Desde el perfil del sidebar puedes elegir tu nombre visible y una foto. No hay cuentas predeterminadas ni fotos personales incluidas.

## Catálogos

| Contenido          | Proveedor                         | Configuración                 |
| ------------------ | --------------------------------- | ----------------------------- |
| Películas y series | TMDB                              | `TMDB_READ_TOKEN`             |
| Libros             | Open Library                      | Ninguna                       |
| Cómics             | Open Library; Comic Vine opcional | `COMIC_VINE_API_KEY` opcional |
| Juegos             | Steam                             | Ninguna                       |

Las búsquedas se realizan en el servidor y usan caché. La entrada manual funciona sin claves de API. Los créditos están en Acerca de.

## Despliegue

Usa el preset Next.js de Vercel con Node.js 24 y tu propio proyecto Supabase. Configura:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ADMIN_USER_ID
ADMIN_USERNAME
ADMIN_LOGIN_EMAIL
TMDB_READ_TOKEN          # opcional
COMIC_VINE_API_KEY       # opcional
```

Copia desde `.env.local` los datos de la cuenta creados por `npm run admin`. La aplicación no utiliza `SUPABASE_SECRET_KEY`: solo hace falta durante la creación local de la cuenta. Añade la URL del despliegue a la configuración de URLs de Supabase Auth.

Las tablas usan RLS y el servidor verifica el identificador de la cuenta configurada. La instalación es personal; no ofrece registro público. Los archivos de entorno y de trabajo local están excluidos del repositorio.

Para uso personal pequeño, Vercel Hobby y Supabase Free son adecuados. Hobby permite uso personal no comercial; Supabase Free incluye 500 MB de base de datos y 5 GB de transferencia, y puede pausar el proyecto tras una semana sin actividad. Puedes reactivarlo desde su dashboard. Consulta los límites actuales de [Vercel](https://vercel.com/docs/plans/hobby) y [Supabase](https://supabase.com/pricing). La disponibilidad continua no está garantizada en las capas gratuitas.

Al actualizar, aplica las migraciones nuevas sin recrear la base de datos.

## Desarrollo

```sh
npm run typecheck
npm test
npm run build
```

Las traducciones están en `lib/translations.ts` y las notas de ejemplo en `content/demo/`. La demo no utiliza datos de cuentas privadas.

## Licencia

[MIT](LICENSE). Las fuentes y los iconos conservan sus licencias en `public/fonts/LICENSE.txt` y `THIRD_PARTY_NOTICES.md`. Las imágenes y los metadatos de los catálogos pertenecen a sus respectivos propietarios.
