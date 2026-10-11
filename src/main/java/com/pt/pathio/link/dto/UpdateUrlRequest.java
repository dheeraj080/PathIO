package com.pt.pathio.link.dto;

import com.pt.pathio.link.validation.ValidUrl;

public record UpdateUrlRequest(@ValidUrl String longUrl) {
}
