import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/layout/AuthLayout";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import googleSrc from "../assets/google.svg";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { register } = useAuth();

  async function handleGoogleRegister() {
    try {
      await register("Novo Jogador", "novo@email.com", "123456");
    } catch (err) {
      console.error("Erro ao cadastrar com Google", err);
    }
  }

  return (
    <AuthLayout
      icon={<MaterialIcon name="person_add" className="w-10 h-10" />}
      title="INIMIGOS"
      subtitle="DA BOLA"
      heading="CRIAR CONTA"
      description="Crie sua conta com o Google e entre em campo"
    >
      <div className="flex flex-col gap-stack-md">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          icon={<img src={googleSrc} className="w-5 h-5" alt="Google" />}
          onClick={handleGoogleRegister}
        >
          CADASTRAR COM GOOGLE
        </Button>

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
      </div>
    </AuthLayout>
  );
}
