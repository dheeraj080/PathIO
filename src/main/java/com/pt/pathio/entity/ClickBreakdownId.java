package com.pt.pathio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDate;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ClickBreakdownId implements Serializable {

    @Column(name = "click_date", nullable = false)
    private LocalDate clickDate;

    @Column(name = "short_code", nullable = false, length = 32)
    private String shortCode;

    @Column(name = "dimension", nullable = false, length = 16)
    private String dimension;

    @Column(name = "dimension_value", nullable = false, length = 255)
    private String dimensionValue;
}
