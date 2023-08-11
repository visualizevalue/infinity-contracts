export function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from(
    { length: Math.ceil(arr.length / size) },
    (_: any, i: number) => arr.slice(i * size, i * size + size)
  )
}
