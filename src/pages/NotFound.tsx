import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-display font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-display text-on-surface mb-2 uppercase">Página não encontrada</h2>
        <p className="text-on-surface-variant mb-8">
          A página que você está procurando não existe ou foi removida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button variant="primary" fullWidth icon={<MaterialIcon name="home" />}>
              Voltar para o início
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" fullWidth icon={<MaterialIcon name="login" />}>
              Fazer login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
