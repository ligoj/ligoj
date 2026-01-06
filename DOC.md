# Architecture

![architecture](docs/assets/img/architecture.png)

# Key features
The backend container assumes the business role of the application, is stateless, scalable and based on intensive convention over configuration design.

## Relevant stack parts
* Java9
* Spring 5 baseline : -core, -security and -data
* CXF, not Spring-WS
* JPA 2

# Philosophy
The main ideas are Convention over Configuration and modularity. 

## Convention over Configuration
There is a default behaviour based on the convention, but it's always possible to override it.

## REST Endpoint
By convention, the [status code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) is determined for you (200, 204, 400, ...) and follow the best practices.
## Exception handling
You could never use "try catch" statements in your application. Let the error reaching the filters that will generate the status code and REST payload for you. More details there [[Exception handling]].

## Validation handling
Implicit validation management is proceed before the REST controller is actually called. Properties mapping, types, and BVAL constraints are managed for you. This avoids a lot of useless code and tests. More details there [[Jackson Ext]] and [[CXF Ext]].

## Entity equals/hashcode
No `equals` or `hashcode` are required. The design above Spring-Data implies these methods are not required to build a consistant cache for Hibernate.

## getter/setter
Thanks to [Lombok](http://projectlombok.org/), dont't write anymore `getX` and `setX`.

## Basic ORM operations
Thanks to [Spring Data](https://projects.spring.io/spring-data-jpa/), basic operations such as `findAll` or `findOne` are available at zero cost. In addition, some operations have been added (`findAllBy`, `findOneExpected`, ...), see [[Spring-Data Ext]]

## Database mapping
JPA to DDL generation is backed by Hibernate. We have added conventional `ManyToOne` column naming ensuring the proper compatibility with constraints (`@Unique`,...), case (in)sensitive databases and exception handling. More details there [[Hibernate Ext]].

## Security over REST
With REST, comes some conventional meaning of `GET`, `POST`,... methods. The integrated RBAC security layer make easy dynamical security configuration.

## Modularity
Split your code to make micro-services grid. Instead of having a global configuration file (XML, YML,...), a centralized Spring-Boot java configuration, or some useless code to write to register your features.

## Cache
With Hazelcast, even with [Spring-Boot](https://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-hazelcast.html) you cannot easily split your `CacheConfig`. We have built a merged configuration that collects the available `CacheConfig` to register them for to the `HazelcastInstance`. More details there [[Hibernate Ext]].

## JPA
JPA specification requires that your `orm.xml` comes along your entities, even with `package` auto-discovery classes. But in a modular application, it's not possible to anticipate the entities you'll get in the classpath. More details there [[Hibernate Ext]].

# Features

## Editing Data pivot (CSV)

```java
@Autowired
private CsvForJpa csvForJpa;
...
csvForJpa.insert("csv", Entity.class);
```
See `CsvForJpa.java`

### Description
Maintaining data for the tests may be a pain. The actual solutions are:
* external data stored as a dump: hard to update, to manipulate data and to handle the generated identifier
* fully coded in the tests with some `em.persist(..)` in the JUnit: the more data, the more amount of code, no global view of the data. On the other side, you gain a strongly typed dataset. 

In addition of these solution, come the CSV format:
* CSV is common, compact (more than JSON), and easy to handle: filtering, ordering, etc. with you favorite Excel like editor
* Mostly all database editors support import or export in CSV format
* CSV parsing and generation are fast and simple and do not involve very much libraries

The CSV format is not mandatory for your data, there is a built-in integration. 

### Sample
Test classe
```java
public class MyTest {
  @Autowired
  private CsvForJpa csvForJpa;
  public @Test void test() {
    csvForJpa.insert("csv", PublicProfile.class, Person.class);
    // Data is now in my base
  }
}
```
Entities
```java
public @Entity @Getter @Setter class PublicProfile {
  private @Id String id;
  private Date since;
}
public @Entity @Getter @Setter class Person extends AbstractPersistable<Integer> {
  private String firstName;
  private String lastName;
  private Integer age;
  private @ManyToOne PublicProfile profile;
}
```

CSV files `public-profile.csv`, `publicprofile.csv ` are accepted
```csv
jdoe;2018-04-01
jdoe2;12/08/2012
henry;2018-01-04T09:23:45.017+01:00
alpha
```
`person.csv`
```csv
John;Doe;21;jdoe
Jane;Doe;21;jdoe2
Marc;;23
Henry;;henry
```

This will read the file `csv/person.csv` and will persist one entry per row in `MyEntity` JPA entity. Then will do the same for `csv/public-profile.csv`.

### More complexe usage
Many options are available: separator, encoding and headers.

As a CSV file contains only data of one entity, it could be difficult to handle the relation between two entities. In the previous sample, the relationship was conventional with `id` property, and the order was following the filds declaration order. For a more complexe usage, header must be explicitly defined

Entities
```java
public @Entity @Getter @Setter class PublicProfile AbstractPersistable<Integer> {
  private String displayName;
}
public @Entity @Getter @Setter class PrivateProfile {
  private @Id String login;
  private String mail;
}
public @Entity @Getter @Setter class Person extends AbstractPersistable<Integer> {
  private String firstName;
  private String lastName;
  private Integer age;
  private @ManyToOne PrivateProfile publicProfile;
  private @ManyToOne PublicProfile privateProfile;
  private @ManyToOne PublicProfile friendProfile;
}
```

CSV files `public-profile.csv`
```csv
displayName
jdoe
jdoe2
```
`private-profile.csv`
```csv
login;mail
login1;john.doe@sample.com
login2;jane.doe@other.com
```
`person.csv`
```csv
firstName;lastName;age;publicProfile.displayName;privateProfile.mail;friendProfile.id!
John;Doe;21;jdoe;john.doe@sample.com;1
Jane;Doe;21;jdoe2;jane.doe@other.com;2
```

### Code sheets
* Order matters: 
  * Inside the CSV, a row can reference itself and or a previous one
  * Since an entity can refer to another one, the `class` parameters must follow this relationship
* Date formats: `yyyy-MM-dd'T'HH:mm:ssZ`, `yyyy-MM-dd'T'HH:mm:ss.SSSXXX`, `yyyy/MM/dd`, `dd/MM/yyyy` and optional `HH:mm`, `HH:mm:ss` and `/` or `-` separator variants.
* Header format: `jpaProperty(.joinProperty)?!?`
  * `jpaProperty`: Raw value, date, enumeration value (case insensitive),...
  * `jpaProperty.joinProperty`: Join property. Implies a `SELECT * FROM JoinEntity WHERE joinProperty = :value`
  * `jpaProperty.generatedId!`: Join to a generated `@Id` property/ Implies a `SELECT * FROM JoinEntity` and then select the n-th raw. These way, you can join the table by its generated incremented identifier.
* `CsvForJpa#insert(..)` insert the entries without deleting the previous ones.
* `CsvForJpa#reset(..)` will delete all previous JPA entries in the reversed `classes` order, and then will insert the JPA entries from the CSV.
* `CsvForJpa#cleanup(..)` will delete all previous JPA entries in the reversed `classes` order.
* `CsvForJpa#toJpa(..)` will only return the corresponding JPA entries.

## Security


This topic is talking about [O]RBAC mechanism implemented in this application. This is the far most complex feature.

The ordered implied security levels:
* Authentication check be on of the enabled authentication providers
* [URL access granted by static configuration](#url-access-granted-by-static-configuration)
* [URL access granted by RBAC](#url-access-granted-by-rbac)
* [Resource access](#resource-access) granted by ORBAC
* Organization Role Based Access Control are related to identity plugins derived from [ligoj/plugin-id](ligoj/plugin-id). These plug-ins map user from a repository like LDAP to groups and permissions.

All work with a `deny all` by default.

### Vocabulary

Many terms are used in this documentations and the definitions will make the lighter further explanations: 
* User: a user defined in the IAM system
* Principal: The current authenticated user.
* Credentials: A set a information proving the identity of the principal.
* Role: Simple logical name aggregating authorizations. Unauthenticated users have the `ROLE_ANONYMOUS` role
* Role Assignment: A role associated to a user. A user can have any amount of role. The role `USER` (even if it is not defined) is granted to any authenticated user.
* System Administrator: A principal user having an `api` authorization with the `.*` pattern.
* Group: A set of users of users. A group can be within another groups. A user can be member of any number of groups. Note that a group may not be empty depending on the underlining IAM provider, but a virtual and invisible user may be kept for empty groups.
* Company: A set of users. A company can be within another a single company. A user is member of exactly one company.
* Container: Company or group.
* Node: A service, tool or tool instance, see the Subscription documentation.
* Tree: An abstract hierarchical path. (to-do) A bit difficult to explain for now...
* Resource: Container, user, node or a tree.
* Delegate: Is a read permission given to a receiver for a container.
  * A receiver can be any resource. The delegate receiver's type is either "USER", "GROUP" or "COMPANY".
  * There is a "write" flag allowing to write in this container.
  * There is also a "admin" flag allowing to the receiver to share this delegate to another visible resource.
* Project: A team owning a set of subscriptions, see the Subscription documentation
* Project leader: The main contact of the project, and default manager of the project

### Authorization

An access to URLs and having the following properties:
* method:  `GET`, `POST`, `PUT`, `DELETE` or _ `null`_ for all of them. Defined the HTTP method enabling this authorization.
* pattern: Regular expression of the URL to match:
  * `.*`: any URL
  * `^rest/.*`: any REST URL
  * `^rest/my-resource/\d+`: access to `my-resource` by their identifier only.
* type: 
  * `ui`: This authorization is based on the fragment part of the URL
  * `api`: The URL corresponds to a REST access. The matched URL starts with the path without the context and includes the query parameters.

### How it works ?

The authentication is first implied. The built-in authentication feature is based on `x-api-key` and `x-api-user` headers or parameters.
When both are provided, they are checked. When only `x-api-user` or `x-api-key` is provided, they are ignored.


The `api` authorization is checked at server side for each REST access, and is partially used at browser side.  

The `ui` authorization is based on the fragment part of the URL, so only checked by the browser. This is not really a security, and is only relevant to disable, hide or remove the UI component the principal should not see. You may notice this kind of authorization could be overridden by the user at the browser side. As base practices, this kind of authorization **must** be associated to a corresponding `api` authorization.

The `ui` security can be avoided by the user when he/she requests separately each JavaScript/CSS/HTML,... static resources, but the data are guarded by the `api` authorizations.

### At browser side

When the user profile is loaded, the authorizations (`ui` and `api`) are checked in the current DOM for the first load and then continuously when it is updated.  
The watched components are :
- The current browser's URL itself: the `location`, visible in the navigation URL. When it is unauthorized, a security message is displayed, and the content is not loaded.
- The HTML components having `href` attribute
- The HTML components having `data-secured-service`, `data-secured-role` or `data-secured-method` attribute. See [data-secured-*](#data-secured-*)

The matched URL starts after the `#/` fragment part. Samples:
    * `^system/bench`: Browser URL `#/system/bench`
    * `^system/.*`: Browser URL `#/system`

When a HTML component is unauthorized, by default its removed from the DOM. It is possible to control this behavior with `data-security-on-forbidden="disable"` attribute value. 

When a HTML component contains only unauthorized components (buttons group, dropdown,...), it is also removed from the DOM. This process is recursively applied.

### `data-secured-*`

The `data-secured-*` attributes value corresponds to the related `api` usage the component depends on. For sample, having a chart displaying data collected from a REST URL should be displayed only when the REST service is authorized. Without this `data-secured-service`, the chart is displayed but with an empty content: still secured, but not really friendly.

#### Samples
```
<svg class="my-chart-displaying-secured-data"></svg>
```
SVG component is always displayed, even when the D3 ajax fails.

```
<svg class="my-chart-displaying-secured-data" data-secured-service="rest/financial/y2y"></svg>
```
SVG component is only displayed when `api` URL `rest/financial/y2y` is allowed.

```
<svg class="my-chart-displaying-secured-data" data-secured-role="FINANCE"></svg>
```
SVG component is only displayed when the principal as the role "FINANCE". This role can either be a static Spring-Security role, either an assigned role.

```
<svg class="my-chart-displaying-secured-data" data-secured-service="rest/financial/y2y" data-secured-method="GET"></svg>
```
SVG component is only displayed when `api` URL `rest/financial/y2y` is allowed with the `GET` method.

### At server side

This the must simple control: each HTTP request to `api` endpoint is checked by this guard. The access is authorized when there is at least one couple {URL pattern, HTTP method} matching the HTTP request URL.

The matched URL starts after the context path, without the leading `/`, and includes the query part. Samples:
  * `.*`: any URL, `/rest`, `/manage` (actuator), ... all endpoints
  * `^rest/.*`: any REST URL. Not actuator endpoint.
  * `^rest/my-resource/\d+`: access to `my-resource` by their identifier only.

Unauthorized access gets a `401` response.

### Cache

For this real time URL access, the system uses caches. Therefore, if you want to update theses authorizations directly in the database, without using REST services, to need invalidate `authorizations` cache there [/#/system/cache](http://localhost:8080/ligoj/#/system/cache)


### URL access granted by static configuration

Static security based Spring-Security, and defining a simple Role Based Access Control. Pattern based URL are statics and cannot be easily changed at runtime. This security is the first firewall. Can only be updated by creating your own spring-security XML or Spring-Boot Java configuration.

The security design is based on the `app-ui` container that decides whereas a request is forwarded to `app-api` for the next security level. The final authentication and the authorization are always performed by the `app-api` container.

The decision follows this matrix:

| URL               | Session | API Key | [PreAuth](#pre-authenticated-access) | Login | Auth.     | Response | Notes                                           |
| ----------------- | ------- | ------- | ------------------------------------ | ----- | --------- | -------- | ----------------------------------------------- |
| public            | *       | *       | *                                    | *     | *         | `200`    | Whitelisted page                                |
| /rest/*           | Yes     | *       | *                                    | *     | Granted   | `200`    | Authorization is checked by `app-api`           |
| /rest/*           | No      | No      | Not configured                       | *     | Refused   | `401`    | Unauthorized by `app-api`                       |
| /rest/*           | No      | Invalid | Not configured                       | KO    | *         | `403`    | API key refused by `app-api`                    |
| /rest/*           | No      | Valid   | Not configured                       | OK    | Granted   | `200`    | API key and authorization accepted by `app-api` |
| /rest/*           | No      | Valid   | Not configured                       | OK    | Refused   | `200`    | Unauthorized by `app-api`                       |
| /rest/*           | No      | Valid   | Not configured                       | OK    | Refused   | `200`    | Unauthorized by `app-api`                       |
| /login-by-api-key | No      | Valid   | Not configured                       | OK    | Is admin  | `200`    | Only administrators can use this feature        |
| /login-by-api-key | No      | *       | *                                    | OK    | Not admin | `302`    | Redirection to login form or OAuth page.        |
| (other)           | Yes     | *       | *                                    | *     | Granted   | `200`    | Private, not `/rest` Authorized by `app-api`    |
| (other)           | No      | *       | Not configured                       | *     | Refused   | `403`    |                                                 |
| (other)           | No      | *       | Missing                              | *     | *         | `401`    |                                                 |
| (other)           | No      | *       | Invalid                              | KO    | *         | `401`    | Login refused by `app-api`                      |
| (other)           | No      | *       | Valid                                | OK    | Granted   | `200`    | Logged and granted by `app-api`                 |
| (other)           | No      | *       | Valid                                | OK    | Refused   | `403`    | Logged and unauthorized by `app-api`            |

### Pre-authenticated access

A pre-authentication is an authentication performed by a trusted security component between your users and the `app-ui` container. This component forward only trusted request and add specific headers in the forwarded request to the `app-ui` container.
 
The `PreAuth` filter, can be enabled by the arguments `-Dsecurity.pre-auth-principal=${HEADER_PRINCIPAL}` and `-Dsecurity.pre-auth-credentials=${HEADER_CREDENTIAL}` of `app-ui` at launch time only. When these arguments are empty, the `PreAuth` filter is not enabled. When enabled, the corresponding header must be included in the incoming request, otherwise the response will be a `401` error.

You should use the right [plugin-id](https://github.com/ligoj/plugin-id) implementation to get the user details. 

| Property                      | Role                                                                        | Sample                                                |
| ----------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| security.pre-auth-principal   | Request header name containing the identity of the authenticated user       | -Dsecurity.pre-auth-principal=SM_USER                 |
| security.pre-auth-credentials | Request header name containing the token to verify                          | -Dsecurity.pre-auth-credentials=SM_TOKEN              |
| security.pre-auth-logout      | Optional logout relative or absolute URL when user reuests to be logged out | -Dsecurity.pre-auth-logout="https://signin.sample.com |

For AWS Cognito placed on an ALB, use [plugin-id-cognito](https://github.com/ligoj/plugin-id-cognito), and these properties:

| Property                      | Value                   |
| ----------------------------- | ----------------------- |
| security.pre-auth-principal   | X-Amzn-Oidc-Identity    |
| security.pre-auth-credentials | X-Amzn-Oidc-Accesstoken |
| security.pre-auth-logout      | (Cognito subdomain)     |

### URL access granted by RBAC

Dynamic security layer is provided by `AuthorizingFilter`, also a pattern based access control where roles, users and autorisations can be changed at runtime and backed in database. All roles and permissions can be updated at runtime with an immediate apply. You can manage this from [/#/system/role](http://localhost:8080/ligoj/#/system/role) and [/#/system/user](http://localhost:8080/ligoj/#/system/user)

This security levels are only there to segregate kind of users, like administrators and simple users for sample.

This is a RBAC, top-level URL pattern filter. Users are associated to roles, and permissions are associated to roles.

This access is dynamical, configuration is stored in a persistent database.

### Resource access
This security level gives read or write access with propagation (GRANT) option to a resource for another resource. This level can be augmented by a [plugin-id](https://github.com/ligoj/plugin-id) or a IAM provider such as [plugin-iam-node](https://github.com/ligoj/plugin-iam-node).

### Behaviors:
* All delegates are applied at real time.
* System Administrator can always see and manage any resource.
* A receiver gets the permission for all containers inside the associated delegate's container: inheritance.
* A container is visible for a principal if it exists at least one delegate to this principal for this container or its parent container.
* A user is visible for a principal if it exists at least one delegate to this principal for a company this user belongs to.
* A container is visible for a principal if it exists at least one delegate to this principal for this container or its parent container.
* A container can be created inside another container by a principal if it exists at least one delegate to this principal with a write flag for this parent container.
* A user can be created or updated by the principal if it exists at least one delegate to this principal with a write flag for the user's company.
* A user's group can be added or removed by the principal if it exists at least one delegate to this principal with a write flag for this group.
* The member of a specific group (filter) is visible by the principal if it exists at least one delegate to this principal for this group and if the user is visible by this principal.
* The member of a specific company (filter) is visible by the principal if it exists at least one delegate to this principal for this company and if the user is visible by this principal.
* To determinate the set of related delegates of the principal, the match is:
  * Either the receiver is the principal himself. Type is "USER"
  * Either the receiver is a group the principal is member of, directly or not. Type is "GROUP".
  * Either the receiver is a company the principal is member of, directly or not. Type is "COMPANY".
* A project is visible if there is at least one visible group subscribed by this project or, if the principal user is the team leader.

#### Additional security obfuscation:
* An existing resource but not visible for the principal is exactly reported as a non-existing resource
* A visible read-only resource updated by the principal is refused and reported in logs as an attempt

#### Relevant IAM resources:
* GroupResource
* UserOrgResource
* CompanyResource
* AbstractContainerResource

### Login

The enabled login modes is configured only at launch time of the `app-ui` container with `-Dsecurity=${MODE}` argument. The behavior is described in the blow table:

| Mode        | Implementation                                                | Behavior                                                                           |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Trusted`   | `org.ligoj.app.http.security.TrustedAuthenticationProvider`   | Login is always accepted, `app-api` container is not involved. Useful for testing. |
| `Rest`      | `org.ligoj.app.http.security.RestAuthenticationProvider`      | `/rest/security/login` is called.                                                  |
| `OAuth2Bff` | `org.ligoj.app.http.security.OAuth2BffAuthenticationProvider` | Login and logout operations are delegated to external OAuth2 identity provider     |

#### `/login-by-api-key` Provider

In a browser, whatever the provider selected, the URL `http://localhost:8080/ligoj/login-by-api-key?api-key=API_KEY&api-user=API_USER` bypasses the login process and directly grants a session to the user.

The contraints are:
* The `API_USER` is an administrator, must have at least one API permission `.*`. This feature is only available for administrators.
* The provided `API_KEY` is a valid API key for the `API_USER`.
* The feature must be enabled. `ligoj.security.login-by-api-key` is `false` by default

Timeline:
- A special authentication provider is placed before the standard provider and listen the `/login-by-api-key` path. This provider only enabled when `ligoj.security.login-by-api-key` is `true`.
- `API_KEY` and `API_USER` query parameters must be present and not empty. If not, a `400` is returned
- The API `/session` endpoint s called with these crdentials in order to check the credentials and to retrieve the permissions of this user. If the call failed, a `401` is returned
- One of the API user permissions must match `pattern=.*` and `method=DELETE`. If not, a `401 is returned`.
- When succeeded, a stateful session is created in WEB container and a `302 /` is returned.

#### `OAuth2Bff` Provider

Sample configuration file [application.properties](app-ui/src/main/resources/application.properties)

``` ini
# OAuth2 specific overrides
security = OAuth2Bff
ligoj.security.oauth2.username-attribute = email
ligoj.security.login.url = /oauth2/authorization/keycloak
spring.security.oauth2.client.provider.keycloak.issuer-uri = http://localhost:9083/realms/keycloak
spring.security.oauth2.client.registration.keycloak.provider =  keycloak
spring.security.oauth2.client.registration.keycloak.authorization-grant-type = authorization_code
spring.security.oauth2.client.registration.keycloak.client-id = ligoj
spring.security.oauth2.client.registration.keycloak.client-secret = secret
spring.security.oauth2.client.registration.keycloak.scope = openid
```

Corresponding Keycloak configuration::
- Root URL = http://localhost:8080/ligoj/
- Home URL = http://localhost:8080/ligoj/
- Redirect Login URI: http://localhost:8080/ligoj/login/oauth2/code/keycloak
- Redirect Logout URI: http://localhost:8080/ligoj/oauth2/authorization/keycloak?logout


## Configuration

### Code summary
```java
@Autowired
private ConfigurationResource configuration;

configuration.get("my-key");
```
See `ConfigurationResource.java`

### Description
Configuration can be retrieved: 
* From built-in Spring variable resolution: static, and resolved only when the context is started
```java
@Value("$(my-key:default-value"}
private String value;
```
* From `ConfigurationResource`, a persistent database backed and cached configuration
```java
@Autowired
private ConfigurationResource configuration;

configuration.get("my-key", "default-value");
configuration.get("my-key", 42);
configuration.get("my-key");
```

### Failover
Built-in Spring property resolver use the `System.getProperty` then `application.properties`, then the default value.

For `ConfigurationResource`, the sequence is the same with database lookup first.

### Encryption
Both solutions are backed by [Jasypt](http://www.jasypt.org/) to protect secret from configuration files and stored sensitive data in database. 
It is possible to benefit the same security level for other stored data:
```java
@Autowired
private CryptoHelper cryptoHelper;
...
cryptoHelper.encryptAsNeeded(value)
cryptoHelper.encrypt(value)
cryptoHelper.decryptAsNeeded(value)
cryptoHelper.decrypt(value)
```

## Pagination

### Code summary
```java
@Autowired
private PaginationJson paging;

@GET
public TableItem<Project> findAll(@Context UriInfo uriInfo, @QueryParam(DataTableAttributes.SEARCH) String criteria) {
  Page<Project> findAll = repository.find(criteria), paging.getPageRequest(uriInfo, COLUMNS));
  return paging.applyPagination(uriInfo, findAll);
}
```
See `PaginationJson.java`

### Description
Providing a lightweight filtering and pagination feature is the most complex part of UI/API interaction.
There are two filter/pagination mode: managed and unmanaged

### Managed filtering
Sequence
  * The JPA query is executed for you with a generated `Criteria` from the given `UriInfo`
* Building the JPA pagination from the JSON request: `paging.getPageRequest(uriInfo, COLUMNS)`. Where `COLUMNS` corresponds to the allowed mapped properties.
* Building the response: `paging.applyPagination(uriInfo, findAll)` with optional item transformation.

## MVVM

MVVM is managed by [CascadeJS](https://github.com/fabdouglas/cascadejs) with enabled plugins:
* `css`
* `html` backed by [RequireJS Text](https://github.com/requirejs/text)
* `js` backed by [RequireJS](http://requirejs.org/)
* `i18n` backed by [RequireJS i18n](https://github.com/requirejs/i18n) and [HandelbarsJS](https://handlebarsjs.com/)
* `partial` backed by [HandelbarsJS](https://handlebarsjs.com/)

Note: VueJS rewrite is in progress.

# Plugin management

A single jar (archive) containing binaries (Java class files), configuration extensions and static resources.
A plugin can be:
- A service provider, for sample: [plugin-id](https://github.com/ligoj/plugin-id), [plugin-vm](https://github.com/ligoj/plugin-vm).
- A tool, implementing a service, for sample: [plugin-id-ldap](https://github.com/ligoj/plugin-id-ldap), [plugin-vm-aws](https://github.com/ligoj/plugin-aws)
- An embedded node instance or a more specific tool, for sample: [plugin-id-ldap-embedded](https://github.com/ligoj/plugin-id-ldap-embedded), [plugin-vm-azure-csp](https://github.com/ligoj/plugin-vm-azure-csp)
- A feature not based on a node, for sample: [plugin-iam-node](https://github.com/ligoj/plugin-iam-node)

## Dependency Management
The process does not rely on OSGi like process, but is baseed on naming convention.

The plug-ins are added to the application class loader during the startup in the natural string order. This ensure that "plugin-service" is loaded before "plugin-service-tool"
All plug-ins are autowired and instantiated at the same time, but the initial data and exports follow the natural order.
"plugin-service-tool" plugin is implicitly depending on "plugin-service"

This implicity dependency can also be found in the `pom.xml` file. For now, the plugin manager does not use the Maven configuration to direct the loading order or the check during the deployment of a new plugin. So the administraive user must ensure, when the plug-in `plugin-service-tool` is installed, that the `plugin-service-tool` is installed to.

The same logic applies to the update process. Do not update `plugin-service-tool` without doing the same for `plugin-service-tool`. This limitation will be fixed with [#1](https://github.com/ligoj/ligoj/issues/1)

## Creating your own plugin

In the below table, the sample is based on a plug-in being a tool `Slack` implementing the service `Talk`.
All Java classes are in the directory `org/ligoj/app/plugin/${service}/${tool}`, aliased as `$base_java`. So all java packages of this plug-in starts with `org.ligoj.app.plugin.${service}.${tool}`. For our sample, it is: `org.ligoj.app.plugin.talk.slack`. Sub-packages are also allowed.

All Web resources are in the directory `META-INF/resources/webjars/service/${service}/${tool}`, aliased as `${base_web}`. For our sample, it is: `META-INF/resources/webjars/service/talk/slack`.

All entities to be installed on setup are in the directory `csv`.

| Pattern file                        | Sample              | Role                                                                                                                                                               |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ${base_java}/${Tool}Resource.class  | SlackResource.class | Plugin definition                                                                                                                                                  |
| ${base_web}/img/${tool}.png         | img/slack.png       | 16x icon                                                                                                                                                           |
| ${base_web}/img/${tool}x64.png      | img/slack.png       | 64x icon                                                                                                                                                           |
| ${base_web}/img/${tool}x64w.png     | img/slack.png       | 64x white icon                                                                                                                                                     |
| ${base_web}/nls/messages.js         | nls/messages.js     | English i18n messages                                                                                                                                              |
| ${base_web}/nls/${lang}/messages.js | nls/fr/messages.js  | Specific i18n messages                                                                                                                                             |
| ${base_web}/${tool}.css             | slack.css           | CSS                                                                                                                                                                |
| ${base_web}/${tool}.js              | slack.js            | JS code                                                                                                                                                            |
| ${base_web}/${tool}.html            | slack.html          | HTML template                                                                                                                                                      |
| csv/node.csv                        |                     | [Node](https://github.com/ligoj/ligoj-api/blob/master/plugin-core/src/main/java/org/ligoj/app/model/Node.java) entities to persist                                 |
| csv/parameter.csv                   |                     | [Parameter](https://github.com/ligoj/ligoj-api/blob/master/plugin-core/src/main/java/org/ligoj/app/model/Parameter.java) entities to persist                       |
| csv/parameter-value.csv             |                     | [ParameterValue](https://github.com/ligoj/ligoj-api/blob/master/plugin-core/src/main/java/org/ligoj/app/model/ParameterValue.java) entities to persist (optionnal) |


## Plugins Extension Points
Extension points are configurations defined in the plugin to contribute to the behavior of the application.
This extensions may:
- Change the UI
- Provide additional data collected by another plugins
- Add security levels

| Layer | Scope  | Enablement                                                                                                                                                                                  |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI    | Global | Create a file `META-INF/resource/webjars/bootstrap.private.js`. This JS code will be added to the initial JS code. For sample, it's possible to register an events, to add a menu entry,... |


## Subscription

![subscription](docs/assets/img/subscription.png)

# Development

## Guidelines

1. Convention over code
1. CI build succeed
1. 100% code coverage for business (API container)
1. Keep high all KPIs

### Naming convention

Always use simple words. Because long words  :
* are long to type
* increase syntax/lexical typos
* take some useless spaces in your editor and your mind
* increase the conventional naming entropy in the team

Lines length is `120` chars for code and comments.

Every technical name (variable, URL, API component) exposed to end user must be written in lower case. In addition, for non-local names (Classes, HTML identifiers, CSS classes, function) avoid using 'trimmed' nouns such as: `passwd` (`password`), `param` (`parameter`), `gen` (`generate`), `init` (`initialize`),...

Use patterns for packages or name for files of the same type as described in the bellow table.

| Type                      | Package convention                                          | Name convention                                                             |
| ------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| All                       | ASCII                                                       | ASCII                                                                       |
| All                       | JavaSript syntax                                            | main/...                                                                    | --> See Standard JS, happiness style, only on Atom and SonarQube             |
| All                       | Java syntax                                                 | lower case package, [a-z]+ in src/main/java or src/test/java,               | --> SonarQube profile enabled on your project, only on Eclipse and SonarQube |
| All                       | HTML syntax                                                 | main/...                                                                    | --> Bootstrap Linter, only on Visual Source Code and SonarQube               |
| JAX-RS                    | resources                                                   | ...resource....                                                             | ...Resource.java, use nouns, camel case                                      |
| Spring Data Repository    |                                                             | ...repository...                                                            | ...Repository.java, use nouns, camel case                                    |
| Exception                 | near the using components, but not in a "exception" package | ...Exception.java, camel case                                               |
| JPA entity                | ...model...                                                 | Use nouns, camel case                                                       |
| JPA property              |                                                             | Use nouns, camel case, plural for collections. No `List` or `Set` suffixes. |
| View Object               | near the using components, but not in a "vo" package        | ...Vo.java, use nouns, camel case                                           |
| Web files (js, html, css) | ...module/usecase/....                                      | simple nouns, singular, lower case. Use `-` as word separator               |
| i18n keys                 | ../nls/messages.js or ../nls/xx/messages.js                 | simple nouns, lower case. Use `-` as word separator                         |


Avoid getter/setter, use Lombok

Use full camel case for class names, no class like `PerformanceHTTP` but `PerformanceHttp`

Keep the code the most simple as possible. For sample :
* In resources, the default repository should be named "repository".
* In resources, keep standard the names for CRUD operations. For sample `deleteUser` sould be named `delete` in a resource named `UserResource`.
* Prefer HTTP method type over HTTP path : `@DELETE /user` for deletion, and not `@POST /user/delete`
* Prefer path parameters over the body when there are only one or two parameters
* Use singular (not plural) for resources. This might hurt your feeling regarding the discussions over other practices about plural vs singular of REST resources.

### Test

JUnit5 (no JUnit4) test class must refer to the test class in the JavaDoc with a link, and should contain a field named `resource` of the corresponding type.

The name of test class for `Xyz` should be named `XyzTest`, in the same package.

The name of each test function should match to the corresponding tested function.

Prefer test of resources over the repositories.

### Code coverage

Every Java Code line must be covered. Even "getter", if not:
- Either this code is necessary, and write the associated test
- Either delete it

### REST

Root path of a JAX-RS resource should match with the class name and the related entity JPA . Non unique related JPA entity is accepted and name should match to main feature. Only nouns are accepted.

All JAX-RS path, query, path parameters and form parameters must be in lower case and must be nouns. Avoid if possible the composed nouns; for sample "business-hours" should be replaced by "hours" when there is only one type of hours in the parameters. However, it's possible to use a different java parameter name in this case.

Add as much as possible JSR-303 annotation on your beans (`@NotNull`, `@Size`,..) By default all parameters without annotations are `@NotNull` and all properties are `@Nullable`. Cascaded bean validation still requires `@Valid` on cascaded property.

Dont use try/catch block for technical exception handling. Use them only to handle business rule and `BusinessException` class.

### Tools

* [JSE 21+](http://www.oracle.com/technetwork/java/javase/downloads/index.html) or [OpenJDK 21+](http://jdk.java.net/21/)
* Java IDE 
  * Either [IntelliJ IDEA 2024](https://www.jetbrains.com/idea/)
  * Either [Eclipse 2024‑03+ (java package)](http://www.eclipse.org/downloads/eclipse-packages/) + [Lombok](https://projectlombok.org/) + Java14 JDT patch from the marketplace for version before 2020‑06.
* [Docker](https://www.docker.com/) or [Podman](https://podman.io/)
* [Maven 3.9+](https://maven.apache.org/download.cgi)
* A PgSQL/MySQL (or another compatible) database
* SonarQube, ... (to complete), see the badges for the complete list.
* [Visual Studio Code](https://code.visualstudio.com/)
* npm

## Database setup

For the below samples, a MySQL server for `ligoj-api` container is needed.

Note: At the first start, schema is updated/created and the initial data is inserted into the database.

### With your own database

```sql
mysql --user=root
CREATE DATABASE `ligoj` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_bin;
CREATE USER 'ligoj'@'localhost' IDENTIFIED BY 'ligoj';
GRANT ALL ON `ligoj`.* TO 'ligoj'@'localhost';
FLUSH PRIVILEGES;
quit
```

### With a fresh new database 

```
docker run --name ligoj-db -d -p 3306:3306 -e MYSQL_RANDOM_ROOT_PASSWORD=yes -e MYSQL_DATABASE=ligoj -e MYSQL_USER=ligoj -e MYSQL_PASSWORD=ligoj -d mysql:5.7
```

## Building

Docker build (ARG) variables:

```
NEXUS_URL : Repository base host used to download the WAR files
VERSION   : Ligoj version, used to build the WAR_URL
WAR_URL   : Full WAR URL, built from NEXUS_URL and VERSION
```

## Running

### With Maven CLI

```
git clone https://github.com/ligoj/ligoj
mvn spring-boot:run -f app-api/pom.xml& 
mvn spring-boot:run -f app-ui/pom.xml&
```

### With your IDE

From your IDE, without Maven runner (but Maven classpath contribution), create and execute 2 run configurations with the following main classes :

```
org.ligoj.boot.api.Application
org.ligoj.boot.web.Application
```

Notes these launchers (*.launch) are already configured for Eclipse.
See [Wiki page](https://github.com/ligoj/ligoj/wiki/Dev-Setup) for more information.

## Packaging

When the WAR is built you can enable minified CSS/JS with the maven profile 'minify'. This requires 'clean-css-cli' NPM module.

```
npm install clean-css-cli -g
mvn clean package -Pminifiy -DskipTests=true
```

## Deploying

### Nexus OSS

```
mvn clean deploy -Dgpg.skip=false -Psources,javadoc,minify -DskipTests=true
```

## Setup notices

For Eclipse compiler, enable 'Store information about method parameters (usable with reflection)' in general preferences/Java/Compiler