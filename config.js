/* =========================================================
   SF URBAN — Configuración central
   Todo lo "de marca" vive aquí: nombre, moneda, paletas,
   tipografías, contacto. Cambiar aquí = cambia en todo el sitio.
   ========================================================= */
window.SF = window.SF || {};

SF.config = {
  brand: {
    name: 'SF Urban',
    tagline: 'Streetwear con alma retro',
    email: 'hola@sfurban.com',          // TODO: correo real
    whatsapp: '',                        // TODO: número con indicativo, ej. 573001234567
    instagram: 'https://instagram.com/', // TODO
    tiktok: 'https://tiktok.com/',       // TODO
  },

  // Moneda / formato de precios (TODO: confirmar país)
  currency: { code: 'COP', locale: 'es-CO', decimals: 0 },

  shipping: { flat: 15000, freeFrom: 250000 },

  // Paletas basadas en la regla 60-30-10 (video de referencia).
  // 60 = base/fondo · 30 = contraste/tinta · 10 = acento
  palettes: {
    burdeos: {
      label: 'Marfil · Negro piano · Burdeos', note: 'Retro elegante, nace de la prenda',
      vars: { '--bg': '#EFE8DA', '--bg-2': '#E6DDCB', '--surface': '#F7F3EA', '--ink': '#141212', '--ink-soft': '#5B5550', '--line': 'rgba(20,18,18,.14)', '--accent': '#7A1E2C', '--accent-2': '#B23A48', '--on-accent': '#F7F3EA', '--stage': '#0E0C0C', '--on-stage': '#F2ECE1' },
    },
    turquesa: {
      label: 'Marfil antiguo · Negro piano · Turquesa surf', note: 'Vintage con un toque fresco',
      vars: { '--bg': '#ECE5D3', '--bg-2': '#E1D8C2', '--surface': '#F6F1E6', '--ink': '#111111', '--ink-soft': '#55524B', '--line': 'rgba(17,17,17,.14)', '--accent': '#16A99B', '--accent-2': '#2EC4B6', '--on-accent': '#0B0B0B', '--stage': '#0B0D0D', '--on-stage': '#EEF2EE' },
    },
    zafiro: {
      label: 'Zafiro profundo · Blanco perla · Naranja brasa', note: 'Deportivo, enérgico',
      vars: { '--bg': '#F3F1EC', '--bg-2': '#E7E4DC', '--surface': '#FFFFFF', '--ink': '#0F1C3F', '--ink-soft': '#4A5578', '--line': 'rgba(15,28,63,.15)', '--accent': '#F0641E', '--accent-2': '#FF8A4C', '--on-accent': '#FFFFFF', '--stage': '#0F1C3F', '--on-stage': '#F3F1EC' },
    },
    pop: {
      label: 'Amarillo laca · Negro ónix · Rosa fucsia', note: 'Pop art, muy Gen Z',
      vars: { '--bg': '#F4CB16', '--bg-2': '#EBBE00', '--surface': '#FFE25A', '--ink': '#0D0D0D', '--ink-soft': '#3B3510', '--line': 'rgba(13,13,13,.2)', '--accent': '#FF2E88', '--accent-2': '#FF66A8', '--on-accent': '#FFFFFF', '--stage': '#0D0D0D', '--on-stage': '#F4CB16' },
    },
  },

  // Parejas tipográficas (cargadas desde Google Fonts en el <head>)
  fonts: {
    urbano:  { label: 'Urbano — Unbounded + Space Grotesk', display: "'Unbounded', 'Arial Black', sans-serif", body: "'Space Grotesk', system-ui, sans-serif", serif: "'Instrument Serif', Georgia, serif" },
    retro:   { label: 'Retro — Bebas Neue + DM Sans', display: "'Bebas Neue', Impact, sans-serif", body: "'DM Sans', system-ui, sans-serif", serif: "'DM Serif Display', Georgia, serif" },
    minimal: { label: 'Minimal — Syne + Inter', display: "'Syne', 'Arial Black', sans-serif", body: "'Inter', system-ui, sans-serif", serif: "'Instrument Serif', Georgia, serif" },
  },

  defaults: { palette: 'burdeos', font: 'urbano' },
};

SF.money = (n) => new Intl.NumberFormat(SF.config.currency.locale, {
  style: 'currency', currency: SF.config.currency.code,
  minimumFractionDigits: SF.config.currency.decimals, maximumFractionDigits: SF.config.currency.decimals,
}).format(n);
