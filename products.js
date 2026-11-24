/* =========================================================
   Catálogo. Hoy es un archivo; mañana vendrá de la base de datos
   (tabla `products` + `product_variants` + `product_images`, ver db/schema.sql).
   Mantén esta misma forma de objeto para que el cambio sea transparente.
   status: 'active' | 'coming_soon' | 'draft'
   ========================================================= */
SF.catalog = [
  {
    id: 'p-0001',
    slug: 'conjunto-track-burdeos',
    name: 'Conjunto Track Burdeos',
    drop: 'Drop 01',
    category: 'conjuntos',
    gender: 'unisex',
    price: 189900,            // TODO: precio real
    compareAt: null,
    colors: [{ name: 'Burdeos / Negro', hex: '#7A1E2C' }],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: { S: 5, M: 8, L: 8, XL: 4 }, // TODO: inventario real
    images: ['drop01-conjunto-burdeos.png'],
    badges: ['Nuevo', 'Edición limitada'],
    status: 'active',
    description: 'Chaqueta con capucha y pantalón jogger en tela tipo nylon, paneles curvos burdeos y negro con vivos blancos. Silueta oversized de inspiración 2000s.',
    // Puntos de la vista "Qué hay dentro" (x/y en % sobre la imagen)
    features: [
      { title: 'Capucha ajustable', text: 'Cordón con topes, cubre sin aplastar la gorra.', x: 50, y: 6 },
      { title: 'Cremallera completa', text: 'Cierre frontal de alta resistencia.', x: 47, y: 24 },
      { title: 'Vivos contrastantes', text: 'Ribete blanco que dibuja la silueta curva.', x: 70, y: 17 },
      { title: 'Puños elásticos', text: 'Ajuste en muñeca para el look bombacho.', x: 86, y: 44 },
      { title: 'Cintura con cordón', text: 'Pretina elástica, comodidad todo el día.', x: 50, y: 43 },
      { title: 'Bota con jareta', text: 'Ajusta el largo: recto o recogido.', x: 26, y: 88 },
    ],
    createdAt: '2026-11-24',
  },
  // Espacios reservados para las próximas prendas
  { id: 'p-0002', slug: 'proximamente-1', name: 'Próximamente', drop: 'Drop 01', category: 'chaquetas', gender: 'unisex', price: null, images: [], status: 'coming_soon', badges: [] },
  { id: 'p-0003', slug: 'proximamente-2', name: 'Próximamente', drop: 'Drop 01', category: 'camisetas', gender: 'unisex', price: null, images: [], status: 'coming_soon', badges: [] },
  { id: 'p-0004', slug: 'proximamente-3', name: 'Próximamente', drop: 'Drop 02', category: 'pantalones', gender: 'unisex', price: null, images: [], status: 'coming_soon', badges: [] },
  { id: 'p-0005', slug: 'proximamente-4', name: 'Próximamente', drop: 'Drop 02', category: 'buzos', gender: 'mujer', price: null, images: [], status: 'coming_soon', badges: [] },
  { id: 'p-0006', slug: 'proximamente-5', name: 'Próximamente', drop: 'Drop 02', category: 'accesorios', gender: 'unisex', price: null, images: [], status: 'coming_soon', badges: [] },
  { id: 'p-0007', slug: 'proximamente-6', name: 'Próximamente', drop: 'Drop 02', category: 'camisetas', gender: 'hombre', price: null, images: [], status: 'coming_soon', badges: [] },
  { id: 'p-0008', slug: 'proximamente-7', name: 'Próximamente', drop: 'Drop 02', category: 'accesorios', gender: 'unisex', price: null, images: [], status: 'coming_soon', badges: [] },
];

SF.categories = [
  { id: 'conjuntos', label: 'Conjuntos' },
  { id: 'chaquetas', label: 'Chaquetas' },
  { id: 'buzos', label: 'Buzos' },
  { id: 'camisetas', label: 'Camisetas' },
  { id: 'pantalones', label: 'Pantalones' },
  { id: 'accesorios', label: 'Accesorios' },
];

SF.getProduct = (idOrSlug) => SF.catalog.find(p => p.id === idOrSlug || p.slug === idOrSlug);
