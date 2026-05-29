# Gemini 404 Hotfix

This build fixes the production failure shown in Railway logs:

- `GoogleGenerativeAI Error: Error fetching from ... status: 404 Not Found`
- `operation: gemini_embedding`
- `operation: gemini_chat`

What changed:

1. Default chat model changed to `gemini-2.0-flash`.
2. Gemini chat now tries fallback models automatically:
   - env `GEMINI_CHAT_MODEL`
   - `gemini-2.0-flash`
   - `gemini-2.5-flash`
   - `gemini-1.5-flash-latest`
   - `gemini-1.5-flash`
3. Embedding search failure no longer breaks the reply flow. If embeddings fail, the bot continues with dashboard knowledge + business rules.
4. Embedding model fallback list was added:
   - env `GEMINI_EMBEDDING_MODEL`
   - `text-embedding-004`
   - `gemini-embedding-001`
   - `embedding-001`

Recommended Railway env values:

```env
GEMINI_CHAT_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

Then redeploy both services.
