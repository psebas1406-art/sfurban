# SF Urban — Tienda virtual (plantilla base)

Base completa y funcional de la tienda. Pensada para ir puliendo paleta, tipografías y
diseño **sin rehacer nada**, y para conectar después la base de datos, los pagos, el chatbot
y el panel privado de estadísticas.

## Cómo verla

- **Opción rápida:** doble clic en `index.html` (funciona sin servidor).
- **Opción recomendada** (igual que en producción), en una terminal dentro de esta carpeta:

  ```
  node .claude/dev-server.js
  ```
  y abrir http://localhost:5173

## Qué incluye

| Página | Qué hace |
|---|---|
| `index.html` | Hero animado (pedestal + pilar de luz → la pantalla se acerca → carrusel de prendas con el scroll), banda animada, "Qué hay dentro" con puntos, catálogo con filtros y espacios reservados "Próximamente / Avísame", categorías, nosotros, club/newsletter |
| `producto.html?id=p-0001` | Ficha de producto: zoom, tallas con stock, añadir a la bolsa, favoritos, detalles |
| `checkout.html` | Contacto + envío + resumen. Crea el pedido como "pendiente de pago" (pagos en línea: Fase 2) |
| `cuenta.html` | Perfil, pedidos, favoritos, cerrar sesión |
| Global | Registro / inicio de sesión, bolsa lateral, buscador (Ctrl+K), toasts, botón de chat, panel **Estilo** |

**Panel "Estilo"** (abajo a la izquierda): prueben en vivo las 4 paletas 60‑30‑10 y 3 parejas
tipográficas. Es solo para ustedes mientras deciden; se oculta con `showStylePanel: false` en `js/config.js`.

## Dónde se cambia cada cosa

- **Marca, moneda, envío, paletas, tipografías:** `js/config.js`
- **Prendas (precio, tallas, stock, fotos, puntos "Qué hay dentro"):** `js/data/products.js`
  - Para agregar una prenda: copia el objeto `p-0001`, cambia datos y pon `status: 'active'`.
  - Fotos en `assets/img/products/` (idealmente PNG sin fondo, ~550×1600).
- **Estilos:** `css/styles.css` (todo con variables; no hay colores sueltos)

## Estructura

```
index.html · producto.html · checkout.html · cuenta.html
css/styles.css
js/config.js              ← marca, paletas, fuentes
js/data/products.js       ← catálogo (mañana: base de datos)
js/services/db.js         ← capa de datos (hoy localStorage, mañana API)
js/services/auth.js       ← registro / login
js/services/cart.js       ← bolsa, favoritos, pedidos
js/ui/layout.js           ← header, footer, bolsa, modales, chat
js/ui/theme.js            ← panel de estilo
js/pages/*.js             ← lógica de cada página
db/schema.sql             ← esquema relacional para la Fase 2
docs/ARQUITECTURA.md      ← hoja de ruta
```

## Importante (modo demo)

Hoy los usuarios, pedidos y eventos se guardan **en el navegador** de quien visita
(no hay servidor todavía). Sirve para probar todo el flujo, pero **no es apto para
clientes reales** hasta conectar la base de datos (ver `docs/ARQUITECTURA.md`).

## Pendientes marcados con `TODO`

Precio real, inventario, país/moneda, correo y WhatsApp, redes sociales, textos legales.
