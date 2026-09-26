package com.pt.pathio.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ShortenUrlResponse {

    private String shortUrl;
    private String longUrl;
}
