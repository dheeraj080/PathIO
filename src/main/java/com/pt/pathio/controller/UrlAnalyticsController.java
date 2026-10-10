package com.pt.pathio.controller;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.dto.AnalyticsOverviewResponse;
import com.pt.pathio.dto.ClickBreakdownResponse;
import com.pt.pathio.dto.ClickHistoryPoint;
import com.pt.pathio.dto.UrlAnalyticsResponse;
import com.pt.pathio.service.UrlAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
        requirePrincipal(principal);
        return ResponseEntity.ok(analyticsService.getUrlAnalytics(shortCode, principal.id()));
    }

    @GetMapping("/urls/{shortCode}/history")
    public ResponseEntity<List<ClickHistoryPoint>> getClickHistory(
            @PathVariable String shortCode,
            @RequestParam(defaultValue = "30") int days,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requirePrincipal(principal);
        return ResponseEntity.ok(analyticsService.getClickHistory(shortCode, principal.id(), days));
    }

    @GetMapping("/urls/{shortCode}/breakdown")
    public ResponseEntity<ClickBreakdownResponse> getClickBreakdown(
            @PathVariable String shortCode,
            @RequestParam(defaultValue = "30") int days,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requirePrincipal(principal);
        return ResponseEntity.ok(analyticsService.getClickBreakdown(shortCode, principal.id(), days));
    }

    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requirePrincipal(principal);
        return ResponseEntity.ok(analyticsService.getOverview(principal.id()));
    }

    private void requirePrincipal(UserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Full authentication is required to access this resource");
        }
    }
}
