package org.ligoj.app.model;

import javax.persistence.Entity;
import javax.persistence.Table;
import javax.persistence.UniqueConstraint;

import org.ligoj.bootstrap.core.model.AbstractAudited;

import lombok.Getter;
import lombok.Setter;

/**
 * Data model representing a plug-in and its state. The key corresponds to the feature key. A plug-in may includes
 * several services or features.
 */
@Getter
@Setter
@Entity
@Table(name = "LIGOJ_PLUGIN", uniqueConstraints = @UniqueConstraint(columnNames = "key"))
public class Plugin extends AbstractAudited<Integer> {

	/**
	 * SID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * Version of the currently installed plug-in.
	 */
	private String version;

	/**
	 * The feature key.
	 */
	private String key;
}
