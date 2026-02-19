import { ZapFindingSchema, VulnerabilityInputSchema } from "../schemas";
import type { ZapFinding, VulnerabilityInput, ZapInstance } from "../schemas";


export class ZapFindingAdapter {

    static convert(finding: ZapFinding): VulnerabilityInput {

        const validatedFinding = ZapFindingSchema.parse(finding);


        const cleanDescription = ZapFindingAdapter.stripHtml(validatedFinding.description);
        const cleanSolution = validatedFinding.solution
            ? ZapFindingAdapter.stripHtml(validatedFinding.solution)
            : undefined;


        const instance = ZapFindingAdapter.getFirstInstance(validatedFinding.instances);


        const cweId = ZapFindingAdapter.parseCweId(validatedFinding.cweId);


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


        return VulnerabilityInputSchema.parse(vulnerabilityInput);
    }


    static convertMany(findings: ZapFinding[]): VulnerabilityInput[] {
        return findings.map((finding) => ZapFindingAdapter.convert(finding));
    }


    static convertAndFilter(
        findings: ZapFinding[],
        minRiskLevel: "High" | "Medium" | "Low" = "Medium"
    ): VulnerabilityInput[] {
        const riskOrder = ["Informational", "Low", "Medium", "High"];
        const minIndex = riskOrder.indexOf(minRiskLevel);


        const filtered = findings.filter((finding) => {
            const riskIndex = riskOrder.indexOf(
                ZapFindingAdapter.normalizeRiskLevel(finding.severity)
            );
            return riskIndex >= minIndex;
        });


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


    private static getFirstInstance(instances: ZapInstance[] | ZapInstance): ZapInstance {
        if (Array.isArray(instances)) {
            return instances[0] || { uri: "", method: "", param: "", attack: "", evidence: "" };
        }
        return instances;
    }


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


    private static stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, "")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")
            .trim();
    }


    private static normalizeRiskLevel(severity: string): string {
        const upperSeverity = severity.toUpperCase();

        if (upperSeverity.includes("HIGH")) return "High";
        if (upperSeverity.includes("MEDIUM")) return "Medium";
        if (upperSeverity.includes("LOW")) return "Low";
        return "Informational";
    }
}
