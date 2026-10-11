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

    /** Owning URL row (immutable primary key), binding analytics to the URL, not the reusable alias (DB-01). */
    @Column(name = "url_id", nullable = false)
    private Long urlId;

    @Column(nullable = false)
    private long clicks;
}
