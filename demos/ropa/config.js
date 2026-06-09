const APP_CONFIG = {
  slug: "luna-urban-demo",
  businessName: "Luna Urban",
  businessSub: "Ropa y accesorios",
  initials: "LU",
  topbar: "Nuevos ingresos · Envíos y retiros a coordinar",
  whatsapp: "59899000000",
  instagram: "https://www.instagram.com/",
  currency: "$",

  theme: {
    primary: "#6f5cff",
    dark: "#151320",
    soft: "#efedff"
  },

  seo: {
    title: "Luna Urban | Catálogo de ropa",
    description: "Catálogo online de ropa urbana con talles, colores, ofertas y pedido directo por WhatsApp."
  },

  hero: {
    eyebrow: "Catálogo de ropa",
    title: "Prendas claras, pedido simple.",
    text: "Entrá a cada prenda, revisá talles y colores, agregá lo que querés y enviá tu pedido por WhatsApp.",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80",
    imageAlt: "Tienda de ropa",
    badgeTitle: "Nueva temporada",
    badgeText: "Talles, colores y ofertas visibles."
  },

  catalog: {
    kicker: "Catálogo",
    title: "Elegí tu próxima prenda",
    text: "Tocá una prenda para ver fotos, talles, colores y detalles antes de agregarla al pedido."
  },

  trust: [
    "Talles visibles",
    "Pedido por WhatsApp",
    "Disponibilidad a confirmar"
  ],

  infoCards: [
    {
      kicker: "Compra simple",
      title: "Menos preguntas por DM",
      text: "Cada prenda muestra precio, colores y talles disponibles. El pedido llega por WhatsApp con la información ordenada.",
      items: [
        "La disponibilidad se confirma antes de cerrar la compra.",
        "Los colores pueden variar levemente según la foto.",
        "Los cambios o retiros se coordinan directamente por WhatsApp."
      ]
    },
    {
      kicker: "Entrega",
      title: "Retiro o envío",
      text: "El cliente puede indicar si prefiere retirar o coordinar envío. La marca confirma precio final y disponibilidad.",
      items: [
        "Se puede coordinar retiro.",
        "El envío depende de zona y horario.",
        "Las ofertas pueden tener stock limitado."
      ]
    }
  ],

  cta: {
    title: "¿Ya elegiste tus prendas?",
    text: "Agregá todo al pedido, completá tus datos y mandalo por WhatsApp."
  },

  orderFields: [
    { id: "nombre", label: "Nombre", type: "text", placeholder: "Tu nombre", required: true },
    { id: "entrega", label: "Retiro o envío", type: "select", options: ["A coordinar", "Retiro", "Envío"] },
    { id: "zona", label: "Zona o barrio", type: "text", placeholder: "Ej: Pocitos, Centro, Cordón" },
    { id: "detalles", label: "Comentarios", type: "textarea", placeholder: "Dudas sobre talle, color, disponibilidad o forma de entrega." }
  ],

  whatsappMessage: {
    title: "Hola, quiero hacer un pedido con estas prendas:",
    dataTitle: "Datos para coordinar:",
    close: "¿Me confirman disponibilidad y precio final?"
  },

  cartNote: "El stock final se confirma por WhatsApp antes de cerrar la compra.",
  footerText: "Ropa y accesorios. Pedidos y disponibilidad por WhatsApp."
};
