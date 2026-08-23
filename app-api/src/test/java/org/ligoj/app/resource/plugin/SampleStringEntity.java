/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.ligoj.bootstrap.core.model.AbstractStringKeyEntity;

/**
 * Sample entity extending {@link AbstractStringKeyEntity}
 */
@Entity
@Table(name = "SAMPLE_STRING_ENTITY")
@Getter
@Setter
public class SampleStringEntity extends AbstractStringKeyEntity {

	// No extension
}
