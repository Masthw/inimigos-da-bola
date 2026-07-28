import { useState } from "react";
import { Link } from "react-router-dom";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/layout/AuthLayout";
import { MaterialIcon } from "../components/ui/MaterialIcon";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <AuthLayout icon="lock_reset" title="INIMIGOS" subtitle="DA BOLA" heading="EMAIL ENVIADO">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success/20 rounded-full mb-stack-md">
            <MaterialIcon name="mark_email_read" className="w-8 h-8 text-success" />
          </div>
          <p className="body-md text-on-surface-variant mb-stack-lg">Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
          <Link to="/login">
            <Button variant="secondary" fullWidth icon="arrow_back">
              VOLTAR AO LOGIN
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
      heading="ESQUECEU A SENHA?"
      description="Informe seu email e enviaremos um link para redefinir sua senha."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
        className="flex flex-col gap-stack-md"
      >
        <InputField label="Email" type="email" placeholder="seu@email.com" icon="mail" value={email} onChange={setEmail} />

        <Button type="submit" fullWidth icon="send">
          ENVIAR LINK
        </Button>
      </form>

      <div className="mt-stack-lg text-center">
        <Link to="/login" className="label-sm text-primary hover:text-primary-container transition-colors inline-flex items-center gap-1">
          <MaterialIcon name="arrow_back" className="w-4 h-4" />
          <span>Voltar ao login</span>{" "}
        </Link>
      </div>
    </AuthLayout>
  );
}
