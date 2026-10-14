const DATA_SOURCE = {
  // mode: "local" usa products.js. mode: "sheet" lee productos desde Google Sheets publicado como CSV.
  mode: "sheet",
  csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQbtRRB5LfcmEI1_xvVF7hnzmHVgi1MF0bsnYAn-qjLUjvEX1rhjd6maAJdjZA9Ew/pub?gid=792993831&single=true&output=csv",
  // Compatibilidad temporal con la planilla existente. No se generan IDs desde nombres o posiciones.
  // Agregar la columna id con estos valores antes de renombrar productos.
  legacyProducts: [
    { id: "ropa-001", names: ["Remera oversize"], cartIds: ["remera-oversize-1"] },
    { id: "ropa-002", names: ["Jean recto azul"], cartIds: ["jean-recto-azul-2"] },
    { id: "ropa-003", names: ["Campera urbana beige"], cartIds: ["campera-urbana-beige-3"] },
    { id: "ropa-004", names: ["Gorra clásica"], cartIds: ["gorra-clasica-4"] },
    { id: "ropa-005", names: ["Pack básico urbano"], cartIds: ["pack-basico-urbano-5"] }
  ]
};
