// Shim APENAS para o tsserver do VS Code (que não conhece o global Deno).
// Quem valida estes arquivos de verdade é o Deno LSP + `deno check`/`deno lint`.
declare namespace Deno {
  function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string },
  ): void
  namespace env {
    function get(key: string): string | undefined
  }
}
