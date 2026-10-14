/* Empaqueta una demo con sus dependencias; nunca publica ni sobrescribe carpetas. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function exportCatalog(catalog, output) {
  if (!['demos/ropa', 'demos/pasteleria', 'template/catalogo-base'].includes(catalog)) {
    throw new Error('Elegí demos/ropa, demos/pasteleria o template/catalogo-base.');
  }
  if (!output) throw new Error('Indicá una carpeta nueva de destino.');
  const source = path.join(root, catalog), destination = path.resolve(output);
  if (destination === root || root.startsWith(destination + path.sep) ||
      destination === source || destination.startsWith(source + path.sep)) {
    throw new Error('El destino no puede reemplazar el proyecto ni estar dentro de la demo.');
  }
  const html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
  if (!html.includes('src="../../shared/catalog-core.js"')) throw new Error('No se encontró la dependencia compartida.');
  if (fs.existsSync(destination)) throw new Error('La carpeta de destino ya existe. No se sobrescribió nada.');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.mkdirSync(destination); // Exclusivo: falla si otro proceso creó el destino.
  for (const file of fs.readdirSync(source)) fs.cpSync(path.join(source, file), path.join(destination, file), { recursive: true, errorOnExist: true, force: false });
  fs.mkdirSync(path.join(destination, 'shared'));
  fs.copyFileSync(path.join(root, 'shared/catalog-core.js'), path.join(destination, 'shared/catalog-core.js'), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(destination, 'index.html'), html.replace('src="../../shared/catalog-core.js"', 'src="shared/catalog-core.js"'));
  return destination;
}

if (require.main === module) {
  try { console.log(exportCatalog(process.argv[2], process.argv[3])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { exportCatalog };
