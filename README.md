# Gerador de Prontuário APH

Aplicativo React/Vite para registro de atendimento e geração de relatórios.

## GitHub Pages
O workflow `.github/workflows/deploy.yml` instala com Bun, verifica TypeScript,
executa os testes, compila e publica somente `dist`.
Em Settings → Pages → Build and deployment, selecione **GitHub Actions** como Source.
URL: https://lndmours.github.io/gerador-relatorio/

O build do Pages usa `GITHUB_PAGES=true` para os caminhos do aplicativo e do PWA.
Usa também `VITE_STATIC_HOST=true` para processar documentos com Tesseract no navegador,
sem chamar um servidor inexistente. O primeiro carregamento do mecanismo OCR e do
idioma requer internet; não há garantia de OCR offline antes desses downloads.

## Desenvolvimento e servidor
`bun install --frozen-lockfile`
`bun run dev`

Para hospedar com Express, execute `bun run build` e
`NODE_ENV=production bun run server.ts`.
Configure `GEMINI_API_KEY` somente no servidor para habilitar OCR com Gemini.
GitHub Pages não executa `server.ts`. Nunca inclua essa chave em variáveis VITE_*.
