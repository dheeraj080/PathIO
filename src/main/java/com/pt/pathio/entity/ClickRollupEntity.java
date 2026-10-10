package com.pt.pathio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "click_rollup")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClickRollupEntity {

    @EmbeddedId
    private ClickRollupId id;

    @Column(nullable = false)
    private long clicks;
}
