import { useState } from "react";
import { Link } from "react-router-dom";

const NAV_ITEMS = [
  { icon: "home", label: "Home", href: "/", active: true },
  { icon: "event_available", label: "My Matches", href: "/matches" },
  { icon: "grid_view", label: "Tactical Board", href: "/tactics" },
  { icon: "military_tech", label: "League Table", href: "/rankings" },
  { icon: "history", label: "History", href: "/history" },
  { icon: "analytics", label: "Player Stats", href: "/stats" },
];

const LEADERBOARD = [
  {
    pos: 1,
    name: "Ricardo G.",
    pts: "2,840 pts",
    borderClass: "border-tertiary",
    bgClass: "bg-surface-container-highest",
    posClass: "text-tertiary",
  },
  {
    pos: 2,
    name: "Bruno M.",
    pts: "2,610 pts",
    borderClass: "border-outline",
    bgClass: "bg-surface-container-low",
    posClass: "text-on-surface-variant",
  },
  {
    pos: 3,
    name: "Cadu S.",
    pts: "2,490 pts",
    borderClass: "border-secondary-container",
    bgClass: "bg-surface-container-low",
    posClass: "text-on-surface-variant",
  },
];

const AVATARS = {
  profile:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDT9-KnZ3fOXVmZ4Xty22fRAQQBBOXRcW4p1g4d-twqkIXDGMAvBNosqmymV_MAIRWFOWUGAW5dj_FeSzVzOkZ1rs7_-r2nlKAg3_er5PnuEz5nIErmEiEoHMp0VdW0PYbDpDIZ3iCeYqGzYg2OjKOSw7s4otYlx60Xv9r3uo30ecDJs_a3iR004GpE9XOiVxMbIBGsOuVI8jBO5M2IHsan75lCFMnXXzdGDh8GJ9T6k2fWRpZANT6hZznTV0I2qWENFn6CFACfQ_Q",
  mobile:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCj4TjR7yjw7ZHHsltXpd7-GwcQ-Yiac-qBELBS3AWDgUq8v7niLq7xBqhFcrJBYtPP-R9fJHaoUw4pympyVNWm0Vh8xhfaKYG3j8HDTctg1_zHwE0nEOJZ_msCbtL1mMlIw9-C9H4U2GSwymDCbFTePaJiSK8Art9iQonGlOCv9zYpOTzCs1z8wUMsZ8k65grYDsT2meEy8PV4OkplGGNKMMIdD95WTKN_sSB3wQ8F2mg3xDPLpjunyOFe1mCwdd-jlC-lRzIwttA",
  rank1:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB2tfRJvX0ZOCFooNTBY2TtxC1AUlUFh84V_gOLMkxbQFSueLKIrWkdOTal9WjvURhGQqSOb7rCcnC2Nh4-LWDDzLNPR2yDWh5EXRw9d8Qej669RRPwRJE8XkOBV_5qJmmveM3eLW9LMyRh4ImKY3uYCPUkMrcuIGcWzR83XGmm_KeEtU3ZWib3b1C6EhnvmiOsTxx5rEuHHS7vjJ4f6eBrbvu3amGl60D8OKgXi8om-EJZnfB-vpv_8ZJm4NGfUMFt9t--81MTwvM",
  rank2:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBD7B-H_1Pk89JuYyzEolPUZyieMsRDvqPa8z_6HCk839n5BUW5t4wQFIxzaAWvY2vTEub7Yq2W5sUT5nFSCcsK1STySiHaknKbFylbfS6uLjN50gKNlB00CpObnL9JHUbgVuQkhSI4dlxT2DpsoKNKW82ftsMlsxyA3AWA59xp0sA6eSz0g74IBVfJHs-Tdcg56ENBiCw7BqH7W-htmhIUtyrMouXr_KCHTL-Qjj-5xyoqJ8pHBkAxlLjvILYk77gD2GsMaAb6iqg",
  rank3:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAATkSjCvAYDJEff2yGp9Fs15Mo0fD0LuXiRFSx7r5XUOQkjZaXb1EScXqxXGNnb7E-cdqQ2SVyu1C6LTbooFlrm2JJGRwbOZxm6rG9B2HcHUuK28Yr8Mz1epORuDUJzELfYyWKGpYIBy7TThGlWejdbIzTRf1xyY4t9Fq9-ZeGnJ2Cv9h9qfxl-jPmiy2HGzPsd6KykyJOLWJx1QSESQSFZ5qj8rVFuQ_9lojRYNzcktaV-7XDLHSWmUKTTpRswD8mh1pe4EVx9_w",
  pitch:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCrM-xzk3UcyBsHdCC-YYoo1yRb8-sm2S1iZdpS4AylcAW8bCzYsix_qX8u-IJP8VQ2tahqnWmWQ31dV7sVyn9saDipOPLf0-ukyZRIsdmNe3RodJxWZgWilhQYd6nwwf-x_mc7oUjpxzj_k7JIZNUW_3CzfiXAYIMMMqW4FnO06VoY8Pbp9JpO5osOoQd7TqT1XVrwY0d0fvk0wIXWxkWBErwRssgrJP-SKusxK7S1YNbAH1KvNPKhM2Fo9fEAkzQW7-BJYHEnLEM",
};

function MaterialIcon({ name, fill = false, className = "" }: { name: string; fill?: boolean; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}>
      {name}
    </span>
  );
}

function Sidebar() {
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full py-stack-lg w-64 bg-surface-container border-r border-outline-variant z-50">
      <div className="px-6 mb-stack-lg">
        <h1 className="text-headline-lg font-display font-black text-primary tracking-tighter">INIMIGOS DA BOLA</h1>
      </div>

      <div className="flex items-center gap-3 px-6 py-4 mb-stack-lg">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
          <img className="w-full h-full object-cover" src={AVATARS.profile} alt="Avatar do jogador" />
        </div>
        <div>
          <p className="text-on-surface font-mono text-label-bold">Player One</p>
          <p className="text-on-surface-variant font-mono text-label-sm">Pro League</p>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.icon}
            to={item.href}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg mx-2 transition-all ${
              item.active ? "bg-primary-container text-on-primary-container translate-x-1" : "text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            <MaterialIcon name={item.icon} />
            <span className="font-mono text-label-bold">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="px-4 mt-auto">
        <button className="w-full bg-primary text-on-primary font-mono text-label-bold py-4 brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-2">
          <MaterialIcon name="add_circle" />
          Book a Match
        </button>
      </div>
    </nav>
  );
}

function MobileTopBar() {
  return (
    <header className="md:hidden flex justify-between items-center px-4 w-full h-16 z-50 bg-surface border-b border-outline-variant sticky top-0">
      <h1 className="text-headline-md font-display font-black tracking-tighter text-primary">STRIKER HQ</h1>
      <div className="flex items-center gap-4">
        <MaterialIcon name="notifications" className="text-on-surface-variant" />
        <div className="w-8 h-8 rounded-full overflow-hidden border border-primary">
          <img className="w-full h-full object-cover" src={AVATARS.mobile} alt="Avatar mobile" />
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const items = [
    { icon: "dashboard", label: "Dashboard", active: true },
    { icon: "sports_soccer", label: "Matches" },
    { icon: "strategy", label: "Tactics" },
    { icon: "leaderboard", label: "Rankings" },
    { icon: "person", label: "Profile" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface-container-high border-t border-outline-variant/20 rounded-t-xl shadow-lg">
      {items.map((item) => (
        <Link
          key={item.icon}
          to="#"
          className={`flex flex-col items-center justify-center transition-transform duration-100 ${
            item.active
              ? "text-primary-container bg-surface-container-highest rounded-full px-4 py-1 scale-95"
              : "text-on-surface-variant hover:bg-surface-variant/50"
          }`}
        >
          <MaterialIcon name={item.icon} />
          <span className="font-mono text-label-sm">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function NextMatch() {
  const [status, setStatus] = useState<"idle" | "confirming" | "confirmed">("idle");

  function handleConfirm() {
    if (status !== "idle") return;
    setStatus("confirming");
    setTimeout(() => setStatus("confirmed"), 1200);
  }

  return (
    <section className="md:col-span-8 group">
      <div className="relative overflow-hidden bg-surface-container-high rounded-xl border border-outline-variant h-full flex flex-col md:flex-row transition-all hover:border-primary/50">
        <div className="relative w-full md:w-1/2 h-48 md:h-full min-h-[200px]">
          <img className="w-full h-full object-cover" src={AVATARS.pitch} alt="Quadra de futsal" />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface-container-high via-transparent to-transparent" />
        </div>

        <div className="p-stack-lg flex flex-col justify-between flex-1 relative z-10">
          <div>
            <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container font-mono text-label-sm mb-4 uppercase tracking-widest">
              Próxima Pelada
            </span>
            <h3 className="text-headline-md font-display text-on-surface mb-stack-sm">Arena Gol de Placa</h3>
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-3 text-on-surface-variant">
                <MaterialIcon name="calendar_today" className="text-primary" />
                <span className="font-body">Sexta-feira, 22 de Outubro</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant">
                <MaterialIcon name="schedule" className="text-primary" />
                <span className="font-body">20:30 - 22:00</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant">
                <MaterialIcon name="location_on" className="text-primary" />
                <span className="font-body">Rua das Olimpíadas, 450 - SP</span>
              </div>
            </div>
          </div>

          <div className="mt-stack-lg">
            {status === "confirmed" ? (
              <button
                disabled
                className="w-full md:w-auto bg-green-800 text-white px-10 py-4 font-mono text-label-bold rounded-none transition-transform flex items-center justify-center gap-3"
              >
                <MaterialIcon name="verified" fill className="text-white" />
                VOCÊ ESTÁ DENTRO!
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="w-full md:w-auto bg-primary text-on-primary px-10 py-4 font-mono text-label-bold brutal-shadow brutal-shadow-hover rounded-none transition-transform flex items-center justify-center gap-3"
              >
                <MaterialIcon name={status === "confirming" ? "pending" : "check_circle"} fill />
                {status === "confirming" ? "CONFIRMANDO..." : "EU VOU!"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Leaderboard() {
  const avatarMap: Record<number, string> = { 1: AVATARS.rank1, 2: AVATARS.rank2, 3: AVATARS.rank3 };

  return (
    <section className="md:col-span-4">
      <div className="bg-surface-container rounded-xl border border-outline-variant p-stack-md h-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-headline-md font-display text-primary uppercase">Leaderboard</h3>
          <MaterialIcon name="more_horiz" className="text-on-surface-variant" />
        </div>

        <div className="space-y-4">
          {LEADERBOARD.map((p) => (
            <div key={p.pos} className={`flex items-center justify-between p-3 ${p.bgClass} rounded-lg border-l-4 ${p.borderClass}`}>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-label-bold ${p.posClass} w-4`}>{p.pos}</span>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
                  <img className="w-full h-full object-cover" src={avatarMap[p.pos]} alt={p.name} />
                </div>
                <span className="font-body font-bold text-on-surface">{p.name}</span>
              </div>
              <span className={`font-mono text-label-bold ${p.pos === 1 ? "text-tertiary" : "text-on-surface-variant"}`}>{p.pts}</span>
            </div>
          ))}
        </div>

        <Link to="/rankings" className="w-full mt-6 text-primary font-mono text-label-sm flex items-center justify-center gap-1 hover:underline">
          Ver Ranking Completo
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  colorClass,
  hoverBgClass,
  hoverTextClass,
}: {
  label: string;
  value: string;
  colorClass: string;
  hoverBgClass: string;
  hoverTextClass: string;
}) {
  return (
    <div
      className={`bg-surface-container-high rounded-xl border border-outline-variant p-6 flex flex-col items-center justify-center group hover:${hoverBgClass} transition-colors duration-300`}
    >
      <span className={`text-on-surface-variant group-hover:${hoverTextClass} uppercase font-mono text-label-sm mb-2`}>{label}</span>
      <span className={`display-lg ${colorClass} group-hover:text-white`}>{value}</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-background text-on-background">
      <Sidebar />
      <MobileTopBar />

      <main className="md:ml-64 p-4 md:p-margin-desktop min-h-screen pb-24 md:pb-margin-desktop">
        <div className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-[28px] md:text-headline-lg font-display text-primary uppercase leading-tight font-bold">Player Dashboard</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          <NextMatch />
          <Leaderboard />

          <section className="md:col-span-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
              <StatCard
                label="My Goals"
                value="12"
                colorClass="text-primary"
                hoverBgClass="bg-primary-container"
                hoverTextClass="text-on-primary-container"
              />
              <StatCard
                label="My Assists"
                value="08"
                colorClass="text-secondary"
                hoverBgClass="bg-secondary-container"
                hoverTextClass="text-on-secondary-container"
              />
              <StatCard
                label="Win Rate"
                value="68%"
                colorClass="text-tertiary"
                hoverBgClass="bg-tertiary-container"
                hoverTextClass="text-on-tertiary-container"
              />
            </div>
          </section>

          <section className="md:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter"></div>
          </section>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
