import { useState } from "react";
import { Link } from "react-router-dom";
import { InputField } from "../components/ui/InputField";
import { Button } from "../components/ui/Button";
import { AuthLayout } from "../components/ui/AuthLayout";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <AuthLayout icon="person_add" title="INIMIGOS" subtitle="DA BOLA" heading="CRIAR CONTA" description="Junte-se ao time e comece a marcar gols">
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="flex flex-col gap-stack-md"
      >
        <InputField label="Nome completo" placeholder="João Silva" icon="person" value={name} onChange={setName} />

        <InputField label="Email" type="email" placeholder="seu@email.com" icon="mail" value={email} onChange={setEmail} />

        <InputField label="Senha" type="password" placeholder="••••••••" icon="lock" value={password} onChange={setPassword} />

        <InputField
          label="Confirmar senha"
          type="password"
          placeholder="••••••••"
          icon="lock"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <Button type="submit" fullWidth icon="how_to_reg">
          CRIAR CONTA
        </Button>
      </form>

      <div className="mt-stack-lg text-center">
        <p className="label-sm text-on-surface-variant">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-primary hover:text-primary-container transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
