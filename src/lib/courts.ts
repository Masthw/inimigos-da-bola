export const PHOTOS = {
  futsal: '/photos/futsal.jpg',
  futsal2: '/photos/futsal2.jpg',
  futsalNight: '/photos/futsal-night.jpg',
  societyDay: '/photos/society-day.jpg',
  societyNight: '/photos/society-night.jpg',
  lockerRoom: '/photos/locker-room.jpg',
  bench: '/photos/bench.jpg',
  training: '/photos/training.jpg',
  estadio1: '/photos/estadio1.jpg',
  estadio2: '/photos/estadio2.jpg',
  estadio3: '/photos/estadio3.jpg',
} as const

export const ATMOSPHERE_PHOTOS = [
  PHOTOS.lockerRoom,
  PHOTOS.bench,
  PHOTOS.training,
  PHOTOS.estadio1,
  PHOTOS.estadio2,
  PHOTOS.estadio3,
] as const

export function getCourtPhotos(sportName: string | null, hour: number): string[] {
  const normalized = (sportName ?? '').toLowerCase()
  const isNight = hour >= 18

  if (normalized.includes('futsal')) {
    return isNight ? [PHOTOS.futsalNight] : [PHOTOS.futsal, PHOTOS.futsal2]
  }
  if (normalized.includes('society')) {
    return isNight ? [PHOTOS.societyNight] : [PHOTOS.societyDay]
  }
  return isNight ? [PHOTOS.societyNight] : [PHOTOS.societyDay]
}
