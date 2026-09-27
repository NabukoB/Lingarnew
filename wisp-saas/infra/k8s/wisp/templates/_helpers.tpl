{{- define "wisp.image" -}}
{{ .root.Values.image.registry }}/{{ .name }}:{{ .root.Values.image.tag }}
{{- end -}}
{{- define "wisp.labels" -}}
app.kubernetes.io/part-of: wisp
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
