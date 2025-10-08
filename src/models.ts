export interface AdUnitsFetchModel {
    /**
     * The search query string. Must be at least 2 characters long.
     */
    query: string;
    /**
     * Should 'fingerprint' based filtering be used or not.
     */
    use_fingerprint_filtering: boolean;
}

export interface AdUnitsIntegrateModel {
    /**
     * A list of ad unit IDs to integrate.
     */
    ad_unit_ids: string[];
    /**
     * The base content for integration. Must be at least 10 characters long.
     */
    base_content: string;
}
