# Pedido Listo v0.9 — Sistema profesional de imágenes

## Objetivo
Separar imágenes de variantes reales de compra.

- `Color`, `Talle`, `Sabor`, `Tamaño`: opciones reales que pueden ir al pedido.
- `Frente`, `Atrás`, `Detalle`, `Modelo`: vistas de galería; no deben ir al pedido.

## Nuevas columnas recomendadas en Google Sheets

```text
imagen_1
imagen_2
imagen_3
imagen_4
imagen_5
modo_imagenes
posicion_imagen
ajuste_imagen
imagenes_labels
```

## modo_imagenes

### color
Usar cuando cada imagen representa una variante de color.

Ejemplo:

```text
opciones_2_nombre = Color
opciones_2_valores = Negro, Blanco, Gris
modo_imagenes = color
imagen_1 = foto negro
imagen_2 = foto blanco
imagen_3 = foto gris
```

Resultado: al seleccionar Blanco, cambia a imagen_2. El color sí va al pedido.

### galeria
Usar cuando las fotos son vistas del mismo producto.

Ejemplo:

```text
modo_imagenes = galeria
imagen_1 = frente
imagen_2 = atras
imagen_3 = detalle
imagenes_labels = Frente, Atrás, Detalle
```

Resultado: las miniaturas cambian la foto, pero no se envía Vista/Frente/Atrás por WhatsApp.

### vacío / auto
Si queda vacío, el sistema decide:

- Si hay Color con varias opciones y suficientes imágenes, usa color.
- En otro caso, usa galería.

## posicion_imagen
Controla el foco visual de las fotos. Valores útiles:

```text
center
top
bottom
left
right
center top
center 35%
50% 30%
```

## ajuste_imagen

```text
cover = llena el cuadro, puede recortar
contain = muestra la imagen completa, puede dejar aire
vacío = card usa cover y detalle usa contain
```

## Cloudinary
Flujo recomendado:

1. Cliente manda fotos por WhatsApp/Drive.
2. Se revisa calidad y encuadre.
3. Se suben a Cloudinary.
4. Se pega cada URL pública en la planilla.
5. La web lee Sheets y muestra la imagen.

No pegar imágenes visuales dentro de Sheets: el CSV no entrega la imagen como dato web usable.
