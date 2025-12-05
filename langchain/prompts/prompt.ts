export function formatFindingsForPrompt(findings: unknown[]): string {
  return findings
    .map((finding: any, index) => {
      return `
Vulnerability ${index + 1}:
  Name: ${finding.alertName}
  Severity: ${finding.severity}
  Description: ${finding.description}
  Solution (from ZAP): ${finding.solution}
  URL: ${finding.instances.uri || "N/A"}
  Method: ${finding.instances.method || "N/A"}
  Parameter: ${finding.instances.param || "N/A"}
  Attack Vector: ${finding.instances.attack || "N/A"}
  Evidence: ${finding.instances.evidence || "N/A"}
`;
    })
    .join("\n---\n");
}
