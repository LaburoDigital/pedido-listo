const PRODUCTS = [
  {
    id: "remera-oversize",
    name: "Remera oversize",
    category: "Remeras",
    short: "Corte amplio, algodón suave y calce urbano.",
    description: "Remera oversize de algodón con caída amplia. Una prenda básica para uso diario, fácil de combinar y cómoda para media estación.",
    price: 890,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1200&q=80"
    ],
    badge: "Nuevo ingreso",
    tags: ["Algodón", "Oversize"],
    featured: true,
    layout: "featured",
    order: 1,
    available: true,
    optionGroups: [
      { id: "talle", label: "Talle", options: ["S", "M", "L", "XL"] },
      { id: "color", label: "Color", options: ["Negro", "Blanco", "Gris"] }
    ]
  },
  {
    id: "jean-recto",
    name: "Jean recto",
    category: "Pantalones",
    short: "Jean tiro medio, pierna recta y denim clásico.",
    description: "Jean recto de denim azul, cómodo para uso diario. Ideal para combinar con remeras, tops o camisas.",
    price: 1890,
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=1200&q=80"
    ],
    tags: ["Denim", "Tiro medio"],
    order: 2,
    available: true,
    optionGroups: [
      { id: "talle", label: "Talle", options: ["36", "38", "40", "42"] },
      { id: "color", label: "Color", options: ["Azul", "Negro"] }
    ]
  },
  {
    id: "campera-puffer",
    name: "Campera puffer",
    category: "Abrigos",
    short: "Abrigo liviano, cómodo y fácil de combinar.",
    description: "Campera puffer con cierre frontal, bolsillos y cuello alto. Buena opción para días fríos sin perder comodidad.",
    price: 2490,
    oldPrice: 2890,
    image: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80"
    ],
    badge: "Oferta",
    tags: ["Promo", "Abrigo"],
    offer: true,
    order: 3,
    available: true,
    optionGroups: [
      { id: "talle", label: "Talle", options: ["S", "M", "L"] },
      { id: "color", label: "Color", options: ["Negro", "Beige"] }
    ]
  },
  {
    id: "top-basico",
    name: "Top básico",
    category: "Tops",
    short: "Top ajustado, simple y combinable.",
    description: "Top básico de tela elástica, ideal para combinar con jean, pantalón cargo o campera.",
    price: 690,
    image: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1200&q=80",
    tags: ["Básico", "Elástico"],
    layout: "compact",
    order: 4,
    available: true,
    optionGroups: [
      { id: "talle", label: "Talle", options: ["S", "M", "L"] },
      { id: "color", label: "Color", options: ["Negro", "Blanco", "Rosa"] }
    ]
  },
  {
    id: "bolso-crossbody",
    name: "Bolso crossbody",
    category: "Accesorios",
    short: "Bolso compacto para uso diario.",
    description: "Bolso crossbody chico, práctico para salir con lo esencial. Correa regulable y cierre superior.",
    price: 790,
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80",
    tags: ["Accesorio", "Diario"],
    layout: "compact",
    order: 5,
    available: true,
    optionGroups: [
      { id: "color", label: "Color", options: ["Negro", "Marrón", "Beige"] }
    ]
  }
];
