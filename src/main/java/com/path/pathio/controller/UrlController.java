package com.path.pathio.controller;


import com.path.pathio.dto.UrlDtos;
import com.path.pathio.entity.UrlMapping;
import com.path.pathio.gateway.CloudflareSyncService;
import com.path.pathio.service.UrlService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/urls")
public class UrlController {

    private final UrlService urlService;
    private final CloudflareSyncService cloudflareSyncService;
    private final String baseUrl;

    public UrlController(
            UrlService urlService,
            CloudflareSyncService cloudflareSyncService,
            @Value("${app.base-url:http://localhost:8080}") String baseUrl) {
        this.urlService = urlService;
        this.cloudflareSyncService = cloudflareSyncService;
        this.baseUrl = baseUrl;
    }

    /**
     * WRITE PATH: Create Short URL
     * Protected by the edge rate limiter (10 req/min per IP)
     */
    @PostMapping("/shorten")
    public ResponseEntity<UrlDtos.ShortenResponse> shortenUrl(@Valid @RequestBody UrlDtos.ShortenRequest request) {

        UrlMapping mapping = urlService.shortenUrl(
                request.originalUrl(),
                request.userId(),
                request.expiresAt()
        );

        // Optional: If you want to keep Cloudflare Edge KV synchronized on create
        // cloudflareSyncService.syncToEdgeKv(mapping.getShortCode(), mapping.getOriginalUrl());

        String shortUrl = baseUrl + "/" + mapping.getShortCode();

        UrlDtos.ShortenResponse response = new UrlDtos.ShortenResponse(
                mapping.getShortCode(),
                shortUrl,
                mapping.getOriginalUrl(),
                mapping.getCreatedAt(),
                mapping.getExpiresAt()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
