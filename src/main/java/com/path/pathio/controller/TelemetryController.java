package com.path.pathio.controller;

import com.path.pathio.analytics.AnalyticsProducer;
import com.path.pathio.analytics.ClickEvent;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/telemetry")
public class TelemetryController {

    private final AnalyticsProducer analyticsProducer;
    private final String edgeSecretToken;

    public TelemetryController(
            AnalyticsProducer analyticsProducer,
            @Value("${cloudflare.edge-secret-token}") String edgeSecretToken) {
        this.analyticsProducer = analyticsProducer;
        this.edgeSecretToken = edgeSecretToken;
    }

    @PostMapping
    public ResponseEntity<Void> ingestClickEvent(
            @RequestBody ClickEventPayload payload,
            @RequestHeader(value = "X-Edge-Auth-Token", required = false) String authToken,
            HttpServletRequest request) {

        // 1. Verify Edge Shared Secret to block unauthorized spoofed analytics requests
        if (authToken == null || !authToken.equals(edgeSecretToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2. Validate payload structure
        if (payload.shortCode() == null || payload.shortCode().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        // 3. Construct domain ClickEvent object
        ClickEvent event = new ClickEvent(
                payload.shortCode(),
                payload.ipHash() != null ? payload.ipHash() : "UNKNOWN",
                payload.userAgent() != null ? payload.userAgent() : "",
                payload.referer() != null ? payload.referer() : "",
                payload.timestamp() > 0 ? Instant.ofEpochMilli(payload.timestamp()) : Instant.now()
        );

        // 4. Push to Redis Stream asynchronously
        try {
            analyticsProducer.publishEvent(event);
            return ResponseEntity.accepted().build(); // 202 Accepted (fire-and-forget pattern)
        } catch (Exception e) {
            // Log error internally, but return 202 or 500 depending on resilience requirements.
            // For analytics, failing silently or returning 202 prevents edge worker disruption.
            return ResponseEntity.status(HttpStatus.ACCEPTED).build();
        }
    }

    // JSON Payload Record matching Cloudflare Worker request structure
    public record ClickEventPayload(
            String shortCode,
            String ipHash,
            String userAgent,
            String referer,
            long timestamp
    ) {
    }
}
