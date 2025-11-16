import { Scale } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-background py-12 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Monitor Judicial PJBC</span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="/pricing" className="text-muted-foreground transition-colors hover:text-foreground">
              Precios
            </Link>
            <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
              Iniciar Sesión
            </Link>
            <Link href="/signup" className="text-muted-foreground transition-colors hover:text-foreground">
              Registrarse
            </Link>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-border pt-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">© 2025 Monitor Judicial PJBC. Todos los derechos reservados.</p>
          <p className="text-xs text-muted-foreground space-x-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Política de Privacidad
            </Link>
            <span className="text-muted-foreground/50">·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Términos de Servicio
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Icono de{' '}
            <a
              href="https://www.flaticon.com/free-icons/law"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              title="law icons"
            >
              Freepik - Flaticon
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
