package org.ligoj.app.resource.project;

import javax.persistence.Column;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

import org.hibernate.validator.constraints.NotBlank;
import org.ligoj.app.api.SimpleUserLdap;
import org.ligoj.bootstrap.core.DescribedAuditedBean;
import org.ligoj.bootstrap.core.validation.LowerCase;

import lombok.Getter;
import lombok.Setter;

/**
 * Project description base.
 */
@Getter
@Setter
public class BasicProjectVo extends DescribedAuditedBean<SimpleUserLdap, Integer> {

	/**
	 * team leader
	 */
	@NotNull
	private SimpleUserLdap teamLeader;

	/**
	 * Unique technical and yet readable name.
	 */
	@NotNull
	@NotBlank
	@Column(updatable = false)
	@LowerCase
	@Size(max = 100)
	@Pattern(regexp = "^[a-z0-9\\-]+$")
	private String pkey;

}
