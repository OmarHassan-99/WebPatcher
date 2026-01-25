import { ZapFindingSchema, VulnerabilityInputSchema } from "./schemas";
import type { ZapFinding, VulnerabilityInput, ZapInstance } from "./schemas";

/**
 * ZapFindingAdapter - Converts ZAP extractor output to PatchGenerator input
 */
export class ZapFindingAdapter {
    /**
     * Convert a single ZAP finding to VulnerabilityInput format
     * 
     * @param finding - ZAP finding from the extractor service
     * @returns VulnerabilityInput for PatchGenerator
     */
    static convert(finding: ZapFinding): VulnerabilityInput {
        // Validate the finding against schema
        const validatedFinding = ZapFindingSchema.parse(finding);

        // Strip HTML tags from description and solution
        const cleanDescription = ZapFindingAdapter.stripHtml(validatedFinding.description);
        const cleanSolution = validatedFinding.solution
            ? ZapFindingAdapter.stripHtml(validatedFinding.solution)
            : undefined;

        // Get the first instance (instances can be array or single object)
        const instance = ZapFindingAdapter.getFirstInstance(validatedFinding.instances);

        // Parse cweId - can be string, number, or null
        const cweId = ZapFindingAdapter.parseCweId(validatedFinding.cweId);

        // Build the VulnerabilityInput object
        const vulnerabilityInput: VulnerabilityInput = {
            alert_name: validatedFinding.alertName,
            description: cleanDescription,
            risk_level: ZapFindingAdapter.normalizeRiskLevel(validatedFinding.severity),
            affected_url: instance.uri || "Unknown URL",
            evidence: instance.evidence || undefined,
            method: instance.method || undefined,
            parameter: instance.param || undefined,
            attack_vector: instance.attack || undefined,
            cwe_id: cweId,
            solution: cleanSolution,
        };

        // Validate the output
        return VulnerabilityInputSchema.parse(vulnerabilityInput);
    }

    /**
     * Convert multiple ZAP findings to VulnerabilityInput format
     * 
     * @param findings - Array of ZAP findings from the extractor service
     * @returns Array of VulnerabilityInput for PatchGenerator
     */
    static convertMany(findings: ZapFinding[]): VulnerabilityInput[] {
        return findings.map((finding) => ZapFindingAdapter.convert(finding));
    }

    /**
     * Convert ZAP findings, filter by risk level, and deduplicate by alert name
     * 
     * @param findings - Array of ZAP findings
     * @param minRiskLevel - Minimum risk level to include ("High", "Medium", "Low")
     * @returns Filtered and deduplicated array of VulnerabilityInput
     */
    static convertAndFilter(
        findings: ZapFinding[],
        minRiskLevel: "High" | "Medium" | "Low" = "Medium"
    ): VulnerabilityInput[] {
        const riskOrder = ["Informational", "Low", "Medium", "High"];
        const minIndex = riskOrder.indexOf(minRiskLevel);

        // Filter by risk level
        const filtered = findings.filter((finding) => {
            const riskIndex = riskOrder.indexOf(
                ZapFindingAdapter.normalizeRiskLevel(finding.severity)
            );
            return riskIndex >= minIndex;
        });

        // Deduplicate by alertName - keep only the first occurrence of each vulnerability type
        const seen = new Set<string>();
        const deduplicated = filtered.filter((finding) => {
            if (seen.has(finding.alertName)) {
                return false;
            }
            seen.add(finding.alertName);
            return true;
        });

        console.log(`[ZapFindingAdapter] Filtered: ${findings.length} → ${filtered.length} (risk >= ${minRiskLevel})`);
        console.log(`[ZapFindingAdapter] Deduplicated: ${filtered.length} → ${deduplicated.length} unique vulnerability types`);

        return deduplicated.map((finding) => ZapFindingAdapter.convert(finding));
    }

    /**
     * Get the first instance from instances (handles array or single object)
     */
    private static getFirstInstance(instances: ZapInstance[] | ZapInstance): ZapInstance {
        if (Array.isArray(instances)) {
            return instances[0] || { uri: "", method: "", param: "", attack: "", evidence: "" };
        }
        return instances;
    }

    /**
     * Parse CWE ID - can be string, number, or null
     */
    private static parseCweId(cweId: string | number | null | undefined): number | undefined {
        if (cweId === null || cweId === undefined) {
            return undefined;
        }
        if (typeof cweId === "number") {
            return cweId;
        }
        const parsed = parseInt(cweId, 10);
        return isNaN(parsed) ? undefined : parsed;
    }

    /**
     * Strip HTML tags from text (ZAP reports contain HTML-formatted descriptions)
     */
    private static stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/&lt;/g, "<")   // Decode HTML entities
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")    // Normalize whitespace
            .trim();
    }

    /**
     * Normalize ZAP risk level strings to standard format
     * ZAP uses formats like "High (Medium)" - we extract just the main level
     */
    private static normalizeRiskLevel(severity: string): string {
        const upperSeverity = severity.toUpperCase();

        if (upperSeverity.includes("HIGH")) return "High";
        if (upperSeverity.includes("MEDIUM")) return "Medium";
        if (upperSeverity.includes("LOW")) return "Low";
        return "Informational";
    }
}
