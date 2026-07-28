import type { ReactNode } from "react";

interface AuthLayoutProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  heading: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ icon, title, subtitle, heading, description, children, footer }: Readonly<AuthLayoutProps>) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-150 bg-primary-container/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-100 h-100 bg-secondary-container/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-stack-lg text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-container rounded-xl mb-stack-md brutal-shadow">
            {icon}
          </div>
          <h1 className="display-lg text-primary font-display font-black uppercase tracking-tighter">{title}</h1>
          <h2 className="headline-md text-on-surface-variant font-display font-bold uppercase tracking-wider">{subtitle}</h2>
        </div>

        <div className="bg-surface-container border border-outline-variant p-stack-lg">
          <div className="mb-stack-lg">
            <h3 className="headline-md text-on-surface font-display font-bold mb-2">{heading}</h3>
            {description && <p className="body-md text-on-surface-variant">{description}</p>}
          </div>

          {children}

          {footer && <div className="mt-stack-lg">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
