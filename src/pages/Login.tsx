import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/layout/AuthLayout";
import trophySrc from "../assets/thropy.svg";
import googleSrc from "../assets/google.svg";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();

  async function handleGoogleLogin() {
    try {
      await login("ricardo@mail.com", "123456");
    } catch (err) {
      console.error("Erro ao fazer login com Google", err);
    }
  }

  return (
    <AuthLayout
      icon={<img src={trophySrc} className="w-10 h-10" alt="Troféu" />}
      title="INIMIGOS"
      subtitle="DA BOLA"
      heading="BEM-VINDO DE VOLTA"
      description="Entre com sua conta Google para continuar"
    >
      <div className="flex flex-col gap-stack-md">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          icon={<img src={googleSrc} className="w-5 h-5" alt="Google" />}
          onClick={handleGoogleLogin}
        >
          ENTRAR COM GOOGLE
        </Button>

        <Link to="/register">
          <Button variant="ghost" fullWidth icon="person_add">
            CRIAR CONTA
          </Button>
        </Link>
      </div>
    </AuthLayout>
  );
}
