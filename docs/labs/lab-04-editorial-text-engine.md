# Lab 04: Texto Editorial, Estilos y Flujo

## Proyectos OSS Investigados

- [ProseMirror](https://github.com/ProseMirror/prosemirror): editor semántico rich text, schemas custom, transformaciones, colaboración.
- [Tiptap](https://tiptap.dev/docs): editor headless basado en ProseMirror, con extensiones y JSON como formato de almacenamiento.
- [Yjs editor bindings](https://docs.yjs.dev/getting-started/a-collaborative-editor): integración colaborativa con editores existentes.

## Qué Aprendemos

- El texto profesional necesita modelo semántico, no solo string.
- ProseMirror/Tiptap permiten schema, transactions, marks, nodes, commands y JSON persistente.
- Para DTP, cada `Story` debería almacenar contenido rich text estructurado y generar texto plano solo para medición/export.

## Decisión para OpenDTP

Evolucionar `Story.content: string` a:

```ts
type StoryContent = {
  format: "plain" | "tiptap-json";
  value: string | TiptapJson;
};
```

Usar Tiptap para:

- edición de historias
- negrita/cursiva/enlaces
- estilos semánticos
- comentarios futuros
- colaboración con Yjs

## Experimento

Integrar Tiptap en un panel de historia y sincronizarlo con frames vinculados.

## Criterios de Aceptación

- Editar la historia actualiza el preview.
- El contenido se guarda como JSON.
- Export genera HTML semántico.
- IA puede editar story JSON o texto derivado con patch seguro.

## Riesgos

- Rich text y layout exacto no son lo mismo.
- La medición de texto rich requiere render real o worker de paginación.
