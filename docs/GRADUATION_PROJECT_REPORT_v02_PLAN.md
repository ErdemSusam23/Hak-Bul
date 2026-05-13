# Hak-Bul Graduation Report v02 Expansion Plan

## Objective

Update `docs/HakBul_Bitirme_Raporu.docx` from a Turkish 20-page graduation report into an English academic-style report of at least 60 pages. The expanded report must use numbered in-text citations such as `[1]` and include every cited source in the References section.

This plan does not modify the Word report. It defines the structure, source material, citation strategy, and expansion targets for the next implementation step.

## Working Method

1. Use `docs/GRADUATION_PROJECT_REPORT_v01.md` as the editable source of the current report.
2. Translate and rewrite the content in academic English rather than directly word-for-word translating it.
3. Expand weak sections using project documentation and code-level facts from the repository.
4. Add figures, tables, and appendices to support the 60-page target.
5. Generate a new `.docx` only after the Markdown version is reviewed.

## Target Report Structure

| Section | Target Pages | Main Content |
|---|---:|---|
| Front matter | 4-5 | Cover, approval page, acknowledgements, abstract, keywords, TOC, list of figures/tables |
| Chapter 1: Introduction | 4-5 | Problem, motivation, objectives, scope, contributions, organization |
| Chapter 2: Background and Related Work | 8-10 | LegalTech, access to justice, LLMs, hallucination, RAG, vector databases, legal NLP |
| Chapter 3: Requirements Analysis | 4-5 | Stakeholders, user roles, functional/non-functional requirements, use cases |
| Chapter 4: System Architecture | 6-7 | High-level architecture, Docker services, request lifecycle, SSE streaming |
| Chapter 5: Data Layer and Database Design | 6-8 | Relational schema, migrations, ER model, Qdrant, local fallback corpus |
| Chapter 6: RAG Pipeline Design | 8-10 | Categorization, rewrite, retrieval, reranking, filtering, source handling, generation |
| Chapter 7: Backend Implementation | 6-7 | FastAPI modules, routers, auth, chat, feedback, forum, admin, documents, templates |
| Chapter 8: Frontend Implementation | 5-6 | React/Vite structure, pages, components, chat UX, forum, admin, document flows |
| Chapter 9: Security, Ethics, and Legal Boundaries | 3-4 | JWT, refresh rotation, cookies, RBAC, legal disclaimer, professional referral |
| Chapter 10: Testing and Evaluation | 7-9 | Unit tests, API tests, retrieval tests, 100-question system test, limitations |
| Chapter 11: Results and Discussion | 4-5 | Achievements, retrieval observations, reliability, usability, limitations |
| Chapter 12: Conclusion and Future Work | 3-4 | Summary, future deployment, monitoring, corpus growth, RAGAS, citation verification |
| References and Appendices | 6-8 | References, endpoint table, DB schema table, env vars, sample RAG response, screenshots |

## Repository Sources to Use

| Source | Use in Report |
|---|---|
| `README.md` | Project overview, features, setup, migration chain, test commands |
| `docs/reference/api.md` | API endpoint tables, rate limits, request/response behavior |
| `docs/reference/database.md` | Relational schema, migrations, Qdrant/local corpus details |
| `docs/reference/rag-pipeline.md` | RAG pipeline steps, `/ask`, `/ask/stream`, fallback behavior |
| `docs/reference/tech-spec.md` | Requirements, architecture decisions, constraints |
| `docs/reference/frontend-tema-tipografi.md` | Frontend theme, typography, UI conventions |
| `docs/tests/SYSTEM_TEST_100_QUESTIONS_REPORT.md` | System test findings and limitations |
| `docs/audits/AUDIT_SUMMARY.md` | Test, database, Qdrant, and service audit evidence |
| `backend/models/*.py` | Database table fields and relationships |
| `backend/alembic/versions/*.py` | Migration chain and schema evolution |
| `backend/rag/*.py` | RAG implementation details |
| `backend/routers/*.py` | Backend API module organization |
| `frontend/src/` | Page/component structure and user workflows |

## Figures and Tables to Add

| Item | Target Section |
|---|---|
| Figure 1: Overall system architecture | Chapter 4 |
| Figure 2: Request-response lifecycle for `/ask` | Chapter 4 |
| Figure 3: SSE streaming sequence | Chapter 4 or 6 |
| Figure 4: RAG pipeline flow | Chapter 6 |
| Figure 5: Database ER diagram | Chapter 5 |
| Figure 6: Qdrant vector retrieval model | Chapter 5 or 6 |
| Table 1: Functional requirements | Chapter 3 |
| Table 2: Non-functional requirements | Chapter 3 |
| Table 3: User roles and permissions | Chapter 3 or 9 |
| Table 4: Alembic migration chain | Chapter 5 |
| Table 5: Relational database tables | Chapter 5 |
| Table 6: API endpoint groups | Chapter 7 or Appendix |
| Table 7: RAG configuration parameters | Chapter 6 |
| Table 8: Test categories and coverage | Chapter 10 |
| Table 9: Known limitations and mitigation plans | Chapter 11 |

## Citation Strategy

Use numbered citations in the text. Every source in References must be cited at least once, and every citation must map to a reference entry.

Example:

> Retrieval-Augmented Generation grounds generated answers in externally retrieved documents, which reduces the risk of unsupported model outputs in knowledge-intensive tasks [9].

## Initial Reference Pool

1. FastAPI Documentation. *FastAPI: Modern, fast web framework for building APIs with Python*. https://fastapi.tiangolo.com/
2. React Documentation. *React*. https://react.dev/
3. Vite Documentation. *Vite*. https://vite.dev/
4. PostgreSQL Documentation. *PostgreSQL*. https://www.postgresql.org/docs/
5. SQLAlchemy Documentation. *SQLAlchemy ORM*. https://docs.sqlalchemy.org/
6. Alembic Documentation. *Alembic Database Migrations*. https://alembic.sqlalchemy.org/
7. Qdrant Documentation. *Qdrant Vector Database*. https://qdrant.tech/documentation/
8. Docker Documentation. *Docker Docs*. https://docs.docker.com/
9. P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," NeurIPS, 2020.
10. A. Vaswani et al., "Attention Is All You Need," NeurIPS, 2017.
11. S. Es, J. James, L. Espinosa-Anke, and S. Schockaert, "RAGAS: Automated Evaluation of Retrieval Augmented Generation," EACL System Demonstrations, 2024.
12. Meta. *Llama model documentation / model cards*. https://www.llama.com/
13. Groq Documentation. *Groq API Documentation*. https://console.groq.com/docs/
14. Sentence Transformers Documentation. *Sentence Transformers*. https://www.sbert.net/
15. Microsoft. *Server-Sent Events reference / EventSource API*. https://developer.mozilla.org/en-US/docs/Web/API/EventSource/
16. IETF RFC 7519. *JSON Web Token (JWT)*. https://www.rfc-editor.org/rfc/rfc7519
17. OWASP. *Authentication and Session Management Guidance*. https://owasp.org/
18. T.C. Cumhurbaşkanlığı. *Mevzuat Bilgi Sistemi*. https://www.mevzuat.gov.tr/
19. Yargıtay Başkanlığı. *Yargıtay Karar Arama*. https://karararama.yargitay.gov.tr/
20. Hak-Bul Project. `docs/reference/api.md`.
21. Hak-Bul Project. `docs/reference/database.md`.
22. Hak-Bul Project. `docs/reference/rag-pipeline.md`.
23. Hak-Bul Project. `docs/reference/tech-spec.md`.

## Section-Level Expansion Notes

### Chapter 1: Introduction

Rewrite the current introduction in English and add a stronger academic framing: access to legal information, legal complexity, and the motivation for a source-grounded assistant. Add a "Contributions" subsection that clearly lists the implemented system outputs.

### Chapter 2: Background and Related Work

Expand heavily. This chapter should carry the largest number of external academic citations. Explain LLMs, transformer architecture, hallucination risk, RAG, vector search, and the special challenges of Turkish legal text.

### Chapter 3: Requirements Analysis

Use `docs/reference/tech-spec.md` and current features. Add functional requirements such as legal question answering, guest chat, authenticated chat, PDF analysis, forum, admin analytics, and document templates. Add non-functional requirements such as reliability, traceability, security, usability, maintainability, and deployability.

### Chapter 4: System Architecture

Use README, Docker files, and API docs. Describe the React frontend, FastAPI backend, relational database, Qdrant, Groq LLM service, and local retrieval fallback. Add architecture diagrams and request lifecycle explanation.

### Chapter 5: Data Layer and Database Design

Use `docs/reference/database.md`, SQLAlchemy models, and Alembic migrations. Explain each table, field groups, relationships, soft delete, guest ownership model, feedback behavior, forum polymorphic voting, and Qdrant's separate role as vector database.

### Chapter 6: RAG Pipeline Design

Use `docs/reference/rag-pipeline.md` and `backend/rag/`. Explain each pipeline stage in detail. Include how source metadata becomes answer citations, how fallback works, and why Qdrant is used separately from relational storage.

### Chapter 7: Backend Implementation

Use `backend/routers`, `backend/services`, and `docs/reference/api.md`. Present endpoint groups by responsibility. Avoid dumping code; explain design decisions and module responsibilities.

### Chapter 8: Frontend Implementation

Use `frontend/src/` and frontend reference docs. Explain page-level structure, shared components, chat streaming UI, route handling, guest persistence, document workflows, and theme system.

### Chapter 9: Security, Ethics, and Legal Boundaries

Use auth implementation and OWASP/JWT references. Explain access token expiry, refresh token rotation, password hashing, cookie flags, RBAC, legal disclaimers, and professional referral for critical legal cases.

### Chapter 10: Testing and Evaluation

Use `backend/tests`, `docs/tests`, and audit summaries. Separate unit tests, API tests, regression tests, retrieval tests, and system tests. Discuss limitations honestly, including upstream API failures, rate limits, and retrieval quality risks.

### Chapter 11: Results and Discussion

Summarize implemented outcomes and evaluate the system against project objectives. Discuss what worked, what remains limited, and what the test evidence implies.

### Chapter 12: Conclusion and Future Work

Keep concise but academically framed. Future work should include production deployment, monitoring, retrieval evaluation with RAGAS, larger legal corpus, improved reranking, citation verification, and lawyer verification workflows.

## Implementation Deliverables

The next implementation step should produce:

1. `docs/GRADUATION_PROJECT_REPORT_v02.md`
2. An English academic report draft with numbered citations.
3. Expanded references section.
4. Placeholder markers for figures/screenshots where image insertion is needed.
5. A final conversion path to `docs/HakBul_Graduation_Report_v02.docx`.

