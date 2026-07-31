export const NAV_ITEMS = [
  { icon: 'home', label: 'Home', href: '/', active: true },
  { icon: 'event_available', label: 'Partidas', href: '/matches' },
  { icon: 'grid_view', label: 'Escalação', href: '/tactics' },
  { icon: 'military_tech', label: 'Tabela', href: '/rankings' },
]

export const LEADERBOARD = [
  { pos: 1, name: 'Ricardo G.', pts: '2,840 pts' },
  { pos: 2, name: 'Bruno M.', pts: '2,610 pts' },
  { pos: 3, name: 'Cadu S.', pts: '2,490 pts' },
]

export const PLAYER_STATS = [
  { label: 'Gols', value: '12', colorClass: 'text-primary', hoverBgClass: 'bg-primary-container', hoverTextClass: 'text-on-primary-container' },
  { label: 'Assistências', value: '08', colorClass: 'text-secondary', hoverBgClass: 'bg-secondary-container', hoverTextClass: 'text-on-secondary-container' },
  { label: 'Taxa de Vitórias', value: '68%', colorClass: 'text-tertiary', hoverBgClass: 'bg-tertiary-container', hoverTextClass: 'text-on-tertiary-container' },
]

export const NEXT_MATCH = {
  title: 'Arena Gol de Placa',
  date: 'Sexta-feira, 22 de Outubro',
  time: '20:30 - 22:00',
  location: 'Rua das Olimpíadas, 450 - SP',
  imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrM-xzk3UcyBsHdCC-YYoo1yRb8-sm2S1iZdpS4AylcAW8bCzYsix_qX8u-IJP8VQ2tahqnWmWQ31dV7sVyn9saDipOPLf0-ukyZRIsdmNe3RodJxWZgWilhQYd6nwwf-x_mc7oUjpxzj_k7JIZNUW_3CzfiXAYIMMMqW4FnO06VoY8Pbp9JpO5osOoQd7TqT1XVrwY0d0fvk0wIXWxkWBErwRssgrJP-SKusxK7S1YNbAH1KvNPKhM2Fo9fEAkzQW7-BJYHEnLEM',
}

export const AVATARS = {
  profile: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDT9-KnZ3fOXVmZ4Xty22fRAQQBBOXRcW4p1g4d-twqkIXDGMAvBNosqmymV_MAIRWFOWUGAW5dj_FeSzVzOkZ1rs7_-r2nlKAg3_er5PnuEz5nIErmEiEoHMp0VdW0PYbDpDIZ3iCeYqGzYg2OjKOSw7s4otYlx60Xv9r3uo30ecDJs_a3iR004GpE9XOiVxMbIBGsOuVI8jBO5M2IHsan75lCFMnXXzdGDh8GJ9T6k2fWRpZANT6hZznTV0I2qWENFn6CFACfQ_Q',
  mobile: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCj4TjR7yjw7ZHHsltXpd7-GwcQ-Yiac-qBELBS3AWDgUq8v7niLq7xBqhFcrJBYtPP-R9fJHaoUw4pympyVNWm0Vh8xhfaKYG3j8HDTctg1_zHwE0nEOJZ_msCbtL1mMlIw9-C9H4U2GSwymDCbFTePaJiSK8Art9iQonGlOCv9zYpOTzCs1z8wUMsZ8k65grYDsT2meEy8PV4OkplGGNKMMIdD95WTKN_sSB3wQ8F2mg3xDPLpjunyOFe1mCwdd-jlC-lRzIwttA',
  rank1: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2tfRJvX0ZOCFooNTBY2TtxC1AUlUFh84V_gOLMkxbQFSueLKIrWkdOTal9WjvURhGQqSOb7rCcnC2Nh4-LWDDzLNPR2yDWh5EXRw9d8Qej669RRPwRJE8XkOBV_5qJmmveM3eLW9LMyRh4ImKY3uYCPUkMrcuIGcWzR83XGmm_KeEtU3ZWib3b1C6EhnvmiOsTxx5rEuHHS7vjJ4f6eBrbvu3amGl60D8OKgXi8om-EJZnfB-vpv_8ZJm4NGfUMFt9t--81MTwvM',
  rank2: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBD7B-H_1Pk89JuYyzEolPUZyieMsRDvqPa8z_6HCk839n5BUW5t4wQFIxzaAWvY2vTEub7Yq2W5sUT5nFSCcsK1STySiHaknKbFylbfS6uLjN50gKNlB00CpObnL9JHUbgVuQkhSI4dlxT2DpsoKNKW82ftsMlsxyA3AWA59xp0sA6eSz0g74IBVfJHs-Tdcg56ENBiCw7BqH7W-htmhIUtyrMouXr_KCHTL-Qjj-5xyoqJ8pHBkAxlLjvILYk77gD2GsMaAb6iqg',
  rank3: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAATkSjCvAYDJEff2yGp9Fs15Mo0fD0LuXiRFSx7r5XUOQkjZaXb1EScXqxXGNnb7E-cdqQ2SVyu1C6LTbooFlrm2JJGRwbOZxm6rG9B2HcHUuK28Yr8Mz1epORuDUJzELfYyWKGpYIBy7TThGlWejdbIzTRf1xyY4t9Fq9-ZeGnJ2Cv9h9qfxl-jPmiy2HGzPsd6KykyJOLWJx1QSESQSFZ5qj8rVFuQ_9lojRYNzcktaV-7XDLHSWmUKTTpRswD8mh1pe4EVx9_w',
}

export const BOTTOM_NAV_ITEMS = [
 { icon: 'home', label: 'Home', href: '/', active: true },
  { icon: 'event_available', label: 'Partidas', href: '/matches' },
  { icon: 'grid_view', label: 'Escalação', href: '/tactics' },
  { icon: 'military_tech', label: 'Tabela', href: '/rankings' },
]
