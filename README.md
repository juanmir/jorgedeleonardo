# jorgedeleonardo.com

Web de Jorge de Leonardo, escritor. Es una web estática: el contenido está en archivos
Markdown dentro de `content/`, un script (`build.mjs`) genera las páginas en `dist/` y
GitHub Actions las publica en AWS (S3 + CloudFront). No hay servidor, base de datos ni
plugins que mantener.

- **Pruebas:** https://nueva.jorgedeleonardo.com — se actualiza con cada push a `main`.
- **Producción:** https://jorgedeleonardo.com — se publica a mano (Actions → *Desplegar* → `production`).

## Estructura

```
content/
  sitio.yml            nombre, cita, redes sociales, email
  sobre-mi.md          biografía
  libros/*.md          un archivo por libro
  prensa/*.md          un archivo por presentación, firma o entrevista
public/
  media/               fotos y portadas (mismas rutas que en WordPress)
  fonts/               tipografías (Lora e Inter, autoalojadas)
src/
  layout.mjs           cabecera, pie y <head> comunes
  pages.mjs            plantilla de cada tipo de página
  assets/              CSS, JS, favicon, imagen para compartir
infra/                 plantillas de AWS (CloudFormation) y redirecciones
.github/workflows/     despliegue e importación de imágenes
```

## Añadir una presentación, firma o entrevista

1. Guarda las fotos en `public/media/AÑO/MES/`, p. ej. `public/media/2026/11/burgos-1.jpg`
   (que no pesen más de ~500 KB; desde el móvil se pueden reducir al compartir).
2. Crea `content/prensa/2026-11-calima-burgos.md`. El nombre empieza por `AAAA-MM-`
   para que queden ordenados; la URL será `/prensa/calima-burgos/`.

```markdown
---
titulo: Presentación de Calima en Burgos
fecha: 2026-11-15
tipo: presentacion            # presentacion | firma | entrevista
libro: calima                 # nombre del archivo del libro, sin .md (opcional)
lugar: Librería Luz y Vida, Burgos
medio:                        # para entrevistas: Onda Cero, Diario La Rioja…
video: https://www.youtube.com/watch?v=XXXXXXXXXXX   # opcional, se incrusta
enlace: https://…             # opcional, botón a una noticia externa
enlace_texto: Leer la noticia
fotos:
  - media/2026/11/burgos-1.jpg
  - media/2026/11/burgos-2.jpg
---

Texto libre (opcional). Se puede usar *cursiva*, **negrita** y [enlaces](https://…).
```

3. `git add . && git commit -m "Presentación en Burgos" && git push` → en ~1 minuto
   está en la web de pruebas. Para pasarla a la buena: Actions → *Desplegar* → `production`.

## Añadir un libro

Copia uno de `content/libros/`, cámbiale el nombre (será la URL: `/libros/nombre/`) y
los datos. La portada va en `public/media/…`. `orden` decide la posición (1 = primero) y
`destacado: true` lo pone como novedad en la portada (solo uno). Quítaselo al anterior.

## Probar en local

```bash
npm install
npm run dev        # http://localhost:4321
```

Mientras no se hayan importado las imágenes, la versión de pruebas las carga desde la
web antigua de WordPress. La de producción se niega a generarse sin ellas.

## Puesta en marcha (una sola vez)

Todo en la región **us-east-1** (es obligatoria para el certificado de CloudFront).

1. **Permisos de GitHub → AWS** (sin claves guardadas):
   ```bash
   aws cloudformation deploy --region us-east-1 --stack-name jorgedeleonardo-github \
     --template-file infra/github-oidc.yml --capabilities CAPABILITY_NAMED_IAM
   # Si la cuenta ya tiene el proveedor OIDC de GitHub (p. ej. por otro proyecto):
   #   --parameter-overrides CreateOidcProvider=false
   aws cloudformation describe-stacks --region us-east-1 --stack-name jorgedeleonardo-github \
     --query "Stacks[0].Outputs[0].OutputValue" --output text
   ```
   Copia ese ARN en GitHub → *Settings → Secrets and variables → Actions → Variables*
   como `AWS_ROLE_ARN`.

2. **Web de pruebas** (`nueva.jorgedeleonardo.com`):
   ```bash
   ZONE=$(aws route53 list-hosted-zones-by-name --dns-name jorgedeleonardo.com \
     --query "HostedZones[0].Id" --output text | cut -d/ -f3)
   aws cloudformation deploy --region us-east-1 --stack-name jorgedeleonardo-staging \
     --template-file infra/site.yml --parameter-overrides \
     Environment=staging DomainName=nueva.jorgedeleonardo.com HostedZoneId=$ZONE
   ```
   Tarda ~10 minutos (el certificado y CloudFront). Después, lanza *Desplegar* en Actions.

3. **Imágenes:** Actions → *Importar imágenes de WordPress* → Run workflow.
   Las copia optimizadas a `public/media`. Hazlo antes de apagar WordPress.

## Paso a producción (cuando Jorge dé el visto bueno)

1. Crear la infraestructura de producción **sin tocar todavía el DNS**:
   ```bash
   aws cloudformation deploy --region us-east-1 --stack-name jorgedeleonardo-production \
     --template-file infra/site.yml --parameter-overrides \
     Environment=production DomainName=jorgedeleonardo.com \
     AlternateDomainName=www.jorgedeleonardo.com HostedZoneId=$ZONE CreateDnsRecords=false
   ```
2. Actions → *Desplegar* → `production`.
3. En Route 53, borrar los registros `A` de `jorgedeleonardo.com` y el de `www` que
   apuntan al servidor de WordPress (anota la IP por si hay que volver atrás).
4. Repetir el comando del paso 1 con `CreateDnsRecords=true`. En minutos la web nueva
   está en el dominio. Las URLs antiguas redirigen solas (ver abajo).
5. Comprobar, esperar un par de semanas y entonces **hacer una copia de WordPress y
   apagar/borrar el servidor** (EC2/Lightsail, IP elástica, discos y snapshots).
6. Opcional: borrar el stack `jorgedeleonardo-staging` si ya no se usa.

> Tras actualizar un stack de CloudFormation, vuelve a lanzar *Desplegar*: el stack
> reinicia la función de redirecciones y el despliegue la vuelve a cargar.

## Redirecciones

Las direcciones de la web antigua (`/calima/`, `/jota-botellas/`, `/biografia/`,
`/medios/`, `/elementor-1103/`…) redirigen con un 301 a las nuevas, para no perder
posicionamiento ni enlaces. Se definen con el campo `antes:` de cada archivo de
contenido y algunas fijas en `build.mjs`.

## Costes

- Route 53 (zona del dominio): 0,50 $/mes (ya se pagaba).
- S3 + CloudFront: céntimos al mes con este tráfico (entra en la capa gratuita de CloudFront).
- Certificado HTTPS: gratis.
- Renovación anual del dominio: igual que ahora.
