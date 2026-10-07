package com.pt.pathio.dto;

import com.pt.pathio.validation.ValidUrl;

public record ShortenUrlRequest(@ValidUrl String longUrl) {
}