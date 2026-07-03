---
# Ain Shams University
# Faculty of Computer & Information Sciences
# Computer Science Department

# Project Title: WebPatcher - Patch Recommendation Workflow For WebApp Vulnerabilities

**June 2026**

---

# Acknowledgements

All praise and thanks to ALLAH, who provided me the ability to complete this work. I hope to accept this work from me.

I am grateful to my parents and my family who are always providing help and support throughout the whole years of study. I hope I can give that back to them.

I also offer my sincerest gratitude to my supervisors, Prof. Dr. [Supervisor Name], Dr. [Supervisor Name] and T.A. [TA Name] who have supported me throughout my thesis with their patience, knowledge, and experience.

Finally, I would thank my friends and all people who gave me support and encouragement.

---

# Abstract

Web applications are increasingly prone to critical vulnerabilities that can lead to severe security breaches, data loss, and systemic compromise. As automated scanners efficiently detect these vulnerabilities at scale, remediation often remains a manual, time-consuming, and error-prone process. **WebPatcher** is an automated workflow system designed to bridge the critical gap between vulnerability discovery and remediation. By integrating state-of-the-art Dynamic Application Security Testing (DAST) tools (such as OWASP ZAP) with advanced Large Language Models (LLMs) via the LangChain framework, WebPatcher generates accurate, behavior-aware code patches tailored to the target application's specific vulnerabilities and technology stack. 

Our approach not only recommends context-aware security fixes but also leverages a novel behavioral bucketing strategy. Utilizing API fuzzing tools like Schemathesis, WebPatcher performs a rigorous comparison of pre- and post-patch application behavior. By categorizing request inputs and HTTP responses into normalized buckets, the system mathematically verifies that the generated patch successfully mitigates the vulnerability without disrupting the expected business logic or application workflow. The result is a robust, automated pipeline that significantly reduces Mean Time to Remediation (MTTR) and enhances the overall security posture of modern web applications.

---

# Table of Contents
1. Acknowledgements ........................................................... 1
2. Abstract ................................................................... 2
3. List of Figures ............................................................ 4
4. List of Tables ............................................................. 5
5. List of Abbreviations ...................................................... 6
6. Chapter 1: Introduction .................................................... 7
    1.1 Problem Definition .................................................... 7
    1.2 Motivation ............................................................ 8
    1.3 Objectives ............................................................ 9
    1.4 Time Plan ............................................................. 10
    1.5 Documentation Outline ................................................. 11
7. Chapter 2: Background ...................................................... 12
    2.1 Web Application Security and the OWASP Top 10 ......................... 12
    2.2 Dynamic Application Security Testing (DAST) ........................... 14
    2.3 Large Language Models in Software Engineering ......................... 16
    2.4 Behavioral Verification and Fuzzing ................................... 18
8. Chapter 3: Proposed System ................................................. 20
    3.1 System Architecture ................................................... 20
    3.2 Component Workflows ................................................... 22
    3.3 Database Design and Data Flow ......................................... 24
9. Chapter 4: System Implementation ........................................... 26
    4.1 Backend API Implementation (Express.js) ............................... 26
    4.2 Patch Generation Service (LangChain) .................................. 28
    4.3 Frontend Interface (React & Vite) ..................................... 32
10. Chapter 5: System Testing .................................................. 34
    5.1 Testing Strategy Overview ............................................. 34
    5.2 Behavioral Bucketing with Schemathesis ................................ 35
    5.3 Evaluation Metrics and Verdicts ....................................... 38
11. Chapter 6: Conclusion and Future Work ...................................... 40
    6.1 Conclusion ............................................................ 40
    6.2 Future Work ........................................................... 41
12. Tools ...................................................................... 43
13. References ................................................................. 45

---

# List of Figures

Figure 1.1: WebPatcher Workflow Timeline ........................................ 10
Figure 3.1: High-Level System Architecture Diagram .............................. 21
Figure 3.2: DAST to LLM Data Flow ............................................... 23
Figure 4.1: Flowchart for LLM Patch Generation Workflow ......................... 29
Figure 4.2: LangChain Prompt Engineering Structure .............................. 31
Figure 5.1: Schemathesis Behavioral Comparison Output ........................... 37
Figure 5.2: Normalized JSON Shape for API Responses ............................. 39

# List of Tables

Table 1.1: Project Time Plan and Milestones ..................................... 10
Table 2.1: Comparison of SAST vs. DAST .......................................... 15
Table 3.1: ScanJob Mongoose Schema Attributes ................................... 24
Table 4.1: REST API Endpoints Overview .......................................... 27
Table 5.1: Behavioral Bucketing Verdicts ........................................ 38

# List of Abbreviations

**API**: Application Programming Interface
**CI/CD**: Continuous Integration and Continuous Deployment
**CSRF**: Cross-Site Request Forgery
**CWE**: Common Weakness Enumeration
**DAST**: Dynamic Application Security Testing
**LLM**: Large Language Model
**MERN**: MongoDB, Express.js, React, Node.js
**MTTR**: Mean Time to Remediation
**ORM**: Object-Relational Mapping
**OWASP**: Open Web Application Security Project
**SAST**: Static Application Security Testing
**XSS**: Cross-Site Scripting
**ZAP**: Zed Attack Proxy

---

# Chapter 1: Introduction

## 1.1 Problem Definition

In the contemporary digital landscape, web applications serve as the backbone of global commerce, communication, and infrastructure. However, this ubiquity makes them prime targets for malicious actors. Vulnerabilities such as Cross-Site Scripting (XSS), SQL Injection, Broken Access Control, and Security Misconfigurations consistently plague applications, often leading to catastrophic data breaches. 

While the software industry has developed robust automated scanning tools to detect these vulnerabilities—most notably Dynamic Application Security Testing (DAST) tools like OWASP ZAP—the remediation phase remains a significant bottleneck. Security analysts and developers are often inundated with lengthy reports containing hundreds of findings. Developers, who may lack specialized security training, must manually review these reports, trace the vulnerability to the source code, understand the complex security context, and manually write and test patches.

This manual process is intrinsically flawed:
1.  **Time-Consuming:** The gap between vulnerability discovery and remediation (MTTR) can span weeks or months.
2.  **Prone to Human Error:** Developers might apply incomplete fixes that fail to fully mitigate the risk or, worse, introduce new logical bugs into the application.
3.  **Lack of Context:** Automated scanners provide HTTP traces, but translating a network-level finding into a code-level fix requires deep contextual understanding of the application's technology stack.

### 1.1.1 History

Historically, application security was treated as an afterthought—a gatekeeping phase at the end of the software development lifecycle (SDLC). The rise of DevSecOps attempted to shift security "left," integrating scanning tools directly into CI/CD pipelines. Despite this integration, the remediation of findings remained a manual task. Early attempts at automated patching relied on static rule-based engines (e.g., regex replacements), which proved brittle and incapable of handling the semantic complexity of modern web frameworks.

### 1.1.2 Applications

The WebPatcher system is designed to be highly applicable in several domains:
*   **Agile Software Development Teams:** Enabling developers to receive immediate, actionable code fixes alongside vulnerability reports, reducing friction between development and security teams.
*   **Security Operations Centers (SOC):** Assisting security engineers in quickly triaging vulnerabilities and providing developers with ready-to-merge Pull Requests.
*   **Continuous Deployment Pipelines (DevSecOps):** Functioning as an automated remediation gate that not only finds bugs but suggests the exact code modifications required to fix them.

## 1.2 Motivation

The primary motivation behind WebPatcher is to eliminate the latency in the vulnerability remediation lifecycle. As deployment frequencies increase, security practices must scale proportionally. By leveraging the recent, unprecedented advancements in Large Language Models (LLMs)—which possess deep semantic understanding of programming languages and security paradigms—we can automate the translation of DAST findings into secure, context-aware source code patches.

Furthermore, a significant challenge in automated patching is the fear of breaking existing functionality. Therefore, a secondary but equally critical motivation is to provide automated confidence in the generated patches. By implementing a behavioral bucketing strategy that compares API behavior pre- and post-patch, WebPatcher ensures that the proposed fixes are safe to deploy.

## 1.3 Objectives

To achieve the desired automated remediation workflow, WebPatcher outlines the following core objectives:
1.  **Scanner Integration:** To seamlessly integrate a premier DAST tool (OWASP ZAP) to conduct comprehensive automated security audits of target web applications, including handling complex authentication flows.
2.  **Intelligent Patch Generation:** To construct a specialized microservice utilizing LangChain and advanced LLMs capable of interpreting DAST findings (alert name, description, evidence, and HTTP traces) and generating secure, syntax-correct, and framework-aware source code replacements.
3.  **Context-Awareness:** To allow the LLM to understand the target's technology stack (e.g., Node.js, Express, MongoDB) to ensure the generated patches use the correct paradigms (e.g., specific ORM functions or middleware).
4.  **Behavioral Verification:** To utilize API fuzzing (Schemathesis) to execute a behavioral comparison strategy. This ensures the patch alters the application's behavior only concerning the vulnerability, leaving business logic intact.
5.  **User Experience:** To develop an intuitive, real-time MERN-stack web dashboard where users can manage scan jobs, review findings, inspect side-by-side diffs of generated patches, and monitor validation status.

## 1.4 Time Plan

The development of WebPatcher was divided into several distinct phases to ensure systematic progress and rigorous testing.

[Student: Insert a Gantt chart or detailed table here illustrating the project phases. Example structure below]
*   **Phase 1: Research and Requirements Gathering** - Literature review, selection of LLMs, and DAST tool evaluation.
*   **Phase 2: System Architecture Design** - Designing the database schema, API contracts, and microservice communication.
*   **Phase 3: Backend and DAST Integration** - Developing the Node.js API and integrating the OWASP ZAP daemon.
*   **Phase 4: LLM Service Implementation** - Building the LangChain PatchGenerator, prompt engineering, and context management.
*   **Phase 5: Frontend Interface Development** - Building the React dashboard, integrating WebSockets for live updates, and implementing code diff viewers.
*   **Phase 6: Behavioral Testing Engine** - Scripting the Schemathesis comparison logic, `jq` normalization, and evaluation metrics.
*   **Phase 7: System Integration and Final Testing** - End-to-end testing, bug fixing, and documentation.

## 1.5 Documentation Outline

The remainder of this documentation is structured as follows:
*   **Chapter 2 (Background):** Provides a comprehensive literature review on web security, DAST methodologies, the evolution of LLMs in software engineering, and behavioral fuzzing techniques.
*   **Chapter 3 (Proposed System):** Details the overarching architecture of WebPatcher, the interaction between its microservices, and the database schema that tracks scan jobs.
*   **Chapter 4 (System Implementation):** Dives deep into the codebase, examining the Express.js server configuration, the intricate prompt engineering within the LangChain service, and the React frontend.
*   **Chapter 5 (System Testing):** Explains the novel behavioral bucketing approach used to validate patches, including the underlying scripts (`schemathesis-compare.js`) and how verdicts are calculated.
*   **Chapter 6 (Conclusion and Future Work):** Summarizes the project's achievements and outlines potential avenues for future enhancements.

---

# Chapter 2: Background

This chapter provides the theoretical foundation necessary to understand the mechanisms underlying WebPatcher. It explores the current state of web application security, the mechanics of dynamic scanning, the capabilities of Large Language Models, and the principles of behavioral testing.

## 2.1 Web Application Security and the OWASP Top 10

Web applications are exposed to the public internet, making them highly susceptible to attacks. The Open Web Application Security Project (OWASP) regularly publishes the OWASP Top 10, a standard awareness document representing a broad consensus on the most critical security risks to web applications. 

Vulnerabilities such as Broken Access Control, Cryptographic Failures, and Injection flaws remain prevalent. Injection flaws, for instance, occur when untrusted data is sent to an interpreter as part of a command or query. The attacker's hostile data can trick the interpreter into executing unintended commands. Securing these flaws typically requires context-specific parameterization or input validation, tasks that are highly dependent on the programming language and framework used by the application.

## 2.2 Dynamic Application Security Testing (DAST)

Application security testing generally falls into two primary categories: Static Application Security Testing (SAST) and Dynamic Application Security Testing (DAST). 

While SAST analyzes source code from the inside out without executing it, DAST operates from the outside in. A DAST tool, such as the Zed Attack Proxy (ZAP), interacts with a running web application, crawling its endpoints and injecting malicious payloads to observe the application's responses. 

**Advantages of DAST:**
*   **Language Agnostic:** DAST tools interact via HTTP, meaning they can scan applications regardless of the underlying backend language (Java, Python, Node.js).
*   **Lower False Positives:** Because DAST verifies a vulnerability by actually exploiting it and observing the HTTP response, its findings are highly actionable and less prone to the theoretical false positives common in SAST.
*   **Runtime Environment:** DAST tests the application in its deployed state, uncovering misconfigurations in web servers (e.g., missing security headers) that SAST cannot detect.

WebPatcher utilizes ZAP as its primary discovery engine because the HTTP evidence provided by DAST forms a highly explicit basis for generating patches.

## 2.3 Large Language Models in Software Engineering

Large Language Models (LLMs), built upon the transformer architecture, have revolutionized natural language processing and, increasingly, software engineering. Models trained on massive corpora of source code (like OpenAI's GPT-4 or Anthropic's Claude) possess a profound understanding of programming syntax, semantics, and common vulnerabilities.

In the context of WebPatcher, we utilize the **LangChain** framework. LangChain provides an abstraction layer over LLMs, allowing developers to construct complex, multi-step chains of prompts. 

**Prompt Engineering for Security:**
Generating secure code is not trivial. An LLM must be precisely guided to prevent it from outputting generic advice or introducing new bugs. WebPatcher employs rigorous prompt engineering strategies:
*   **Role-Playing:** The LLM is instructed to act as a "Senior Application Security Engineer."
*   **Structured Output:** Using LangChain's structured output capabilities (via Zod schemas), the LLM is forced to return strict JSON containing specific fields: reasoning, vulnerable code example, root cause, and the suggested fix.
*   **Context Injection:** The prompt dynamically injects the target's tech stack (e.g., "Node.js, Express, MongoDB") so the LLM outputs relevant code (e.g., Mongoose parameterization) rather than generic SQL fixes.

## 2.4 Behavioral Verification and Fuzzing

A significant hurdle in automated code modification is ensuring the modification does not break the application's business logic. Traditional unit tests may not cover the modified code, and running a full integration suite might not be feasible.

To solve this, WebPatcher introduces a technique based on **API Fuzzing and Behavioral Bucketing**. Utilizing **Schemathesis**, a modern API testing tool that generates randomized requests based on OpenAPI specifications, we simulate extensive user traffic.

However, raw fuzzing data is extremely noisy. Because Schemathesis generates randomized UUIDs and strings, a direct byte-for-byte comparison of HTTP responses before and after a patch will always show differences. WebPatcher's innovation lies in categorizing these responses into semantic "buckets" (e.g., `validation:name_required` vs `success:200`) to evaluate the true behavioral shift caused by the patch.

---

# Chapter 3: Proposed System

This chapter outlines the high-level architecture and component interactions of the WebPatcher system.

## 3.1 System Architecture

WebPatcher is designed as a modular, service-oriented architecture (SOA) to ensure scalability and separation of concerns. The system is bifurcated into a Node.js API backend and a specialized LangChain patch generation service.

**1. Frontend Application (Vite + React):**
The user interface where security engineers initiate scans, define target URLs, configure authentication parameters, and review the resulting vulnerability reports. It features real-time progress indicators powered by WebSockets.

**2. Core API Backend (Express.js + MongoDB):**
This acts as the central orchestrator. It manages:
*   User authentication and session management (with strict CSRF protection).
*   Storage of `ScanJob` metadata in MongoDB.
*   Orchestration of the OWASP ZAP daemon to initiate active scans.
*   Communication via Socket.io to push real-time events to the frontend.

**3. Patch Generation Service (LangChain + TypeScript):**
A dedicated microservice running on a separate port. It exposes REST endpoints (e.g., `/generate-patches`) that receive normalized ZAP findings from the core backend. It handles prompt construction, token estimation, rate-limiting, LLM API communication, and JSON parsing.

## 3.2 Component Workflows

The lifecycle of a single scan job within WebPatcher follows a strict, state-managed workflow:

1.  **Initialization (`queued`):** The user defines a target URL and technology stack context in the frontend. The backend creates a `ScanJob` document in MongoDB.
2.  **Vulnerability Scanning (`running`):** The backend initiates a ZAP scan. ZAP spiders the application and performs active attacks. Progress is streamed to the user via Socket.io.
3.  **Analysis and Normalization (`analyzing`):** Once ZAP finishes, the backend retrieves the alerts. The findings are passed through the `ZapFindingAdapter` to normalize differing scanner outputs into a standardized internal format.
4.  **Patch Generation (`patching`):** The core backend sends the normalized findings to the LangChain microservice. The LLM processes each vulnerability sequentially (respecting rate limits) and generates specific source code patches.
5.  **Behavioral Validation (`validating`):** (Optional workflow branch). If the target provides an OpenAPI spec, Schemathesis runs against the target to gather a pre-patch behavioral baseline.
6.  **Completion (`completed`):** The user is presented with a dashboard detailing the vulnerabilities, the LLM's reasoning, and a side-by-side view of the suggested patch.

## 3.3 Database Design and Data Flow

WebPatcher utilizes MongoDB for flexible, document-based storage. The primary entity is the `ScanJob`.

**ScanJob Schema Details:**
*   `targetUrl`: The primary URL being scanned.
*   `context`: An embedded document storing arrays of the technology stack (`db`, `lang`, `fw`, `os`) which is crucial for LLM context injection.
*   `authConfig`: Handles complex login scenarios for authenticated scans (login URLs, username/password fields, logged-in indicators).
*   `status`: An enum tracking the job state (`queued`, `running`, `patching`, `completed`).
*   `schemathesis`: Stores metadata about the behavioral fuzzing runs, including exit codes and report paths.

This comprehensive schema ensures that the backend can entirely reconstruct the context of a scan for subsequent LLM patching operations.

---

# Chapter 4: System Implementation

This chapter delves into the specific implementation details of the WebPatcher system, highlighting critical code structures and algorithms.

## 4.1 Backend API Implementation (Express.js)

The core backend is implemented in `backend/server.js`. Security and reliability are paramount.

**Security Middleware:**
WebPatcher implements strict session management using `express-session` backed by `connect-mongo`. To prevent Cross-Site Request Forgery (CSRF), the system employs the `doubleCsrf` library. A secure token is generated and passed to the frontend, which must be included in subsequent state-mutating requests.

**Real-time Communication:**
To prevent the frontend from relying on inefficient HTTP polling during lengthy ZAP scans (which can take minutes to hours), the backend wraps the Express app in an HTTP server and attaches `Socket.io`. 
*   Events like `scan_progress`, `patch_generated`, and `scan_completed` are emitted directly to the specific user's socket room based on their session ID.

## 4.2 Patch Generation Service (LangChain)

The intellectual core of WebPatcher resides in `langchain/src/services/PatchGenerator.ts`. This service is responsible for transforming raw HTTP security alerts into actionable code.

### 4.2.1 Prompt Engineering and Architecture

The `PatchGenerator` class initializes specialized `ChatPromptTemplate` instances based on the severity of the vulnerability. High and Medium severity vulnerabilities utilize an extensive system prompt:

*   **Role Definition:** `Act as a Senior Application Security Engineer and Secure Code Reviewer.`
*   **Strict Formatting:** The LLM is forced to return JSON containing exact fields: `reasoning`, `vulnerable_code_example`, `analysis`, `root_cause`, `suggested_fix`, and `file_type`. This strict schema ensures the frontend can parse and display the data predictably.
*   **Negative Constraints:** The prompt heavily utilizes negative constraints to prevent hallucinations: `DO NOT give generic advice.`, `Do NOT use pseudo-code.`, `Output ONLY raw JSON. No markdown.`

### 4.2.2 Context Management and Token Handling

LLMs have strict context window limits (token limits). The `PatchGenerator` employs a `TokenEstimator` utility to calculate the size of the incoming ZAP alert. 
*   If the alert description and HTTP evidence exceed `MAX_PROMPT_TOKENS`, the service intelligently truncates the description while preserving the critical HTTP evidence, ensuring the LLM request does not fail.
*   The `RequestBudget` class ensures that the system respects external LLM API rate limits, implementing automatic cooldown periods between sequential patch generation requests.

### 4.2.3 Full File Remediation

In addition to snippet generation, the service implements a `patchFile` method. This method takes an entire source code file and rewrites it to fix vulnerabilities while explicitly instructed to: `STRICTLY preserving the original behavior... DO NOT change the application's logic, flow, or functionality except to secure it.`

## 4.3 Frontend Interface (React & Vite)

The frontend is a single-page application (SPA) built with React and bundled via Vite for rapid development. 

*   **State Management:** Complex scan states are managed using React Context and custom hooks that interface with the backend REST APIs and listen to Socket.io events.
*   **Diff Viewing:** The UI employs code diffing libraries to present the `vulnerable_code_example` alongside the `suggested_fix` in a unified, visually intuitive interface, allowing security engineers to quickly assess the validity of the LLM's recommendation.

---

# Chapter 5: System Testing

Ensuring the reliability of an automated patching system is critical; a patch that breaks the application is often worse than the vulnerability itself.

## 5.1 Testing Strategy Overview

WebPatcher moves beyond traditional unit testing by implementing an advanced Behavioral Verification engine. Traditional diffing of HTTP traffic is inherently noisy. When a fuzzer hits an endpoint with random strings, the server will respond with varying validation errors or dynamic content. A direct text comparison of pre-patch and post-patch HAR (HTTP Archive) files will yield 100% variance.

## 5.2 Behavioral Bucketing with Schemathesis

To solve the noise problem, WebPatcher implements **Behavioral Bucketing**. Located in `backend/scripts/`, the system utilizes three specialized scripts:

1.  **`normalize.jq` (Beginner Level):** A rapid command-line JSON processor that extracts only the core behavioral indicators from a massive HAR file: the HTTP method, the path, the status code, and a generalized response category.
2.  **`summarize.jq` (Beginner Level):** Aggregates the normalized data to show statistical counts per endpoint.
3.  **`schemathesis-compare.js` (Advanced Level):** A robust Node.js engine that parses the pre-patch and post-patch HAR files. It performs deep cross-tabulation analysis. 

**The Bucketing Logic:**
Instead of tracking that the `name` field was 1000 characters long, the engine classifies the input as `name_too_long`. Instead of tracking the exact `400 Bad Request` JSON string, it classifies the response as `validation:name_required`. 

By tracking these buckets, the engine can state: *"In the pre-patch run, 47 `valid_object` inputs resulted in `success`. In the post-patch run, only 8 resulted in `success`."* This indicates a severe regression.

## 5.3 Evaluation Metrics and Verdicts

The `schemathesis-compare.js` script outputs absolute counts, percentage shifts, and calculates a final verdict for every API endpoint:

*   🟢 **`NEW_ENDPOINT`** / 🔴 **`MISSING_ENDPOINT`**: Indicates structural changes to the API surface.
*   🔴 **`BEHAVIORAL_CHANGE`**: Indicates that distributions shifted heavily (e.g., > 5% shift, or entirely new error buckets appeared). This signifies that the LLM patch fundamentally altered the application's business logic and requires human intervention.
*   🟡 **`MINOR_SHIFT`**: Borderline statistical changes, flagged for review.
*   ⚪ **`FUZZING_NOISE`**: Minor fluctuations ignored by the system.
*   ✅ **`IDENTICAL`**: The holy grail. The patch was applied, the vulnerability is (theoretically) closed, and the application behaves exactly as it did before from a business logic perspective.

---

# Chapter 6: Conclusion and Future Work

## 6.1 Conclusion

The WebPatcher project successfully demonstrates a highly automated, end-to-end workflow for web application vulnerability remediation. By seamlessly integrating the comprehensive discovery capabilities of OWASP ZAP with the semantic reasoning power of Large Language Models via LangChain, WebPatcher provides developers with immediate, actionable, and context-aware source code patches.

Furthermore, the introduction of Behavioral Bucketing via Schemathesis solves a critical challenge in automated code modification, providing mathematical confidence that security patches do not introduce functional regressions. WebPatcher effectively bridges the historically fragmented gap between security auditing and software development, paving the way for truly autonomous DevSecOps pipelines.

## 6.2 Future Work

While WebPatcher presents a robust foundation, several avenues exist for future enhancement:

1.  **Multi-Scanner Orchestration:** Extending the adapter architecture to support Static Application Security Testing (SAST) and Interactive Application Security Testing (IAST) tools alongside ZAP, providing the LLM with a holistic view of the vulnerability.
2.  **Automated Version Control Integration:** Implementing secure OAuth flows to automatically commit validated patches to GitHub or GitLab repositories, generating detailed Pull Requests without user intervention.
3.  **Abstract Syntax Tree (AST) Context:** Enhancing the LangChain prompt by providing the LLM not just with raw text, but with AST representations of the target repository, allowing for highly complex, multi-file architectural refactoring.
4.  **Feedback Loops:** Implementing a mechanism where developers can correct the LLM's patches, feeding this data back into the system to fine-tune the prompt engineering over time.

---

# TOOLS

The development and execution of WebPatcher relied heavily on the following modern software tools and frameworks:

*   **Backend & API Orchestration:**
    *   **Node.js & Express.js:** For high-performance, asynchronous REST API development.
    *   **MongoDB & Mongoose:** For flexible document storage of complex scan configurations and results.
    *   **Socket.io:** For real-time, bidirectional event streaming to the frontend.

*   **Frontend Interface:**
    *   **React.js:** For building a dynamic, component-driven user interface.
    *   **Vite:** For rapid module bundling and hot-module replacement during development.

*   **Artificial Intelligence & Security:**
    *   **LangChain:** For orchestrating complex LLM prompts, enforcing structured JSON outputs, and managing API context windows.
    *   **OWASP ZAP (Zed Attack Proxy):** The core DAST engine used for active vulnerability discovery and spidering.
    *   **Schemathesis:** Utilized for property-based API testing and generating the behavioral baselines necessary for patch validation.
    *   **jq:** For high-speed command-line JSON normalization and parsing of massive HAR files.

---

# REFERENCES

[1] OWASP Foundation, "OWASP Top Ten Web Application Security Risks," https://owasp.org/www-project-top-ten/, Last Retrieved on 30/06/2026.

[2] LangChain Documentation, "Building Applications with LLMs," https://js.langchain.com/, Last Retrieved on 30/06/2026.

[3] Schemathesis, "Property-based testing for API schemas," https://schemathesis.readthedocs.io/, Last Retrieved on 30/06/2026.

[4] Mozgovoy, M., & Ponomarev, A. "Modern Approaches to Automated Vulnerability Remediation using Large Language Models," Journal of Cybersecurity, Vol 12, 2024. *(Example Placeholder)*

[5] [Student to add further relevant academic papers regarding LLMs in code generation, AST parsing, and Web Security]
