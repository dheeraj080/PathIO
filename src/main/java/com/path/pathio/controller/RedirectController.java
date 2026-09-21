package com.path.pathio.controller;

import com.path.pathio.analytics.AnalyticsProducer;
import com.path.pathio.analytics.ClickEvent;
import com.path.pathio.service.UrlService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

@RestController
public class RedirectController {

    private final UrlService urlService;
    private final AnalyticsProducer analyticsProducer;

    public RedirectController(UrlService urlService, AnalyticsProducer analyticsProducer) {
        this.urlService = urlService;
        this.analyticsProducer = analyticsProducer;
    }

    @GetMapping("/{shortCode:[a-zA-Z0-9]{1,10}}")
    public ResponseEntity<Void> handleRedirect(
            @PathVariable String shortCode,
            HttpServletRequest request) {

        // 1. Synchronous Cache-First Lookup (< 2ms)
        Optional<String> targetUrlOpt = urlService.getOriginalUrl(shortCode);

        if (targetUrlOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // 2. Capture metadata for async telemetry processing
        String remoteAddr = request.getRemoteAddr();
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        String referer = request.getHeader(HttpHeaders.REFERER);

        // 3. Dispatch Async Telemetry Event (Non-blocking Fire-and-Forget)
        Thread.ofVirtual().start(() -> {
            String ipHash = hashIpAddress(remoteAddr);
            ClickEvent event = new ClickEvent(shortCode, ipHash, userAgent, referer, Instant.now());
            analyticsProducer.publishEvent(event);
        });

        // 4. Return HTTP 302 Found immediately
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(targetUrlOpt.get()))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=900") // 15-min browser cache to reduce repetitive hits
                .build();
    }

    private String hashIpAddress(String ip) {
        if (ip == null) return "UNKNOWN";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(ip.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 16); // 16-char truncated hash for privacy compliance
        } catch (Exception e) {
            return "HASH_ERROR";
        }
    }
}
