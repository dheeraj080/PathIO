package com.pt.pathio.auth.exceptions;

/**
 * Raised when an OAuth provider identity cannot be safely associated with an existing account:
 * unverified provider email, or an email that already belongs to a different provider. The OAuth
 * success handler converts this into a {@code OAUTH_AUTH_FAILURE} popup message; callers must never
 * link accounts silently or surface a raw server error.
 */
public class ProviderIdentityException extends RuntimeException {

    public ProviderIdentityException(String message) {
        super(message);
    }
}