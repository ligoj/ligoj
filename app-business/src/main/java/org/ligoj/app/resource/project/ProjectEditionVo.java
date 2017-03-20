package org.ligoj.app.resource.project;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

import org.hibernate.validator.constraints.NotBlank;

import org.ligoj.bootstrap.core.DescribedAuditedBean;
import org.ligoj.bootstrap.core.validation.LowerCase;
import org.ligoj.app.api.SimpleUser;
import org.ligoj.app.api.UserLdap;

import lombok.Getter;
import lombok.Setter;

/**
 * A fully described project.
 */
@Getter
@Setter
public class ProjectEditionVo extends DescribedAuditedBean<UserLdap, Integer> {

	/**
	 * Unique technical and yet readable name.
	 */
	@NotNull
	@NotBlank
	@LowerCase
	@Size(max = 100)
	@Pattern(regexp = "^([a-z]|[0-9]+-?[a-z])[a-z0-9\\-]*$")
	private String pkey;

	/**
	 * UID of team leader.
	 */
	@NotNull
	@NotBlank
	@LowerCase
	@Size(max = 100)
	@Pattern(regexp = SimpleUser.USER_PATTERN_WRAPPER)
	private String teamLeader;

}
