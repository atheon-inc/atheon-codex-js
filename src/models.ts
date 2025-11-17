export interface AtheonUnitFetchAndIntegrateModel {
    /**
     * The search query string. Must be at least 2 characters long.
     */
    query: string;
    /**
     * The base content for integration. Must be at least 10 characters long.
     */
    base_content: string;
    /**
     * Should include 'ad_units' or not.
     */
    include_ad_units: boolean;
    /**
     * Should 'user_intent' be used as filter or not.
     */
    use_user_intent_as_filter: boolean;
}
