const APP_CONFIG = {
  slug: "pasteleria-base",
  businessName: "Mi Deleite Bakery",
  businessSub: "Pastelería artesanal",
  initials: "MD",
  topbar: "Pedidos con anticipación · Montevideo",
  whatsapp: "59899000000",
  instagram: "https://www.instagram.com/",
  currency: "$",

  theme: {
    primary: "#a34b38",
    dark: "#2a120f",
    soft: "#f5e7df"
  },

  seo: {
    title: "Mi Deleite Bakery | Pastelería artesanal en Montevideo",
    description: "Catálogo online de pastelería artesanal: tortas, boxes dulces y preparaciones a pedido en Montevideo."
  },

  hero: {
    eyebrow: "Pastelería artesanal a pedido",
    title: "Dulces para celebrar con más detalle.",
    text: "Elegí productos, entrá al detalle, definí opciones y armá tu pedido por WhatsApp con toda la información necesaria.",
    image: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=1400&q=80",
    imageAlt: "Torta artesanal de chocolate",
    badgeTitle: "Hecho a pedido",
    badgeText: "Tortas, boxes y opciones para eventos."
  },

  catalog: {
    kicker: "Catálogo",
    title: "Productos destacados",
    text: "Tocá un producto para ver descripción, opciones, anticipación y detalles antes de agregarlo al pedido."
  },

  trust: [
    "Pedidos artesanales",
    "Coordinación por WhatsApp",
    "Precios finales a confirmar"
  ],

  infoCards: [
    {
      kicker: "Información",
      title: "Pedidos personalizados",
      text: "Los productos pueden adaptarse según ocasión, sabores, colores, frase, tamaño y cantidad de personas.",
      items: [
        "Los precios finales pueden variar por tamaño, decoración y complejidad.",
        "Para tortas personalizadas se recomienda pedir con 48 a 72 horas.",
        "Para eventos o mesas dulces conviene coordinar con más anticipación."
      ]
    },
    {
      kicker: "Cómo se coordina",
      title: "Pedido claro por WhatsApp",
      text: "El pedido llega con productos, cantidades, fecha y detalles. Así se puede responder con precio final y disponibilidad sin repetir tantas preguntas.",
      items: [
        "Se confirma disponibilidad antes de reservar.",
        "Retiro o envío se coordina según zona y horario.",
        "Los pedidos personalizados pueden requerir seña."
      ]
    }
  ],

  cta: {
    title: "¿Ya tenés una idea para tu pedido?",
    text: "Agregá productos, completá los detalles y enviá todo junto por WhatsApp."
  },

  orderFields: [
    { id: "nombre", label: "Nombre", type: "text", placeholder: "Tu nombre", required: true },
    { id: "fecha", label: "Fecha del evento o retiro", type: "date", required: true },
    { id: "personas", label: "Cantidad de personas", type: "text", placeholder: "Ej: 12 personas" },
    { id: "entrega", label: "Retiro o envío", type: "select", options: ["A coordinar", "Retiro", "Envío"] },
    { id: "detalles", label: "Detalles del pedido", type: "textarea", placeholder: "Sabores, colores, frase, idea de decoración, alergias o cualquier dato importante." }
  ],

  whatsappMessage: {
    title: "Hola, quiero hacer un pedido con esto:",
    dataTitle: "Datos del pedido:",
    close: "¿Me pasan el precio final y me confirman si se puede hacer así para esa fecha?"
  },

  cartNote: "El total final puede variar según personalización, tamaño, decoración y disponibilidad.",
  footerText: "Pastelería artesanal a pedido. Coordinación y confirmación final por WhatsApp."
};
