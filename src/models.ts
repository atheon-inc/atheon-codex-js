export interface AtheonUnitCreateModel {
    /**
     * The search query string. Must be at least 2 characters long.
     */
    query: string;
    /**
     * The base content for integration. Must be at least 10 characters long.
     */
    base_content: string;
}
