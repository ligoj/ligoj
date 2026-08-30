# Ligoj Helm chart

Deploys [Ligoj](https://ligoj.io) on Kubernetes: the **API** server
(`ligoj/ligoj-api`, port 8081, context `/ligoj-api`), the **UI** server
(`ligoj/ligoj-ui`, port 8080, context `/ligoj`) and a database — either the
**bundled single-replica development database** (PostgreSQL by default, MySQL
optional) or an **external** one you manage. The chart mirrors the repository's
compose stack (`compose.yml` + overrides).

## Quick start

```bash
# Development / evaluation: bundled PostgreSQL, port-forward access
helm install ligoj ./charts/ligoj

kubectl port-forward svc/ligoj-ui 8080:8080
open http://localhost:8080/ligoj      # admin / admin on a fresh database
```

Bundled MySQL instead:

```bash
helm install ligoj ./charts/ligoj --set database.builtin.vendor=mysql
```

Production shape — external database, ingress, real secrets:

```bash
helm install ligoj ./charts/ligoj \
  --set database.builtin.enabled=false \
  --set database.external.vendor=postgresql \
  --set database.external.host=pg.company.com \
  --set database.external.existingSecret=ligoj-db \
  --set crypto.existingSecret=ligoj-crypto \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set "ingress.hosts[0]=ligoj.company.com" \
  --set api.persistence.storageClass=fast-ssd
```

## Values

| Key | Default | Description |
| --- | --- | --- |
| `image.registry` | `""` | Prefix for both repositories (e.g. `registry.company.com/`) |
| `image.apiRepository` / `image.uiRepository` | `ligoj/ligoj-api` / `ligoj/ligoj-ui` | Image repositories |
| `image.tag` | chart `appVersion` | Ligoj version |
| `image.pullPolicy` / `image.pullSecrets` | `IfNotPresent` / `[]` | Pull configuration |
| `api.replicas` | `1` | API replicas (keep 1 unless the home volume is RWX-shared) |
| `api.javaMemory` / `api.javaOptions` | `-Xms512M -Xmx1024M` / `-Duser.timezone=UTC` | JVM settings |
| `api.customOpts` | `""` | Extra `-D` properties appended after the chart-computed JDBC ones (last wins) |
| `api.persistence.enabled` | `true` | PVC for `/home/ligoj` (downloaded plugin jars) |
| `api.persistence.size` / `.storageClass` / `.existingClaim` | `2Gi` / `""` / `""` | Home volume settings |
| `api.resources` / `nodeSelector` / `tolerations` / `affinity` / `podAnnotations` | — | Standard scheduling knobs (same under `ui.`) |
| `ui.replicas` | `1` | UI replicas (stateless, scale freely) |
| `ui.contextUrl` | `/ligoj` | Public SPA context path; drives the ingress path and probes |
| `ui.service.type` / `.port` / `.nodePort` | `ClusterIP` / `8080` | UI service exposure |
| `crypto.password` | `public` | `app.crypto.password` — **change it** for any real deployment |
| `crypto.existingSecret` / `.existingSecretKey` | `""` / `crypto-password` | Use an existing Secret instead |
| `database.builtin.enabled` | `true` | Bundled dev database (StatefulSet, 1 replica) |
| `database.builtin.vendor` | `postgresql` | `postgresql` or `mysql` |
| `database.builtin.image` | per vendor | `postgres:16` / `mysql:8.0.36` |
| `database.builtin.database` / `.username` / `.password` | `ligoj` ×3 | Dev credentials |
| `database.builtin.persistence.size` / `.storageClass` | `8Gi` / `""` | Database volume |
| `database.external.vendor` / `.host` / `.port` | `postgresql` / — / per vendor | External database (used when `builtin.enabled=false`; `host` is then required) |
| `database.external.database` / `.username` / `.password` | `ligoj` / `ligoj` / `""` | External credentials |
| `database.external.existingSecret` / `.existingSecretKey` | `""` / `db-password` | Password from an existing Secret |
| `ingress.enabled` / `.className` / `.annotations` / `.hosts` / `.tls` | `false` / … | UI ingress, path = `ui.contextUrl` |
| `commonLabels` | `{}` | Labels added to every object |

## How the pieces connect

- The UI proxies every `/ligoj/rest/*` call to the API through the in-cluster
  service (`ENDPOINT=http://<release>-api:8081/ligoj-api`) — only the UI needs
  to be exposed.
- JDBC wiring is composed by the chart into the API's `CUSTOM_OPTS`
  (`-Djdbc.host/-Djdbc.port/...`; PostgreSQL additionally sets the vendor,
  driver, dialect and `hbm2ddl=update`, matching `compose-override.yml`). The
  password never appears in the pod spec: it is injected as the Secret-backed
  `JDBC_PASSWORD` env and referenced as `$(JDBC_PASSWORD)`.
- Probes use the servers' own health endpoints: `/ligoj-api/manage/health`
  (API) and `<contextUrl>/favicon.ico` (UI), like the Docker HEALTHCHECKs.
- The API home (`/home/ligoj`) holds the downloaded plugin jars: it is
  PVC-backed by default so plugin installations survive restarts. The UI home
  is transient (`emptyDir`).

## Limitations

- The bundled database is a convenience for evaluation: single replica, no
  backups, plain StatefulSet. Point `database.external.*` at a managed
  instance for production.
- `api.replicas > 1` requires a shared (RWX) home volume and is not the
  primary deployment shape.
