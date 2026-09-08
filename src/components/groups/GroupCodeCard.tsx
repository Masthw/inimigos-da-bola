import { useState } from "react";
import { MaterialIcon } from "../ui/MaterialIcon";

interface GroupCodeCardProps {
  code: string;
  groupName: string;
}

export function GroupCodeCard({ code, groupName }: Readonly<GroupCodeCardProps>) {
  const [copied, setCopied] = useState(false);

  async function handleCopyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mb-8 p-4 bg-surface-container-high border border-outline-variant rounded-xl">
      <h2 className="text-title-md font-mono text-on-surface mb-3">Código do grupo</h2>
      <p className="text-body-sm text-on-surface-variant mb-3">
        Compartilhe este código com quem você quer que entre no grupo:
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-surface-container font-mono text-headline-sm text-on-surface border border-outline-variant rounded text-center tracking-widest">
          {code}
        </code>
        <button
          type="button"
          onClick={handleCopyCode}
          className="px-4 py-2 bg-primary text-on-primary font-mono text-label-sm brutal-shadow hover:scale-105 transition-transform flex items-center gap-2"
        >
          <MaterialIcon name={copied ? "check" : "content_copy"} className="w-4 h-4" />
          {copied ? "COPIADO!" : "COPIAR"}
        </button>
      </div>
      <p className="text-label-sm text-on-surface-variant mt-2">
        Nome: <span className="text-on-surface font-bold">{groupName}</span>
      </p>
    </section>
  );
}
