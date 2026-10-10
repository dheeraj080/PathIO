package com.pt.pathio.controller;

import com.pt.pathio.dto.UserUrlResponse;
import com.pt.pathio.service.UrlShortenerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only link management. Path is protected by the existing
 * {@code /api/admin/** -> hasRole("ADMIN")} rule in SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin/urls")
@RequiredArgsConstructor
public class AdminUrlController {

    private final UrlShortenerService urlShortenerService;

    @GetMapping
    public ResponseEntity<Page<UserUrlResponse>> listAllUrls(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(urlShortenerService.getAllUrls(pageable));
    }

    @DeleteMapping("/{shortCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUrl(@PathVariable String shortCode) {
        urlShortenerService.adminDeleteUrl(shortCode);
    }
}
