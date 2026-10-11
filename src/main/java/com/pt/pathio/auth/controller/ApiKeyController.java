package com.pt.pathio.auth.controller;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.dto.ApiKeyResponse;
import com.pt.pathio.auth.dto.CreateApiKeyRequest;
import com.pt.pathio.auth.dto.CreateApiKeyResponse;
import com.pt.pathio.auth.service.ApiKeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Programmatic-access key management. Keys authenticate requests via the {@code X-API-Key} header;
 * the plaintext is returned once on creation and is otherwise never stored or shown again.
 */
@RestController
@RequestMapping("/api/v1/api-keys")
@RequiredArgsConstructor
@Tag(name = "API Keys",
        description = "Manage the caller's programmatic access keys. Plaintext is returned exactly "
                + "once at creation; the server stores only the SHA-256 digest, so keys cannot be "
                + "shown again and must be regenerated if lost.")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    @GetMapping
    @Operation(summary = "List my API keys", description = "Metadata only — key digests are never exposed.")
    public List<ApiKeyResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return apiKeyService.list(principal.id());
    }

    @PostMapping
    @Operation(summary = "Create an API key",
            description = "Returns the plaintext key exactly once, addressed in the response body.")
    public ResponseEntity<CreateApiKeyResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateApiKeyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(apiKeyService.create(principal.id(), request.name(), request.expiresInDays()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke an API key",
            description = "Soft-revokes the caller's key. Unknown ids and other users' keys return 404.")
    public void revoke(@AuthenticationPrincipal UserPrincipal principal, @PathVariable long id) {
        apiKeyService.revoke(principal.id(), id);
    }
}