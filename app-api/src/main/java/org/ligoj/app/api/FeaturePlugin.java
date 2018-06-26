/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.api;

/**
 * A plug-in. The plug-in behavior is massively based on naming convention. The
 * key of the plug-in must be unique and following the bellow rules :
 * <ul>
 * <li>Must follows this pattern <code>[a-z\d]+(:[a-z\d]+)*</code></li>
 * <li>Must be unique</li>
 * </ul>
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
public interface FeaturePlugin extends org.ligoj.bootstrap.core.plugin.FeaturePlugin {

	// All extended
}
