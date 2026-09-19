export interface ArtworkProvider {
  fetchArt(title: string, year: string): Promise<string | undefined>;
}
