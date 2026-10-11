package com.pt.pathio.link.dto;

import com.pt.pathio.link.validation.ValidUrl;

public record ShortenUrlRequest(@ValidUrl String longUrl, String customAlias) {

    public ShortenUrlRequest(String longUrl) {
        this(longUrl, null);
    }
}
