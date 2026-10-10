package com.pt.pathio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "click_breakdown")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClickBreakdownEntity {

    @EmbeddedId
    private ClickBreakdownId id;

    @Column(nullable = false)
    private long clicks;
}
