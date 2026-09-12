#!/usr/bin/env bash

set -euo pipefail

project_key="${SONAR_PROJECT_KEY:-juergen69_Orderly}"
server_url="${SONAR_HOST_URL:-https://sonarcloud.io}"
report_path="${SONAR_REPORT_PATH:-sonar-issues.json}"

command -v curl >/dev/null || {
  printf '%s\n' 'sonar-report: curl is required' >&2
  exit 1
}

command -v jq >/dev/null || {
  printf '%s\n' 'sonar-report: jq is required' >&2
  exit 1
}

auth_args=()
if [[ -n "${SONAR_TOKEN:-}" ]]; then
  auth_args=(-u "${SONAR_TOKEN}:")
fi

gate_json="$(curl -fsS "${auth_args[@]}" --get "${server_url}/api/qualitygates/project_status" \
  --data-urlencode "projectKey=${project_key}")"

issues_json="$(curl -fsS "${auth_args[@]}" --get "${server_url}/api/issues/search" \
  --data-urlencode "componentKeys=${project_key}" \
  --data-urlencode 'resolved=false' \
  --data-urlencode 'statuses=OPEN,CONFIRMED,REOPENED' \
  --data-urlencode 'ps=500')"

mkdir -p "$(dirname "$report_path")"

jq -n \
  --arg projectKey "$project_key" \
  --argjson gate "$gate_json" \
  --argjson issues "$issues_json" \
  '{
    projectKey: $projectKey,
    qualityGate: {
      status: $gate.projectStatus.status,
      conditions: [
        $gate.projectStatus.conditions[] |
        select(.status == "ERROR") |
        {
          metric: .metricKey,
          actual: .actualValue,
          threshold: .errorThreshold,
          comparator: .comparator
        }
      ]
    },
    unresolvedIssues: [
      $issues.issues[] |
      {
        key,
        rule,
        severity,
        type,
        file: (.component | sub("^.*?:src/"; "src/")),
        line,
        message,
        effort,
        impacts: .impactSoftwareQualities
      }
    ]
  }' > "$report_path"

cat "$report_path"
printf 'Sonar report saved to %s\n' "$report_path" >&2