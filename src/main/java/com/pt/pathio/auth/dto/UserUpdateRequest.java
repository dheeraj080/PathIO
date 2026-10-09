package com.pt.pathio.auth.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequest {
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @Size(max = 2048, message = "Image URL must not exceed 2048 characters")
    private String image;
}
