package com.pt.pathio.dto;

import java.util.List;

/**
 * Referrer and device (mobile/desktop/bot) click breakdown for a single short link.
 */
public record ClickBreakdownResponse(
        List<DimensionCount> referrers,
        List<DimensionCount> devices
) {
    public record DimensionCount(String value, long clicks) {
    }
}
