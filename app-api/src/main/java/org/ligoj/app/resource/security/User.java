/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.security;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

import org.hibernate.validator.constraints.Length;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * User.
 */
@Getter
@Setter
@EqualsAndHashCode(of = "name")
@NoArgsConstructor
@AllArgsConstructor
public class User {

	@NotBlank
	@NotNull
	private String name;

	@NotBlank
	@NotNull
	@Length(max = 250)
	private String password;

}
