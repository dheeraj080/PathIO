package com.pt.pathio.dto;

import java.time.LocalDate;

public record ClickHistoryPoint(LocalDate date, long clicks) {
}
