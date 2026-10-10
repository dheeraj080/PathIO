package com.pt.pathio.controller;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.dto.UpdateUrlRequest;
import com.pt.pathio.dto.UserUrlResponse;
import com.pt.pathio.service.UrlShortenerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UrlController {

    private final UrlShortenerService urlShortenerService;

    @PostMapping("/v1/shorten")
    public ResponseEntity<ShortenUrlResponse> shortenUrl(@Valid @RequestBody ShortenUrlRequest request) {
        ShortenUrlResponse response = urlShortenerService.shortenUrl(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/v1/urls/me")
    public ResponseEntity<Page<UserUrlResponse>> getMyUrls(
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(urlShortenerService.getUserUrls(principal.id(), pageable));
    }

    @GetMapping("/v1/{shortCode}")
    public ResponseEntity<Void> redirectToOriginalUrl(@PathVariable String shortCode, HttpServletRequest request) {
        String longUrl = urlShortenerService.getOriginalUrl(
                shortCode,
                extractClientIp(request),
                request.getHeader("User-Agent"),
                request.getHeader("Referer"));
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(longUrl))
                .build();
    }

    private static String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @PutMapping("/v1/urls/{shortCode}")
    public ResponseEntity<UserUrlResponse> updateUrl(
            @PathVariable String shortCode,
            @Valid @RequestBody UpdateUrlRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requirePrincipal(principal);
        return ResponseEntity.ok(urlShortenerService.updateUrl(shortCode, principal.id(), request));
    }

    @DeleteMapping("/v1/urls/{shortCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUrl(
            @PathVariable String shortCode,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requirePrincipal(principal);
        urlShortenerService.deleteUrl(shortCode, principal.id());
    }

    private void requirePrincipal(UserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Full authentication is required to access this resource");
        }
    }
}
