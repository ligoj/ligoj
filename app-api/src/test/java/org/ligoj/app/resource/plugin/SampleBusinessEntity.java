/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.ligoj.bootstrap.core.model.AbstractBusinessEntity;

/**
 * Sample entity extending {@link AbstractBusinessEntity}
 */
@Entity
@Table(name = "SAMPLE_BUSINESS_ENTITY")
@Getter
@Setter
public class SampleBusinessEntity extends AbstractBusinessEntity<String> {

	// No extension
}
