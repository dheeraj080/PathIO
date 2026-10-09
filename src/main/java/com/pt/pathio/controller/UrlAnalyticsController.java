package com.pt.pathio.controller;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.dto.AnalyticsOverviewResponse;
import com.pt.pathio.dto.UrlAnalyticsResponse;
import com.pt.pathio.service.UrlAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class UrlAnalyticsController {

    private final UrlAnalyticsService analyticsService;

    @GetMapping("/urls/{shortCode}")
    public ResponseEntity<UrlAnalyticsResponse> getUrlAnalytics(
            @PathVariable String shortCode,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(analyticsService.getUrlAnalytics(shortCode, principal.id()));
    }

    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(analyticsService.getOverview(principal.id()));
    }
}
