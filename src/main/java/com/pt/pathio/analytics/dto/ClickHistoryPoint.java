package com.pt.pathio.analytics.dto;

import java.time.LocalDate;

public record ClickHistoryPoint(LocalDate date, long clicks) {
}
