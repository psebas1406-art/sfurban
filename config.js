/* =========================================================
   SF URBAN — Configuración central
   Todo lo "de marca" vive aquí: nombre, moneda, paleta,
   tipografías, contacto. Cambiar aquí = cambia en todo el sitio.
   ========================================================= */
window.SF = window.SF || {};

SF.config = {
  brand: {
    name: 'SF Urban',
    handle: 'sfurban',
    tagline: 'Women & Men — Activewear',
    motto: 'Dos letras, un solo movimiento.',
    email: 'psebas.1406@gmail.com',     // correo de contacto (aparece en la web y en la política de privacidad)
    whatsapp: '',                        // número para "Hablar por WhatsApp" (con indicativo, sin +), ej. 573001234567. Vacío = se oculta el botón
    instagram: 'https://instagram.com/', // TODO
    tiktok: 'https://tiktok.com/',       // TODO
  },

  // Asistente de IA (servidor en Render). El chat de la web le habla a {agentUrl}/chat
  agentUrl: 'https://sfurban-agente.onrender.com',

  // Base de datos (Supabase). La tienda lee de aquí el inventario que cambian en admin.html.
  // La "anon key" es PÚBLICA a propósito: solo permite lo que las reglas (RLS) dejan
  // (ver prendas publicadas y crear pedidos). NUNCA poner aquí la "service_role key".
  // Vacío = la tienda usa el catálogo de products.js.
  supabase: {
    url: 'https://nhzgplcxkigdcgcjfkti.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oemdwbGN4a2lnZGNnY2pma3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU4MjkzOTEsImV4cCI6MjExMTQwNTM5MX0.slApE5IpOgxrWwlTK9Fuy_5mMNPadL6K3xxioyp-aZ0',
  },

  /* ---------- Legal (Colombia) ----------
     Identificación del vendedor: la exige el Estatuto del Consumidor (Ley 1480/2011, art. 50)
     en toda venta por internet. Llenar con los datos REALES del responsable (persona natural
     o empresa). Mientras diga "[pendiente]", la página lo mostrará así para que no se olvide. */
  legal: {
    responsable: 'Neider Sebastián Peña González y María Fernanda Lizarazo Parada',
    documento: 'C.C. 1099342499',
    direccion: 'Piedecuesta',
    ciudad: 'Santander, Colombia',
    telefono: '312 550 9318 / 15219633472',
    // Cada documento tiene versión: si cambia el texto, se sube la versión y se pide aceptarlo de nuevo.
    versions: {
      terminos: 'T&C v1.1 · 2026-11-28',
      privacidad: 'Privacidad v2.0 · 2026-11-27',
      cookies: 'Cookies v1.0 · 2026-11-27',
      reembolsos: 'Reembolsos v1.0 · 2026-11-27',
    },
    docs: {
      terminos: 'terminos.html',
      privacidad: 'privacidad.html',
      cookies: 'cookies.html',
      reembolsos: 'reembolsos.html',
    },
  },

  // Intro en video al entrar (una vez por visita). ?intro=1 la fuerza.
  intro: { enabled: true, video: 'sf-urban-intro-web.mp4' },

  // Moneda / formato de precios (TODO: confirmar país)
  currency: { code: 'COP', locale: 'es-CO', decimals: 0 },

  shipping: { flat: 15000, freeFrom: 250000 },

  // Paleta oficial (manual de marca, lámina 04).
  // Proporción: 60 negro · 20 blanco · 12 rojo · 5 grafito · 3 gris. Rojo nunca > 15 %.
  palettes: {
    oficial: {
      label: 'Oficial · Negro carbón · Rojo competición · Blanco hielo', note: 'Manual de marca',
      vars: {
        '--bg': '#0D0D0F',        // Negro carbón
        '--bg-2': '#141417',
        '--surface': '#1B1C1F',
        '--surface-2': '#2B2D31', // Grafito
        '--ink': '#F5F5F2',       // Blanco hielo
        '--ink-soft': '#8C8C87',  // Gris acero
        '--line': 'rgba(245,245,242,.12)',
        '--accent': '#E4002B',    // Rojo competición
        '--accent-2': '#FF1F45',
        '--on-accent': '#F5F5F2',
        '--stage': '#0D0D0F', '--on-stage': '#F5F5F2',
      },
    },
  },

  fonts: {
    oficial: { label: 'Oficial — Unbounded + Instrument Serif + Inter', display: "'Unbounded', 'Arial Black', sans-serif", body: "'Inter', system-ui, sans-serif", serif: "'Instrument Serif', Georgia, serif" },
  },

  defaults: { palette: 'oficial', font: 'oficial' },
  showStylePanel: false,
};

SF.money = (n) => new Intl.NumberFormat(SF.config.currency.locale, {
  style: 'currency', currency: SF.config.currency.code,
  minimumFractionDigits: SF.config.currency.decimals, maximumFractionDigits: SF.config.currency.decimals,
}).format(n);
