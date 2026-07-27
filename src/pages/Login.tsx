import { useState } from "react";
import { Link } from "react-router-dom";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const newErrors: typeof errors = {};
    const rgx = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Email é obrigatório";
    } else if (!rgx.test(email)) {
      newErrors.email = "Email inválido";
    }

    if (!password) {
      newErrors.password = "Senha é obrigatória";
    } else if (password.length < 6) {
      newErrors.password = "Mínimo de 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-150 bg-primary-container/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-100 h-100 bg-secondary-container/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-stack-lg text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-container rounded-xl mb-stack-md brutal-shadow">
            <span className="material-symbols-outlined text-on-primary-container text-[40px]">sports_soccer</span>
          </div>
          <h1 className="display-lg text-primary font-display font-black uppercase tracking-tighter">INIMIGOS</h1>
          <h2 className="headline-md text-on-surface-variant font-display font-bold uppercase tracking-wider">DA BOLA</h2>
        </div>

        <div className="bg-surface-container border border-outline-variant p-stack-lg">
          <div className="mb-stack-lg">
            <h3 className="headline-md text-on-surface font-display font-bold mb-2">BEM-VINDO DE VOLTA</h3>
            <p className="body-md text-on-surface-variant">Entre na sua conta para acompanhar seus jogos</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!validate()) return;
              setLoading(true);
              setTimeout(() => setLoading(false), 2000);
            }}
            className="flex flex-col gap-stack-md"
          >
            <InputField label="Email" type="email" placeholder="seu@email.com" icon="mail" value={email} onChange={setEmail} error={errors.email} />

            <InputField
              label="Senha"
              type="password"
              placeholder="••••••••"
              icon="lock"
              value={password}
              onChange={setPassword}
              error={errors.password}
            />

            <div className="flex justify-end">
              <Link to="#" className="label-sm text-primary hover:text-primary-container transition-colors">
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" fullWidth icon="login" disabled={loading}>
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </Button>
          </form>

          <div className="mt-stack-lg relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-container px-4 label-sm text-on-surface-variant">OU</span>
            </div>
          </div>

          <div className="mt-stack-md">
            <Button variant="ghost" fullWidth icon="person_add">
              CRIAR CONTA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
