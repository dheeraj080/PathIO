package com.pt.pathio.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Creation result. {@code key} is the plaintext API key and is returned <em>exactly once</em> —
 * the server stores only its SHA-256 digest, so it cannot be shown again.
 */
@Schema(description = "Result of creating an API key; the plaintext key is returned exactly once")
public record CreateApiKeyResponse(
        @Schema(description = "Plaintext API key — show it now, it cannot be recovered later",
                example = "pio_4XqZ...32-char-secret", requiredMode = Schema.RequiredMode.REQUIRED)
        String key,
        @Schema(description = "Persisted key metadata") ApiKeyResponse apiKey
) {
}