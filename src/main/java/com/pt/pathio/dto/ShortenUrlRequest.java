package com.pt.pathio.dto;


import com.pt.pathio.validation.ValidUrl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
public class ShortenUrlRequest {

    @NotBlank(message = "URL cannot be empty.")
    @Size(max = 2048, message = "URL exceeds max Length of 2048 characters")
    @ValidUrl
    private String longUrl;

}
