package org.ligoj.app.resource.node;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import javax.transaction.Transactional;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.NotFoundException;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import org.ligoj.bootstrap.core.json.PaginationJson;
import org.ligoj.bootstrap.core.json.TableItem;
import org.ligoj.bootstrap.core.json.datatable.DataTableAttributes;
import org.ligoj.bootstrap.core.security.SecurityHelper;
import org.ligoj.app.dao.DelegateNodeRepository;
import org.ligoj.app.model.DelegateNode;

/**
 * Node delegation resource.
 */
@Path("/node/delegate")
@Service
@Produces(MediaType.APPLICATION_JSON)
@Transactional
public class DelegateNodeResource {

	@Autowired
	private SecurityHelper securityHelper;

	@Autowired
	private DelegateNodeRepository repository;

	@Autowired
	private PaginationJson paginationJson;

	/**
	 * Ordered columns.
	 */
	private static final Map<String, String> ORDERED_COLUMNS = new HashMap<>();
	static {
		ORDERED_COLUMNS.put("id", "id");
		ORDERED_COLUMNS.put("name", "name");
		ORDERED_COLUMNS.put("receiver", "receiver");
		ORDERED_COLUMNS.put("receiverType", "receiverType");
		ORDERED_COLUMNS.put("canAdmin", "canAdmin");
		ORDERED_COLUMNS.put("canWrite", "canWrite");
		ORDERED_COLUMNS.put("canSubscribe", "canSubscribe");
	}

	/**
	 * Retrieve all elements with pagination
	 * 
	 * @param uriInfo
	 *            pagination data.
	 * @param criteria
	 *            Optional text to match.
	 * @return all elements with pagination.
	 */
	@GET
	public TableItem<DelegateNode> findAll(@Context final UriInfo uriInfo,
			@QueryParam(DataTableAttributes.SEARCH) final String criteria) {
		final PageRequest pageRequest = paginationJson.getPageRequest(uriInfo, ORDERED_COLUMNS);
		final Page<DelegateNode> findAll = repository.findAll(securityHelper.getLogin(), StringUtils.trimToNull(criteria), pageRequest);

		// apply pagination and prevent lazy initialization issue
		return paginationJson.applyPagination(uriInfo, findAll, Function.identity());
	}

	/**
	 * Create a delegate. Rules are :
	 * <ul>
	 * <li>Related node must be managed by the current user, directly or via a another parent delegate.</li>
	 * <li>'write' flag cannot be <code>true</code> without already owning an applicable delegate with this flag.</li>
	 * <li>At least one delegate with 'admin' flag must be present for the current user and the related node.</li>
	 * </ul>
	 * .
	 * Target user is not checked.
	 * 
	 * @param vo
	 *            the object to create.
	 * @return the entity's identifier.
	 */
	@POST
	public int create(final DelegateNode vo) {
		return validateSaveOrUpdate(vo).getId();
	}

	/**
	 * Validate the user changes regarding the current user's right.
	 * Rules, order is important :
	 * <ul>
	 * <li>Related node must be managed by the current user, directly or via a another parent delegate or act as if the
	 * company does not exist.</li>
	 * <li>'write' flag cannot be <code>true</code> without already owning an applicable delegate with this flag.</li>
	 * <li>'admin' flag cannot be <code>true</code> without already owning an applicable delegate with this flag.</li>
	 * </ul>
	 * Target user is not checked.
	 * 
	 * @return Created delegate.
	 */
	private DelegateNode validateSaveOrUpdate(final DelegateNode entity) {
		// Get all delegates of current user
		final String node = entity.getName();

		// Check there is at least one delegate for this user allowing him to update/create this delegate
		if (repository.manageNode(securityHelper.getLogin(), node, entity.isCanWrite()) == 0) {
			throw new NotFoundException();
		}

		return repository.saveAndFlush(entity);
	}

	/**
	 * Create a delegate. Rules are :
	 * <ul>
	 * <li>Related node must be managed by the current user, directly or via a another parent delegate.</li>
	 * <li>'write' flag cannot be <code>true</code> without already owning an applicable delegate with this flag.</li>
	 * <li>'admin' flag cannot be <code>true</code> without already owning an applicable delegate with this flag.</li>
	 * </ul>
	 * Target user is not checked.
	 * 
	 * @param vo
	 *            the object to create.
	 */
	@PUT
	public void update(final DelegateNode vo) {
		validateSaveOrUpdate(vo);
	}

	/**
	 * Delete entity. Rules, order is important :
	 * <ul>
	 * <li>Related delegate must exist</li>
	 * <li>Related delegate must be managed by the current user with 'admin' right, directly or via a another parent or
	 * act as if the delegate does not exist.</li>
	 * </ul>
	 * 
	 * @param id
	 *            the entity identifier.
	 */
	@DELETE
	@Path("{id:\\d+}")
	public void delete(@PathParam("id") final int id) {
		// Perform the deletion and check the result
		if (repository.delete(id, securityHelper.getLogin()) == 0) {
			throw new NotFoundException();
		}
	}
}
