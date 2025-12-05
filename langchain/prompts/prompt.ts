export function createPatchPrompt(findingsText: string): string {
  return `You are a Senior cybersecurity expert analyzing security vulnerabilities discovered by OWASP ZAP.

For each vulnerability below, provide detailed patch recommendations in JSON format.

Vulnerability Details:
${findingsText}

For each vulnerability, respond with a JSON array containing objects with these exact fields:
- vulnerability: The vulnerability name or type
- risk: Assessment of risk level (High, Medium, or Low)
- url: The URL where the vulnerability was found
- analysis: Your expert analysis of the vulnerability and its potential impact
- patchRecommendation: Specific steps to fix this vulnerability
- secureCodeExample: A code snippet showing the secure fix

Ensure the response is valid JSON and can be parsed programmatically.
Return ONLY the JSON array, no other text.`;
}

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
