# Wordle2
Este es Wordle pero pero la secuela 

## Estructura

| Página | Qué es |
|---|---|
| `index.html` | Menú principal (bienvenida, carrusel y mosaico de opciones) |
| `wordle.html` | El juego Wordle 2 |
| `corazon.html` | El corazón animado |
| `notas.html` | Bloc de notas con contraseña |

Estilos y scripts compartidos en `assets/`, imágenes en `assets/img/`.

## Escribir una nota nueva

Edita `data/notas.js` y agrega un bloque arriba de los demás:

```js
{
    fecha: "2026-11-21",
    titulo: "Título de la nota",
    texto: `Lo que quieras escribir.
Puedes usar varias líneas.`
},
```
