{{/*
Common naming / labels
*/}}
{{- define "ligoj.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "ligoj.fullname" -}}
{{- if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "ligoj.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
app.kubernetes.io/name: {{ include "ligoj.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end -}}

{{- define "ligoj.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ligoj.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Image references
*/}}
{{- define "ligoj.tag" -}}
{{- .Values.image.tag | default .Chart.AppVersion -}}
{{- end -}}

{{- define "ligoj.apiImage" -}}
{{- printf "%s%s:%s" .Values.image.registry .Values.image.apiRepository (include "ligoj.tag" .) -}}
{{- end -}}

{{- define "ligoj.uiImage" -}}
{{- printf "%s%s:%s" .Values.image.registry .Values.image.uiRepository (include "ligoj.tag" .) -}}
{{- end -}}

{{/*
Database wiring — resolved from the bundled database or the external one.
*/}}
{{- define "ligoj.db.vendor" -}}
{{- if .Values.database.builtin.enabled -}}{{ .Values.database.builtin.vendor }}{{- else -}}{{ .Values.database.external.vendor }}{{- end -}}
{{- end -}}

{{- define "ligoj.db.host" -}}
{{- if .Values.database.builtin.enabled -}}{{ include "ligoj.fullname" . }}-db{{- else -}}{{ required "database.external.host is required when database.builtin.enabled is false" .Values.database.external.host }}{{- end -}}
{{- end -}}

{{- define "ligoj.db.port" -}}
{{- if .Values.database.builtin.enabled -}}
{{- if eq .Values.database.builtin.vendor "mysql" -}}3306{{- else -}}5432{{- end -}}
{{- else -}}
{{- if .Values.database.external.port -}}{{ .Values.database.external.port }}{{- else if eq .Values.database.external.vendor "mysql" -}}3306{{- else -}}5432{{- end -}}
{{- end -}}
{{- end -}}

{{- define "ligoj.db.database" -}}
{{- if .Values.database.builtin.enabled -}}{{ .Values.database.builtin.database }}{{- else -}}{{ .Values.database.external.database }}{{- end -}}
{{- end -}}

{{- define "ligoj.db.username" -}}
{{- if .Values.database.builtin.enabled -}}{{ .Values.database.builtin.username }}{{- else -}}{{ .Values.database.external.username }}{{- end -}}
{{- end -}}

{{- define "ligoj.db.image" -}}
{{- if .Values.database.builtin.image -}}
{{- .Values.database.builtin.image -}}
{{- else if eq .Values.database.builtin.vendor "mysql" -}}mysql:8.0.36{{- else -}}postgres:16{{- end -}}
{{- end -}}

{{/*
JDBC system properties composed for the API container. The password is NOT
inlined: it travels through the JDBC_PASSWORD env (Secret-backed) and is
expanded by Kubernetes' $(VAR) substitution inside CUSTOM_OPTS.
*/}}
{{- define "ligoj.jdbcOpts" -}}
{{- $vendor := include "ligoj.db.vendor" . -}}
-Djdbc.host={{ include "ligoj.db.host" . }} -Djdbc.port={{ include "ligoj.db.port" . }} -Djdbc.database={{ include "ligoj.db.database" . }} -Djdbc.username={{ include "ligoj.db.username" . }} -Djdbc.password=$(JDBC_PASSWORD)
{{- if eq $vendor "postgresql" }} -Djdbc.vendor=postgresql -Djdbc.driverClassName=org.postgresql.Driver -Djpa.dialect=org.ligoj.bootstrap.core.dao.PostgreSQL95NoSchemaDialect -Djpa.hbm2ddl=update
{{- end -}}
{{- end -}}

{{/*
Secret name / keys holding the sensitive values managed by this chart.
*/}}
{{- define "ligoj.secretName" -}}
{{- include "ligoj.fullname" . }}-secrets
{{- end -}}

{{- define "ligoj.crypto.secretName" -}}
{{- if .Values.crypto.existingSecret -}}{{ .Values.crypto.existingSecret }}{{- else -}}{{ include "ligoj.secretName" . }}{{- end -}}
{{- end -}}

{{- define "ligoj.crypto.secretKey" -}}
{{- if .Values.crypto.existingSecret -}}{{ .Values.crypto.existingSecretKey }}{{- else -}}crypto-password{{- end -}}
{{- end -}}

{{- define "ligoj.db.secretName" -}}
{{- if and (not .Values.database.builtin.enabled) .Values.database.external.existingSecret -}}{{ .Values.database.external.existingSecret }}{{- else -}}{{ include "ligoj.secretName" . }}{{- end -}}
{{- end -}}

{{- define "ligoj.db.secretKey" -}}
{{- if and (not .Values.database.builtin.enabled) .Values.database.external.existingSecret -}}{{ .Values.database.external.existingSecretKey }}{{- else -}}db-password{{- end -}}
{{- end -}}
