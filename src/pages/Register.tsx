import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/ui/AuthLayout";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const rgx = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

    if (!name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmação é obrigatória";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
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
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Erro ao criar conta"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      icon="person_add"
      title="INIMIGOS"
      subtitle="DA BOLA"
      heading="CRIAR CONTA"
      description="Junte-se ao time e comece a marcar gols"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
        <InputField
          label="Nome completo"
          placeholder="João Silva"
          icon="person"
          value={name}
          onChange={setName}
          error={errors.name}
        />

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

        <InputField
          label="Confirmar senha"
          type="password"
          placeholder="••••••••"
          icon="lock"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
        />

        {apiError && (
          <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/30">
            <span className="material-symbols-outlined text-error text-[20px]">
              error
            </span>
            <span className="label-sm text-error">{apiError}</span>
          </div>
        )}

        <Button type="submit" fullWidth icon="how_to_reg" disabled={loading}>
          {loading ? "CRIANDO CONTA..." : "CRIAR CONTA"}
        </Button>
      </form>

      <div className="mt-stack-lg text-center">
        <p className="label-sm text-on-surface-variant">
          Já tem uma conta?{" "}
          <Link
            to="/login"
            className="text-primary hover:text-primary-container transition-colors"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}