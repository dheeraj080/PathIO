package com.pt.pathio.shared.web;

/**
 * Cross-module keys for HTTP request attributes that one component writes and another reads.
 * Located in {@code shared} so both the {@code auth} module (writer) and the rate-limiting code
 * (reader) can reference them without an application-module dependency.
 */
public final class RequestAttributes {

    /**
     * Request attribute holding the SHA-256 digest of the authenticated API key.
     * Set by the API-key authentication filter; read by the rate-limit interceptor to bucket
     * per key instead of per client IP.
     */
    public static final String ATTR_API_KEY_HASH = "pathio.api-key-hash";

    private RequestAttributes() {
    }
}