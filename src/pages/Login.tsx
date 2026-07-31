import { Navigate } from "react-router-dom"; // 1. Importa o Navigate
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/layout/AuthLayout";
import trophySrc from "../assets/thropy.svg";
import googleSrc from "../assets/google.svg";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { signInWithGoogle, user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout
      icon={<img src={trophySrc} className="w-10 h-10" alt="Troféu" />}
      title="INIMIGOS"
      subtitle="DA BOLA"
      heading="ENTRAR EM CAMPO" 
      description="Entre ou crie sua conta rapidamente usando o Google"
    >
      <div className="flex flex-col gap-stack-md">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          icon={<img src={googleSrc} className="w-5 h-5" alt="Google" />}
          onClick={signInWithGoogle}
        >
          CONTINUAR COM GOOGLE
        </Button>
      </div>
    </AuthLayout>
  );
}