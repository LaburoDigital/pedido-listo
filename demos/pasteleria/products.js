const PRODUCTS = [
  {
    id: "torta-personalizada",
    name: "Torta personalizada",
    category: "Tortas",
    short: "Torta artesanal decorada para cumpleaños, aniversarios o eventos.",
    description: "Torta hecha a pedido con decoración personalizada. Ideal para cumpleaños, aniversarios y celebraciones. El precio final depende del tamaño, relleno y nivel de decoración.",
    pricePrefix: "Desde",
    price: 1200,
    oldPrice: null,
    image: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=1200&q=80"
    ],
    badge: "48 h antes",
    tags: ["Personalizable", "A pedido"],
    featured: true,
    layout: "featured",
    order: 1,
    available: true,
    optionGroups: [
      { id: "tamano", label: "Tamaño", options: ["Chica", "Mediana", "Grande"] },
      { id: "relleno", label: "Relleno", options: ["Dulce de leche", "Chocolate", "Frutilla", "A coordinar"] }
    ]
  },
  {
    id: "mini-cake",
    name: "Mini cake",
    category: "Tortas",
    short: "Formato chico para regalo, merienda especial o celebración íntima.",
    description: "Mini cake artesanal con decoración simple. Buena opción para regalar o para celebraciones pequeñas.",
    pricePrefix: "Desde",
    price: 690,
    image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?auto=format&fit=crop&w=1200&q=80"
    ],
    badge: "Personalizable",
    tags: ["Regalo", "Formato chico"],
    order: 2,
    available: true,
    optionGroups: [
      { id: "sabor", label: "Sabor", options: ["Vainilla", "Chocolate", "Red velvet"] }
    ]
  },
  {
    id: "box-dulce",
    name: "Box dulce",
    category: "Boxes",
    short: "Selección de bocados dulces para regalar o compartir.",
    description: "Box con mix de dulces artesanales. Puede adaptarse para cumpleaños, fechas especiales o regalos corporativos.",
    pricePrefix: "Desde",
    price: 950,
    oldPrice: 1150,
    image: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1200&q=80",
    badge: "Oferta",
    tags: ["Promo", "Regalo"],
    offer: true,
    layout: "compact",
    order: 3,
    available: true,
    optionGroups: [
      { id: "tamano", label: "Tamaño", options: ["Chico", "Mediano", "Grande"] }
    ]
  },
  {
    id: "brownies",
    name: "Brownies",
    category: "Postres",
    short: "Brownies húmedos en porciones para mesa dulce o regalo.",
    description: "Brownies artesanales con textura húmeda. Se pueden pedir por unidad o en box.",
    pricePrefix: "Desde",
    price: 520,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80",
    tags: ["Mesa dulce"],
    order: 4,
    available: true,
    optionGroups: [
      { id: "presentacion", label: "Presentación", options: ["Porciones", "Box", "Mesa dulce"] }
    ]
  }
];
