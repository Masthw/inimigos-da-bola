import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/ui/AuthLayout";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

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

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setApiError("");

    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      icon="sports_soccer"
      title="INIMIGOS"
      subtitle="DA BOLA"
      heading="BEM-VINDO DE VOLTA"
      description="Entre na sua conta para acompanhar seus jogos"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
        <InputField
          label="Email"
          type="email"
          placeholder="seu@email.com"
          icon="mail"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />

        <InputField
          label="Senha"
          type="password"
          placeholder="••••••••"
          icon="lock"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        {apiError && (
          <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/30">
            <span className="material-symbols-outlined text-error text-[20px]">
              error
            </span>
            <span className="label-sm text-error">{apiError}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="label-sm text-primary hover:text-primary-container transition-colors"
          >
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
          <span className="bg-surface-container px-4 label-sm text-on-surface-variant">
            OU
          </span>
        </div>
      </div>

      <div className="mt-stack-md">
        <Link to="/register">
          <Button variant="ghost" fullWidth icon="person_add">
            CRIAR CONTA
          </Button>
        </Link>
      </div>
    </AuthLayout>
  );
}