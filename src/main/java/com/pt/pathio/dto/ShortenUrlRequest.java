package com.pt.pathio.dto;

import com.pt.pathio.validation.ValidUrl;

public record ShortenUrlRequest(@ValidUrl String longUrl, String customAlias) {

    public ShortenUrlRequest(String longUrl) {
        this(longUrl, null);
    }
}
