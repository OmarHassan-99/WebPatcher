export const OWASP_TOP_10 = [
  {
    id: "A01:2021",
    title: "Broken Access Control",
    icon: "Key",
    description:
      "Access control enforces policies such that users cannot act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of all data or performing a business function outside the user's limits.",
    impact:
      "Organizations can suffer severe data breaches where attackers gain access to sensitive user data, admin panels, or internal company resources. This leads to massive reputational damage and regulatory fines.",
    prevention:
      "Implement zero trust architectures, deny by default, and enforce access controls in trusted server-side code or serverless APIs.",
  },
  {
    id: "A02:2021",
    title: "Cryptographic Failures",
    icon: "Lock",
    description:
      "Previously known as Sensitive Data Exposure, this focuses on failures related to cryptography which often leads to sensitive data exposure or system compromise.",
    impact:
      "Compromised passwords, credit card numbers, health records, and personal information. Attackers can steal identities, commit financial fraud, and severely impact the organization's customers.",
    prevention:
      "Classify data processed, stored or transmitted by an application. Apply strong encryption protocols (TLS), avoid deprecated algorithms, and securely manage keys.",
  },
  {
    id: "A03:2021",
    title: "Injection",
    icon: "TerminalSquare",
    description:
      "Injection flaws, such as SQL, NoSQL, OS, and LDAP injection, occur when untrusted data is sent to an interpreter as part of a command or query.",
    impact:
      "Attackers can bypass authentication, access, modify or delete entire databases, and in severe cases, execute arbitrary remote commands on the hosting server.",
    prevention:
      "Use safe APIs (like parameterized queries), implement positive server-side input validation, and escape special characters.",
  },
  {
    id: "A04:2021",
    title: "Insecure Design",
    icon: "PenTool",
    description:
      "A new category focusing on risks related to design and architectural flaws, calling for more use of threat modeling, secure design patterns, and reference architectures.",
    impact:
      "Fundamentally flawed applications cannot be fixed by a simple patch; they require complete architectural overhauls, costing organizations massive amounts of time and development resources.",
    prevention:
      "Establish and use a secure development lifecycle (SDLC). Integrate threat modeling at the design phase before writing code.",
  },
  {
    id: "A05:2021",
    title: "Security Misconfiguration",
    icon: "Settings",
    description:
      "This risk results from insecure default settings, incomplete or ad hoc configurations, open cloud storage, misconfigured HTTP headers, and verbose error messages.",
    impact:
      "Attackers can easily exploit unpatched flaws or access default accounts. Verbose errors can reveal application architecture, giving attackers a blueprint of the system.",
    prevention:
      "Implement a repeatable hardening process, remove unused features and frameworks, and automate security configuration checks.",
  },
  {
    id: "A06:2021",
    title: "Vulnerable and Outdated Components",
    icon: "Layers",
    description:
      "Components, such as libraries, frameworks, and other software modules, run with the same privileges as the application. If a vulnerable component is exploited, it can facilitate serious data loss or server takeover.",
    impact:
      "Organizations rely heavily on third-party code. Exploits like Log4Shell demonstrate how a single vulnerable component can compromise thousands of enterprise networks globally.",
    prevention:
      "Remove unused dependencies, inventory all components (SBOM), and continuously monitor sources like CVE and NVD for vulnerabilities.",
  },
  {
    id: "A07:2021",
    title: "Identification and Authentication Failures",
    icon: "UserX",
    description:
      "Confirmation of the user's identity, authentication, and session management is critical to protect against authentication-related attacks (like credential stuffing or brute force).",
    impact:
      "Attackers can take over user accounts, masquerade as administrators, and perform fraudulent transactions on behalf of victims.",
    prevention:
      "Implement multi-factor authentication (MFA), do not ship or deploy with default credentials, and implement weak-password checks.",
  },
  {
    id: "A08:2021",
    title: "Software and Data Integrity Failures",
    icon: "ShieldAlert",
    description:
      "Relates to code and infrastructure that does not protect against integrity violations. This includes insecure CI/CD pipelines and software updates without signing.",
    impact:
      "Attackers can distribute malicious updates or compromise CI/CD pipelines to inject backdoors directly into the organization's official software releases (e.g., SolarWinds attack).",
    prevention:
      "Use digital signatures to verify software, ensure CI/CD pipelines have strict access control, and review code and configuration changes.",
  },
  {
    id: "A09:2021",
    title: "Security Logging and Monitoring Failures",
    icon: "Activity",
    description:
      "Without logging and monitoring, breaches cannot be detected. Most successful attacks start with vulnerability probing and attackers rely on the lack of monitoring to achieve their goals.",
    impact:
      "Attackers can remain hidden in an organization's network for months (often over 200 days), extracting data continuously without triggering any alarms.",
    prevention:
      "Ensure all login, access control, and server-side input validation failures are logged. Establish effective incident response and recovery plans.",
  },
  {
    id: "A10:2021",
    title: "Server-Side Request Forgery (SSRF)",
    icon: "Globe",
    description:
      "SSRF flaws occur whenever a web application is fetching a remote resource without validating the user-supplied URL. It allows an attacker to coerce the application to send a crafted request to an unexpected destination.",
    impact:
      "Attackers can access internal services behind the firewall, port-scan internal networks, and extract metadata from cloud environments (like AWS metadata services).",
    prevention:
      "Enforce \"deny by default\" network policies, sanitize and validate all client-supplied input data, and avoid sending raw responses to clients.",
  },
];
