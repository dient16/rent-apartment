/** Search backends are interchangeable: the rest of the app only sees this interface. */
export interface SearchProvider {
  readonly name: string;
  /** Boot hook. Must never throw - an unavailable backend just falls back to regex. */
  init(): Promise<void>;
  isAvailable(): boolean;
  /**
   * Returns apartmentIds by relevance, or null to fall back to the Mongo regex search.
   * `places`: place names that must each match an address field (old or current names),
   * e.g. ["Quy Nhơn", "Gia Lai"]; `text` is free text (title words).
   */
  search(text: string, maxResults: number, places?: string[]): Promise<string[] | null>;
  /** Write-through hooks. No-ops on backends that read the collection directly. */
  index(apartment: any): Promise<void>;
  remove(apartmentId: string): Promise<void>;
  /** Full rebuild. Returns how many documents were written. */
  reindexAll(apartments: any[]): Promise<number>;
  close(): Promise<void>;
}
