package com.pt.pathio.auth.exceptions;

/**
 * Raised when someone attempts a password login that the OAuth-only policy forbids.
 * Regular users must sign in with Google or GitHub; only the env-provisioned local
 * admin may use a password.
 */
public class OAuthOnlyException extends RuntimeException {

    public OAuthOnlyException(String message) {
        super(message);
    }
}
