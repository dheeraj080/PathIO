package com.pt.pathio.dto;

import com.pt.pathio.validation.ValidUrl;

public record UpdateUrlRequest(@ValidUrl String longUrl) {
}
