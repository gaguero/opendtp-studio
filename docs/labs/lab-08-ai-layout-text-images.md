# Lab 08: IA para Layout, Texto e Imágenes

## Proyectos y APIs Investigados

- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses): interfaz multimodal con texto, imágenes, structured outputs y herramientas.
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs): salida JSON validada por schema.
- [OpenAI Image Generation](https://platform.openai.com/docs/guides/image-generation): generación/edición con GPT Image, Image API y Responses image tool.
- [Anthropic Messages API](https://docs.claude.com/en/api/messages%C2%A0): mensajes con texto e imágenes.
- [Anthropic Structured Outputs](https://docs.claude.com/en/docs/build-with-claude/structured-outputs): JSON y tool use estricto.
- [Anthropic Tool Use](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview): herramientas con schemas.
- [Anthropic Vision](https://docs.claude.com/en/docs/vision): análisis multimodal de imágenes.
- [BullMQ](https://docs.bullmq.io/): cola open source para jobs con Redis.

## Qué Aprendemos

- La IA debe producir JSON validado o tool calls, no texto libre para mutar layout.
- Las imágenes generadas deben ser jobs asíncronos, no parte del request de edición.
- El mejor producto combina LLM + reglas deterministas + preview humano.

## Decisión para OpenDTP

Crear proveedor interno:

```ts
interface AiProvider {
  generateBrief(input: PromptInput): Promise<LayoutBrief>;
  generateLayout(input: LayoutBrief): Promise<LayoutDocument>;
  patchLayout(input: PatchInput): Promise<LayoutPatch[]>;
  editStory(input: StoryEditInput): Promise<StoryEdit>;
  critiqueLayout(input: LayoutDocument): Promise<PreflightFixPlan>;
  generateImage(input: AssetGenerationJob): Promise<GeneratedAsset>;
}
```

## Experimentos

1. Structured prompt-to-layout.
2. Layout patches por lenguaje natural.
3. Text fit: “shorten to fit this frame”.
4. Image generation worker.
5. AI preflight critic.

## Criterios de Aceptación

- Toda salida AI pasa por Zod.
- Hay repair loop.
- Hay fallback local determinista.
- Cada AI run se guarda con provider, modelo, prompt version, input hash, output hash, usage y latencia.
- UI muestra diff/preview antes de aplicar cambios grandes.

## Riesgos

- Costos altos si se usa modelo grande para todo.
- Imágenes generadas no respetan composición milimétrica.
- Sin audit log, depurar prompts en producción es imposible.
