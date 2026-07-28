import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/layout/AuthLayout";
import { useAuth } from "../hooks/useAuth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  const { resetPassword } = useAuth();

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

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
    if (!token) {
      setApiError("Token inválido");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Erro ao redefinir senha"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout
        icon="error"
        title="INIMIGOS"
        subtitle="DA BOLA"
        heading="TOKEN INVÁLIDO"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-error/20 rounded-full mb-stack-md">
            <span className="material-symbols-outlined text-error text-[32px]">
              link_off
            </span>
          </div>
          <p className="body-md text-on-surface-variant mb-stack-lg">
            O link de redefinição de senha é inválido ou expirado.
          </p>
          <Link to="/forgot-password">
            <Button fullWidth icon="refresh">
              SOLICITAR NOVO LINK
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        icon="lock_reset"
        title="INIMIGOS"
        subtitle="DA BOLA"
        heading="SENHA REDEFINIDA"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success/20 rounded-full mb-stack-md">
            <span className="material-symbols-outlined text-success text-[32px]">
              check_circle
            </span>
          </div>
          <p className="body-md text-on-surface-variant mb-stack-lg">
            Sua senha foi redefinida com sucesso. Agora você pode fazer login.
          </p>
          <Link to="/login">
            <Button fullWidth icon="login">
              FAZER LOGIN
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon="lock_reset"
      title="INIMIGOS"
      subtitle="DA BOLA"
      heading="REDEFINIR SENHA"
      description="Crie uma nova senha para sua conta."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
        <InputField
          label="Nova senha"
          type="password"
          placeholder="••••••••"
          icon="lock"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        <InputField
          label="Confirmar nova senha"
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

        <Button type="submit" fullWidth icon="save" disabled={loading}>
          {loading ? "REDEFININDO..." : "REDEFINIR SENHA"}
        </Button>
      </form>

      <div className="mt-stack-lg text-center">
        <Link
          to="/login"
          className="label-sm text-primary hover:text-primary-container transition-colors inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Voltar ao login</span>
        </Link>
      </div>
    </AuthLayout>
  );
}