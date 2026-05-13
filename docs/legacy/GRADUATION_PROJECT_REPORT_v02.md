# OSTIM TECHNICAL UNIVERSITY FACULTY OF ENGINEERING
## GRADUATION PROJECT REPORT

**Hak-Bul: An AI-Assisted Legal Information Web Application for Turkish Law**

| | |
|---|---|
| **Students** | Erdem Susam - 210201014 |
| | Mustafa Sahin - 210201025 |
| | Omer Faruk Gunes - 210201027 |
| | Yagiz Han Aslan - 210208002 |
| **Department** | Computer Engineering |
| **Project Advisor** | Dr. Nergiz Khankishiyeva Hati |
| **Course** | MFBP 402 Graduation Project |
| **Project Start Date** | 2 February 2026 |
| **Report Submission Date** | 18 May 2026 |

---

## Acknowledgements

We would like to express our sincere gratitude to our project advisor, Dr. Nergiz Khankishiyeva Hati, for her guidance, technical feedback, and academic support throughout the development of this project. Her comments helped us improve both the software implementation and the quality of the project documentation.

We also thank the academic and administrative staff of the Department of Computer Engineering at OSTIM Technical University for providing the educational environment in which this work was developed.

Finally, we thank our classmates, friends, and families for their feedback, patience, and support during the project period.

---

## Abstract

Access to legal information remains a practical challenge for many citizens in Turkey. Legal rules are distributed across statutes, regulations, court decisions, and procedural practices, and understanding these sources often requires professional legal expertise. At the same time, recent progress in large language models (LLMs) has created new opportunities for natural language interfaces that can support legal information retrieval. However, direct use of LLMs in legal contexts is risky because generated answers may contain unsupported claims, incomplete references, or hallucinated legal statements. For this reason, legal information systems require a design that connects generated text to verifiable sources.

This graduation project presents **Hak-Bul**, a web-based legal information assistant for Turkish law. The system accepts natural-language legal questions in Turkish and produces source-supported answers using a Retrieval-Augmented Generation (RAG) architecture. The application combines a React 19 and Vite frontend, a FastAPI backend, a relational database layer, Qdrant vector retrieval, and Groq-hosted Llama models. Legal source chunks are retrieved from Qdrant using multilingual sentence embeddings, filtered and summarized, and then supplied to the answer-generation model. The system supports authenticated and guest users, chat history, Server-Sent Events (SSE) streaming, PDF document analysis, document comparison, legal document templates, a community forum, user feedback, and an admin analytics interface.

The implementation uses SQLAlchemy and Alembic for schema management, JWT access tokens and refresh token rotation for authentication, HttpOnly cookies for refresh and guest-session flows, and Docker Compose for reproducible local execution. The current relational schema includes users, refresh tokens, chat history, message feedback, weak queries, shared conversations, forum threads, forum replies, and forum votes. Qdrant is used separately as a vector database for legal retrieval and is not treated as the primary relational application database.

The system was evaluated through backend automated tests, API-level behavior checks, retrieval-oriented test sets, and a 100-question system test report. The results show that the project successfully implements a working legal information assistant with traceable sources, but also reveal limitations related to retrieval quality, upstream LLM availability, rate limits, and the need for more formal evaluation with legal experts. Future work includes production deployment, monitoring, larger legal corpora, stronger reranking, citation verification, and RAGAS-style evaluation.

**Keywords:** LegalTech, Turkish law, retrieval-augmented generation, large language models, Qdrant, FastAPI, React, legal information retrieval.

---

## Table of Contents

1. [Introduction](#chapter-1-introduction)
2. [Background and Related Work](#chapter-2-background-and-related-work)
3. [Requirements Analysis](#chapter-3-requirements-analysis)
4. [System Architecture](#chapter-4-system-architecture)
5. [Data Layer and Database Design](#chapter-5-data-layer-and-database-design)
6. [RAG Pipeline Design](#chapter-6-rag-pipeline-design)
7. [Backend Implementation](#chapter-7-backend-implementation)
8. [Frontend Implementation](#chapter-8-frontend-implementation)
9. [Security, Ethics, and Legal Boundaries](#chapter-9-security-ethics-and-legal-boundaries)
10. [Testing and Evaluation](#chapter-10-testing-and-evaluation)
11. [Results and Discussion](#chapter-11-results-and-discussion)
12. [Conclusion and Future Work](#chapter-12-conclusion-and-future-work)
13. [References](#references)
14. [Appendices](#appendices)

---

## List of Figures

| Figure | Title | Location |
|---|---|---|
| Figure 1 | Overall System Architecture | Chapter 4 |
| Figure 2 | Request Lifecycle for Legal Question Answering | Chapter 4 |
| Figure 3 | Server-Sent Events Streaming Sequence | Chapter 4 |
| Figure 4 | RAG Pipeline Flow | Chapter 6 |
| Figure 5 | Relational Database ER Diagram | Chapter 5 |
| Figure 6 | Qdrant Retrieval Model | Chapter 5 |

## List of Tables

| Table | Title | Location |
|---|---|---|
| Table 1 | Functional Requirements | Chapter 3 |
| Table 2 | Non-Functional Requirements | Chapter 3 |
| Table 3 | User Roles and Permissions | Chapter 3 |
| Table 4 | Alembic Migration Chain | Chapter 5 |
| Table 5 | Relational Database Tables | Chapter 5 |
| Table 6 | API Endpoint Groups | Chapter 7 |
| Table 7 | RAG Configuration Parameters | Chapter 6 |
| Table 8 | Test Categories and Evidence | Chapter 10 |
| Table 9 | Limitations and Mitigation Plans | Chapter 11 |

---

## Chapter 1: Introduction

### 1.1 Problem Definition

Legal information is publicly available in Turkey through official legislation portals and court decision systems, but availability does not automatically mean accessibility. A citizen who wants to understand severance pay, eviction, consumer rights, criminal procedure, inheritance, or administrative remedies must often search across laws, amendments, procedural rules, and court interpretations. These sources are written in technical language and are difficult to interpret without legal training.

The problem addressed by this project is the gap between the existence of legal information and the ability of ordinary users to locate, understand, and verify it. The objective is not to replace a lawyer or provide binding legal advice. Instead, the goal is to build a software system that helps users ask legal questions in everyday Turkish and receive structured, source-supported legal information with appropriate limitations and warnings.

### 1.2 Motivation

The motivation for Hak-Bul comes from three observations. First, legal information is fragmented across statutes, regulations, and court decisions. Second, citizens increasingly expect digital tools to provide fast access to domain-specific knowledge. Third, LLMs can produce fluent natural language answers but are not reliable enough for legal contexts unless their outputs are grounded in verifiable sources. Retrieval-Augmented Generation addresses this issue by combining document retrieval with language generation [9].

In a legal information assistant, the generated answer must not be treated as a standalone model opinion. It should be linked to retrieved sources such as law articles, official legislation pages, or court decisions. Therefore, Hak-Bul was designed around a RAG pipeline rather than a direct prompt-only chatbot.

### 1.3 Project Objectives

The main objectives of the project are:

- To implement a Turkish legal question-answering web application.
- To retrieve relevant Turkish legal sources before answer generation.
- To classify legal questions into domain categories such as labor law, criminal law, consumer law, tax law, and general law.
- To provide source summaries and legal references in answers.
- To support both registered users and guest users.
- To store conversation history and feedback for later review.
- To provide complementary tools such as PDF analysis, document comparison, legal document templates, a forum, and admin analytics.
- To implement authentication, authorization, and session management using established web security practices [16], [17].
- To evaluate the system through automated tests and scenario-based system tests.

### 1.4 Project Scope

The implemented application includes a FastAPI backend, a React 19 and Vite frontend, a relational database layer, Qdrant vector retrieval, Groq-based LLM calls, and Docker Compose orchestration. The relational database stores application state such as users, tokens, chats, feedback, forum data, and shared conversations. Qdrant stores legal chunks and embeddings for semantic retrieval. This separation allows the system to handle user workflows and legal knowledge retrieval through different storage models [7], [21]. The project scope and out-of-scope items follow the internal technical specification prepared during development [23].

The current project scope includes functional implementation and software-level testing. It does not claim to provide official legal advice. It also does not include mobile applications, offline operation, fine-tuned local models, or a fully deployed production environment.

### 1.5 Contributions

This project makes the following engineering contributions:

1. A working RAG-based legal information assistant for Turkish legal questions.
2. A modular FastAPI backend with routers for chat, authentication, documents, templates, forum, feedback, and admin functions.
3. A React-based user interface with chat streaming, guest mode, forum pages, document workflows, and admin screens.
4. A relational schema managed by Alembic migrations for user and application data.
5. A Qdrant-based vector retrieval layer for legal chunks and source metadata.
6. A fallback local retrieval corpus for cases where Qdrant is unavailable.
7. Automated tests and system-level evaluation artifacts.

### 1.6 Report Organization

The rest of this report is organized as follows. Chapter 2 introduces the theoretical and technical background. Chapter 3 defines requirements. Chapter 4 explains the system architecture. Chapter 5 describes the data layer. Chapter 6 details the RAG pipeline. Chapters 7 and 8 discuss backend and frontend implementation. Chapter 9 covers security, ethics, and legal boundaries. Chapter 10 presents testing and evaluation. Chapter 11 discusses results and limitations. Chapter 12 concludes the report and outlines future work.

---

## Chapter 2: Background and Related Work

### 2.1 LegalTech and Access to Legal Information

LegalTech refers to the use of software systems to support legal research, document automation, dispute resolution, legal practice management, and access to legal information. In this project, LegalTech is used in the narrower sense of citizen-facing legal information support. Hak-Bul is intended to help users understand legal sources and general legal concepts, not to represent users or produce binding legal advice.

The access-to-justice motivation is especially relevant for citizens who cannot easily consult a lawyer for every legal uncertainty. A system that can guide users to relevant legal texts, explain general legal processes, and recommend professional help for critical issues can reduce the initial barrier to understanding legal problems. However, this must be balanced with clear ethical limits because legal interpretation can affect rights, obligations, deadlines, and legal strategy.

### 2.2 Large Language Models

Large Language Models are neural language models trained on large text corpora. Modern LLMs are commonly based on the Transformer architecture, which introduced self-attention as a mechanism for modeling long-range dependencies in sequences [10]. LLMs can generate fluent text, summarize documents, translate language, and answer questions. In Hak-Bul, LLMs are accessed through Groq-hosted Llama models for query rewriting and answer generation [12], [13].

The main advantage of LLMs in this project is natural language interaction. Users can ask questions in everyday language instead of writing database queries or searching exact law names. The main risk is that fluent output can appear authoritative even when it is unsupported. This is especially problematic in legal domains. Therefore, Hak-Bul does not use the LLM as the only knowledge source; it retrieves legal context first and then asks the model to generate an answer using that context.

### 2.3 Hallucination and Reliability Risk

In legal applications, hallucination is not merely a technical defect. A wrong article number, nonexistent legal remedy, or inaccurate deadline can mislead a user. For this reason, the system must be designed to reduce unsupported generation. Hak-Bul addresses this risk by using source retrieval, source summaries, category filtering, score thresholds, and warning messages. Nevertheless, these methods reduce risk rather than eliminate it. The final report should make this limitation explicit.

### 2.4 Retrieval-Augmented Generation

Retrieval-Augmented Generation combines an information retrieval component with a generative model. Instead of asking an LLM to answer from its internal parameters alone, the system first retrieves relevant documents and then supplies them as context for generation [9]. This design is suitable for knowledge-intensive tasks where answers should be grounded in external information.

In Hak-Bul, the retrieved documents are legal chunks from Turkish legislation and court decision data. The pipeline performs query analysis, category detection, query rewriting, vector retrieval, optional reranking, score filtering, source deduplication, and answer generation [22]. This creates a traceable path from user question to retrieved sources and then to generated answer.

### 2.5 Vector Databases

Vector databases store high-dimensional embeddings and support similarity search. In this project, Qdrant is used as the vector database. It stores legal chunks, embedding vectors, and metadata fields such as source type, law name, article number, legal area, year, court chamber, and decision number [7], [21].

Qdrant is not used as the primary application database. User accounts, refresh tokens, conversations, forum data, and feedback are stored in the relational database. Qdrant is used specifically for semantic retrieval. This separation is important because the two systems solve different problems: relational storage handles application state and integrity, while vector storage handles approximate semantic search.

### 2.6 Legal NLP and Turkish Legal Text

Legal natural language processing is difficult because legal language contains specialized terminology, long sentences, references to other provisions, and jurisdiction-specific concepts. Turkish adds additional linguistic complexity because it is morphologically rich. A word can carry several grammatical functions through suffixes, which can affect keyword matching and retrieval quality.

Hak-Bul uses a multilingual embedding model, `intfloat/multilingual-e5-base`, to represent Turkish legal chunks and user queries in vector space [14], [21]. The system also uses a keyword-based categorization layer for legal domains. This hybrid approach combines semantic search with domain heuristics.

### 2.7 Summary

The background literature and technologies show that a legal assistant must be designed as more than a chatbot. It requires retrieval, source traceability, cautious output, user warnings, and evaluation. Hak-Bul follows this direction by combining RAG, Qdrant, FastAPI, React, and a relational application data model.

### 2.8 Comparison with Keyword-Based Legal Search

Traditional legal search systems generally depend on keywords, filters, document titles, and exact phrase matches. These methods are useful when the user already knows the correct legal term, law name, article number, or court decision identifier. However, citizens often describe their legal problems in everyday language rather than formal legal vocabulary. For example, a user may ask "My employer dismissed me without warning, what can I do?" instead of searching for "notice compensation", "severance pay", or a specific article of the Labor Law.

Semantic retrieval is useful in this context because it represents both queries and legal chunks as vectors. The system can retrieve documents that are conceptually related even when the user's wording differs from the legal text. Nevertheless, semantic search also has limitations. It may retrieve semantically similar but legally irrelevant sources. This is why Hak-Bul combines vector retrieval with category detection, category penalty, source filtering, and future reranking support [21], [22].

### 2.9 Why RAG is More Suitable than Fine-Tuning for this Project

An alternative approach would be to fine-tune a language model on Turkish legal data. This project does not follow that path for several reasons. First, fine-tuning requires a high-quality training dataset, careful evaluation, and computational resources. Second, legal information changes over time, and updating a fine-tuned model for every legal amendment is operationally difficult. Third, fine-tuning does not automatically solve citation and source verification.

RAG is more suitable for Hak-Bul because the legal corpus can be updated independently from the LLM. New legal chunks can be embedded and inserted into Qdrant without retraining the generation model. The backend can also retrieve source metadata and display it to the user. This makes RAG a more practical approach for a graduation project that prioritizes source-grounded answers and maintainable engineering.

### 2.10 Evaluation Challenges in Legal RAG

Evaluating a legal RAG system is more difficult than checking whether an API returns HTTP 200. A correct-looking answer may cite the wrong source, omit an exception, or overstate a general rule. Conversely, a retrieved source may be legally relevant but not sufficient to answer the user's specific question. Therefore, evaluation should separate several questions:

- Did the system classify the legal domain correctly?
- Did it retrieve legally relevant sources?
- Did the generated answer stay faithful to those sources?
- Did the answer include appropriate limitations or warnings?
- Did the answer avoid giving individualized legal advice?
- Did the UI present sources clearly enough for user inspection?

Automated tools such as RAGAS can help evaluate faithfulness and context relevance, but legal expert review remains necessary for high-stakes validation [11].

---

## Chapter 3: Requirements Analysis

### 3.1 Stakeholders

The main stakeholders are citizens seeking legal information, registered users who want persistent chat history, guest users who want quick access without registration, lawyers who can participate in verified forum workflows, administrators who monitor system use, and developers who maintain the platform.

### 3.2 User Roles

Hak-Bul supports four practical role categories: guest, registered user, lawyer, and admin. Guest users can ask questions and use some features with a guest session cookie. Registered users can store chat history and manage profile information. Lawyers can perform selected verification or moderation actions in the forum. Admin users can view analytics, manage users, and inspect weak queries.

**Table 1. User Roles and Permissions**

| Role | Main Permissions |
|---|---|
| Guest | Ask legal questions, receive guest session, view guest chat history, submit feedback |
| Registered user | Login, manage profile, save chat history, share conversations, use forum |
| Lawyer | User permissions plus selected forum verification and lock actions |
| Admin | User and lawyer permissions plus analytics, user management, weak-query inspection |

### 3.3 Functional Requirements

**Table 2. Functional Requirements**

| ID | Requirement | Implementation Evidence |
|---|---|---|
| FR-01 | Ask legal questions in Turkish or English | `/ask`, `/ask/stream` [20] |
| FR-02 | Retrieve legal sources before answer generation | RAG pipeline [22] |
| FR-03 | Stream generated answers | SSE endpoint `/ask/stream` [20] |
| FR-04 | Support registered and guest sessions | Auth and guest cookies [20] |
| FR-05 | Store chat history | `chat_history` table [21] |
| FR-06 | Collect message feedback | `message_feedback` table and `/feedback` [20], [21] |
| FR-07 | Analyze PDF documents | `/documents/analyze` [20] |
| FR-08 | Compare two PDF documents | `/documents/compare` [20] |
| FR-09 | Generate legal document templates | `/templates/{id}/generate` [20] |
| FR-10 | Provide forum workflows | Forum endpoints and tables [20], [21] |
| FR-11 | Provide admin analytics | `/admin/stats/*` endpoints [20] |
| FR-12 | Track weak retrieval queries | `weak_queries` table [21] |

### 3.4 Non-Functional Requirements

**Table 3. Non-Functional Requirements**

| ID | Requirement | Design Response |
|---|---|---|
| NFR-01 | Traceability | Answers include source metadata and summaries |
| NFR-02 | Security | JWT, refresh rotation, password hashing, role checks |
| NFR-03 | Maintainability | Modular routers, services, models, migrations |
| NFR-04 | Availability under upstream failure | Local retrieval fallback and mock modes |
| NFR-05 | Usability | Chat UI, streaming, templates, forum, document tools |
| NFR-06 | Deployability | Docker Compose with backend, frontend, database, migration service |
| NFR-07 | Testability | Automated backend and frontend tests |

### 3.5 Use Case Scenarios

In the primary use case, a citizen asks a question such as "Under what conditions can I receive severance pay?" The frontend sends the request to the backend. The backend classifies the question, rewrites it if necessary, retrieves legal chunks, generates an answer, stores the chat pair, and returns sources.

In a second use case, a guest user asks a question without registration. The backend creates or resolves a guest session using an HttpOnly cookie. This allows the user to continue a temporary conversation without an account.

In a third use case, a registered user shares a conversation. The backend creates a URL-safe share token in `shared_conversations`, and public access to the shared conversation is controlled by the active flag.

In a fourth use case, an admin reviews weak queries. These are questions for which retrieval confidence was low. This feature supports later improvement of the legal corpus and retrieval configuration.

### 3.6 Requirements Traceability

The requirements of Hak-Bul are not limited to individual screens or isolated API calls. They connect several layers of the system. For example, the requirement "the user can ask a legal question" requires a frontend input component, an API request helper, request validation, retrieval, LLM generation, source formatting, chat persistence, guest or authenticated ownership resolution, and a response-rendering component. This cross-layer nature is why the project uses separate reference documents for API behavior, database schema, and RAG behavior [20], [21], [22].

Traceability is especially important because legal information systems must be explainable at a practical level. When the system produces an answer, the development team should be able to identify which endpoint accepted the request, which retrieval pipeline stages ran, which sources were returned, how the conversation was stored, and how the frontend displayed the answer. This does not prove legal correctness, but it improves software accountability.

### 3.7 Requirement Prioritization

The highest priority requirements are legal question answering, source retrieval, answer traceability, authentication, guest access, and persistent conversation history. These define the core value of the system. Medium-priority requirements include document analysis, document comparison, legal templates, forum workflows, and admin analytics. These features expand the product beyond the core RAG assistant. Lower-priority or future requirements include production monitoring, large-scale load testing, automated legal citation verification, and formal RAGAS-based evaluation [11].

This prioritization reflects the graduation project context. The system must demonstrate a complete working product, but it must also clearly separate implemented functionality from future production hardening.

### 3.8 Detailed Use Case Table

| Use Case | Primary Actor | Preconditions | Main Flow | Result |
|---|---|---|---|---|
| Ask a legal question | Guest or registered user | User accepts legal warning | User submits question, backend runs RAG, frontend displays answer and sources | Source-supported legal information is shown |
| Continue guest conversation | Guest | Guest cookie exists | User opens guest chat history, selects conversation, asks follow-up question | Conversation continuity without account |
| Register and login | Visitor | Valid email and password | User creates account, logs in, receives access token and refresh cookie | Persistent authenticated session |
| Rename conversation | Registered user | User owns conversation | User edits title, backend updates conversation title field | Conversation list becomes easier to manage |
| Share conversation | Registered user | Conversation exists | Backend creates share token, frontend displays public link | Conversation can be viewed by token |
| Submit feedback | Guest or registered user | Assistant message exists | User clicks positive or negative feedback button | Feedback is stored or updated |
| Analyze PDF | Guest or registered user | Valid PDF uploaded | Backend extracts text, runs document analysis generation | Document summary and legal analysis are returned |
| Compare PDFs | Guest or registered user | Two valid PDFs uploaded | Backend extracts both texts and generates comparison | Differences and legal observations are returned |
| Create forum thread | Registered user | User is authenticated | User submits title, category, and content | Thread appears in forum list |
| Verify forum reply | Lawyer/Admin | Reply exists | Privileged user toggles verification state | Reply is marked as verified or unverified |
| Review weak queries | Admin | Admin is authenticated | Admin opens weak-query list | Low-confidence retrieval cases are inspected |

### 3.9 Acceptance Criteria

The following acceptance criteria were used to reason about whether the implementation satisfies the project goals:

- A user can ask a legal question and receive a structured answer.
- The answer response can include legal sources with titles, summaries, scores, and URLs when available.
- The system can create a guest session without forcing registration.
- A registered user can preserve and retrieve chat history.
- The backend can distinguish user roles for ordinary users, lawyers, and admins.
- Admin-only endpoints reject non-admin users.
- Feedback values are limited to positive or negative ratings.
- Forum votes are constrained so that a user cannot repeatedly vote on the same target.
- Qdrant retrieval can be bypassed by local fallback when configured and necessary.
- The application can be started in a reproducible local environment.

---

## Chapter 4: System Architecture

### 4.1 Overview

Hak-Bul uses a client-server architecture. The frontend is a single-page application built with React 19 and Vite [2], [3]. The backend is implemented with FastAPI [1]. The relational data layer is implemented with SQLAlchemy and Alembic [5], [6]. Qdrant provides vector retrieval [7]. Groq-hosted Llama models provide query rewriting and answer generation [13].

**Figure 1. Overall System Architecture**

```text
User Browser
    |
    v
React + Vite Frontend
    |
    | HTTPS / JSON / SSE
    v
FastAPI Backend
    |              |                 |
    |              |                 |
Relational DB   Qdrant Vector DB   Groq LLM API
PostgreSQL/     legal chunks       rewrite + answer
SQLite          embeddings         generation
```

### 4.2 Docker Compose Architecture

The project is designed to run locally through Docker Compose. The main services are frontend, backend, PostgreSQL, and migration. The migration service applies Alembic migrations and seed operations before backend use. Docker improves reproducibility because developers can start the application stack without manually configuring every dependency [8].

### 4.3 Request Lifecycle

**Figure 2. Request Lifecycle for `/ask`**

```text
User question
  -> frontend request
  -> FastAPI endpoint
  -> upstream/fallback checks
  -> RAG pipeline
  -> chat persistence
  -> JSON response with answer, sources, category, message id
```

The `/ask` endpoint performs a synchronous RAG request and returns a JSON response. The `/ask/stream` endpoint performs retrieval first, emits a metadata event, streams answer tokens, and then emits a completion event [20].

### 4.4 Server-Sent Events Streaming

Server-Sent Events provide a one-way server-to-client streaming mechanism over HTTP. Hak-Bul uses SSE for token-level answer streaming. This improves perceived responsiveness because users see the answer while it is being generated [15].

**Figure 3. SSE Streaming Sequence**

```text
Client -> POST /ask/stream
Server -> event: meta
Server -> event: token
Server -> event: token
Server -> event: done
```

### 4.5 Architectural Separation of Concerns

The architecture separates presentation, application logic, relational persistence, vector retrieval, and LLM generation. This separation makes the system easier to test and maintain. For example, Qdrant can be unavailable while local retrieval fallback continues to support a reduced retrieval mode. Similarly, the relational database remains responsible for application state even when vector search behavior changes.

### 4.6 Deployment View

The development deployment consists of four main runtime responsibilities: frontend serving, backend API execution, relational database persistence, and database migration. In Docker Compose, these responsibilities are represented by separate services. The migration service is intentionally separated from the backend so that schema updates can be applied in a controlled startup phase. This reduces the risk of running the API against an outdated schema.

In a future production deployment, the frontend can be deployed to a static hosting platform, while the backend can run on a container platform or virtual machine. PostgreSQL should be managed with backups, connection limits, and monitoring. Qdrant Cloud can remain a managed vector database. The Groq API remains an external inference service. The main production risk is that the system depends on multiple networked services. Monitoring must therefore include backend availability, database availability, Qdrant availability, Groq availability, and response latency.

### 4.7 Data Flow for Authenticated Chat

In an authenticated chat flow, the user logs in and receives an access token while the refresh token is placed in an HttpOnly cookie. The frontend sends the access token in the `Authorization` header when asking a question. The backend resolves the user from the token, executes the RAG pipeline, stores the user message and assistant message in `chat_history`, and returns the answer with the `conversation_id` and `message_id`.

The key property of this flow is persistence. The same user can later list conversations, open a conversation history, rename a conversation, soft-delete a conversation, export a conversation as PDF, or create a share link. These features require relational state and cannot be represented only in Qdrant.

### 4.8 Data Flow for Guest Chat

Guest chat exists to reduce the initial barrier to using the system. When a non-authenticated user asks a question, the backend creates or resolves a guest session identifier. The identifier is stored in an HttpOnly cookie and associated with `chat_history.guest_session_id`. This creates a temporary conversation history without requiring an account.

Guest mode is useful for usability, but it has privacy implications. The system still stores conversation content linked to a guest session identifier. Therefore, production deployment should clearly explain guest data retention and provide a mechanism for clearing guest conversations.

### 4.9 Data Flow for Document Analysis

Document analysis follows a different flow from normal question answering. The user uploads a PDF file through a multipart request. The backend extracts text from the PDF, compacts the document text to fit generation constraints, optionally combines it with a user question, and calls the document answer generation function. The response includes the answer, a document summary, category information, and optional conversation identifiers [20].

Document comparison extends this idea to two PDF files. The backend extracts both texts, prepares a comparison prompt, and returns a structured answer. These workflows are useful because legal problems often involve documents such as contracts, notices, petitions, invoices, or official letters.

### 4.10 Architecture Risks

The architecture has several risks. The first is upstream dependency risk: Groq and Qdrant are external services. The second is latency risk: RAG combines multiple sequential operations. The third is evaluation risk: retrieval and generation quality are harder to test than ordinary CRUD operations. The fourth is privacy risk: legal questions may include sensitive personal information.

The current design partially mitigates these risks with health checks, fallback retrieval, rate limits, mock modes, structured tests, and legal warnings. However, production readiness would require stronger monitoring, user-facing privacy documentation, backups, and formal incident handling.

---

## Chapter 5: Data Layer and Database Design

### 5.1 Relational Database Overview

The application uses a relational database for user and application state. In production, PostgreSQL is the target relational database [4]. In local development, the configuration can fall back to SQLite through the default `DATABASE_URL` value `sqlite:///./hakbul.db` [21]. This distinction supports both development convenience and production readiness.

### 5.2 Alembic Migration Chain

Alembic manages schema evolution [6]. The migration chain records the development of authentication, chat history, guest support, feedback, weak queries, shared conversations, soft delete, lawyer role, forum tables, and local demo seed data.

**Table 4. Alembic Migration Chain**

| Revision | Purpose |
|---|---|
| `20260305_0001` | Authentication tables |
| `20260305_0002` | Chat history and guest support |
| `20260316_0003` | `chat_history.category` |
| `20260317_0004` | `message_feedback` |
| `20260317_0005` | `chat_history.title` |
| `20260326_0006` | `weak_queries` and `shared_conversations` |
| `20260326_0007` | `chat_history.deleted_at` |
| `20260330_0008` | Lawyer role |
| `20260330_0009` | Forum tables |
| `20260428_0010` | Local/dev demo seed data |

### 5.3 Relational Tables

**Table 5. Relational Database Tables**

| Table | Purpose |
|---|---|
| `users` | Registered users and role information |
| `refresh_tokens` | Refresh token hashes, rotation, revocation |
| `chat_history` | User and guest conversation messages |
| `message_feedback` | Positive or negative feedback on assistant messages |
| `weak_queries` | Low-confidence retrieval queries |
| `shared_conversations` | Share tokens for conversations |
| `forum_threads` | Forum discussion threads |
| `forum_replies` | Replies under forum threads |
| `forum_votes` | Votes on threads and replies |

### 5.3.1 Table Field Summary

The `users` table contains identity and authorization fields: `id`, `email`, `password_hash`, `is_active`, `role`, `created_at`, and `updated_at`. The `role` field is an enum with `user`, `lawyer`, and `admin`, allowing the system to distinguish ordinary users from privileged forum or admin users.

The `refresh_tokens` table supports refresh token rotation. Instead of storing the raw token, the system stores a `token_hash`. The `jti` field uniquely identifies a token instance, while `revoked_at` and `replaced_by_jti` allow the system to represent revocation and replacement. This is important because access tokens are short-lived, while refresh tokens must be carefully controlled.

The `chat_history` table stores both user and assistant messages. The key design decision is that a message belongs either to an authenticated `user_id` or to a `guest_session_id`. This allows the same table to support registered and guest conversations while maintaining clear ownership. The `metadata_json` column allows assistant messages to store source metadata such as retrieved legal references.

The `message_feedback` table stores user ratings for assistant messages. The value is constrained to `1` or `-1`, representing positive or negative feedback. The table can link feedback to an authenticated user or a guest session. Existing feedback from the same owner is updated by service logic.

The `weak_queries` table stores low-confidence retrieval cases. These records are useful for later retrieval analysis because they indicate user questions where the system did not find strong sources. The table includes the original question, the maximum retrieval score, the detected category, and the creation time.

The `shared_conversations` table stores public share tokens for conversations. It does not duplicate all messages. Instead, it stores the `conversation_id`, the owner `user_id`, the generated `share_token`, an `is_active` flag, and creation time.

The forum tables model discussion and lightweight moderation. `forum_threads` stores the initial discussion, `forum_replies` stores replies, and `forum_votes` stores votes on either threads or replies. The vote target is represented by `target_type` and `target_id`.

### 5.4 Entity Relationships

The `users` table is central to authenticated application workflows. A user can have many refresh tokens, many chat history rows, shared conversations, forum threads, forum replies, forum votes, and feedback entries. Chat history can also belong to a guest session instead of a user. This ownership model is enforced in `chat_history` with an XOR constraint: either `user_id` or `guest_session_id` must be present, but not both [21].

**Figure 5. Relational Database ER Diagram**

```text
users
 |-- refresh_tokens
 |-- chat_history
 |-- shared_conversations
 |-- forum_threads
 |-- forum_replies
 |-- forum_votes
 |-- message_feedback

chat_history
 |-- message_feedback

forum_threads
 |-- forum_replies

forum_votes
 |-- target_type + target_id (thread or reply)
```

### 5.5 Chat History and Soft Delete

The `chat_history` table stores user and assistant messages. Important fields include `conversation_id`, `role`, `content`, `title`, `category`, `metadata_json`, `created_at`, and `deleted_at`. The `role` field supports `system`, `user`, and `assistant`. Soft delete is implemented with `deleted_at`, allowing the system to hide conversations without physically removing records immediately [21].

### 5.6 Feedback and Weak Queries

The feedback system stores a `puan` value of `1` or `-1` for assistant messages. The service layer updates existing feedback when the same user or guest session votes again. This behavior is handled by application logic rather than a database-level unique constraint [21].

Weak queries are stored when the retrieval confidence is low. This table supports future analysis of queries that should be improved through corpus expansion, better category rules, or reranking.

### 5.7 Forum Data Model

The forum model includes threads, replies, and votes. Threads and replies are soft-deletable. Replies can be verified by lawyer or admin roles. Votes use a polymorphic target model with `target_type` and `target_id`, allowing the same table to store votes for both threads and replies. A unique constraint prevents the same user from voting more than once on the same target [21].

### 5.8 Qdrant Vector Store

Qdrant stores legal chunks and embeddings. The main collection is configured through `settings.COLLECTION_NAME`, with default value `hukuk_chunks`. An optional second collection can be configured for law chunks. Cosine distance is used for vector similarity, and the embedding model is `intfloat/multilingual-e5-base` [7], [21].

**Figure 6. Qdrant Retrieval Model**

```text
User query
  -> embedding model
  -> query vector
  -> Qdrant similarity search
  -> legal chunk payloads
  -> source formatting
```

Qdrant does not have foreign key relationships with the relational database. Retrieved source summaries may later be stored in `chat_history.metadata_json`, but Qdrant remains a retrieval store rather than an application-state database.

### 5.9 Local Retrieval Fallback

The backend includes a local fallback corpus under `backend/data/processed_backup_*`. The current fallback set contains 33 JSON files. If Qdrant is not configured, unavailable, or returns unusable results, and `ALLOW_LOCAL_RETRIEVAL_FALLBACK=true`, the backend can use the local corpus for reduced retrieval functionality [21], [22].

### 5.10 Database Design Discussion

The database design follows a pragmatic separation between transactional application data and retrieval data. Relational tables are used where identity, ownership, constraints, and lifecycle management matter. Examples include refresh token revocation, chat ownership, soft deletion, forum moderation, and unique voting. Qdrant is used where approximate similarity search is the core requirement.

This separation also improves maintainability. The legal corpus can be rebuilt, re-embedded, or moved between Qdrant collections without migrating user accounts or chat history. Conversely, user data can be backed up or migrated without changing the vector index. The system only connects the two layers at runtime through retrieved source metadata, which may be copied into `chat_history.metadata_json` for later display.

The use of soft delete in chat and forum records is also intentional. It preserves operational flexibility and avoids immediate data loss during user-facing delete operations. However, in a production system, soft delete should be paired with a clear retention policy and compliance-oriented deletion workflow.

---

## Chapter 6: RAG Pipeline Design

### 6.1 Pipeline Overview

The RAG pipeline is the core of Hak-Bul. It transforms a user question into a source-supported answer through multiple stages. The pipeline is documented in the project reference material and implemented under `backend/rag/` [22].

**Figure 4. RAG Pipeline Flow**

```text
User question
  -> gibberish detection
  -> legal category detection
  -> query rewriting
  -> retrieval
  -> category penalty
  -> conditional reranking
  -> score filtering
  -> source deduplication
  -> source summary
  -> answer generation
```

### 6.2 Gibberish Detection

The first stage detects inputs that are likely meaningless, such as keyboard mashing, extremely long nonsensical tokens, or strings with very low vowel ratio. These inputs are rejected early with an explanatory answer. Early rejection prevents unnecessary retrieval and generation calls.

### 6.3 Legal Category Detection

The system uses keyword-based categorization to map questions to legal areas. Supported categories include labor law, civil law, criminal law, commercial law, consumer law, real estate, administrative law, tax law, social security law, intellectual property, information technology law, constitutional law, procedural law, and general law [22].

Category detection is not a final legal classification. It is a retrieval aid. It helps the system prioritize legal chunks from likely relevant domains and apply penalties to unexpected law chunks.

### 6.4 Query Rewriting

The query rewrite stage uses `llama-3.1-8b-instant` under normal conditions to produce a shorter retrieval-oriented query [22]. Rewrite is skipped when the user already provides explicit law or article references, when mock modes are enabled, when no Groq API key is available, or when the rewrite call fails. In those cases, the original question is used as the retrieval query.

### 6.5 Embedding and Retrieval

The retrieval stage embeds the query and searches Qdrant. It can use the main collection, an optional law collection, and local JSON fallback. Retrieved results are represented as payload and score pairs. Payload metadata later becomes the basis for source titles and summaries [21], [22].

### 6.6 Category Penalty

Category penalty reduces the score of law chunks that are unexpected for the detected category. The penalty applies to law chunks, not court decision chunks. It is not applied in the general category. The purpose is to reduce irrelevant legal articles that may be semantically similar but legally outside the expected domain.

### 6.7 Conditional Reranking

Reranking is optional and controlled by `RERANKER_ENABLED`. When enabled, it runs only if the top retrieval score is below `SCORE_THRESHOLD`. The configured reranker model is `BAAI/bge-reranker-v2-m3` [22]. This design avoids the cost of reranking every request while allowing additional ranking support for uncertain retrieval results.

### 6.8 Score Filtering and Source Formatting

The score filter removes fully repealed legal articles and applies the configured threshold. If no result passes the threshold, the top results can be returned as fallback. If all scores are extremely low, sources are suppressed. After filtering, duplicate sources are removed and source summaries are generated.

Source formatting creates a title, short summary, normalized score, and official URL when possible. For law chunks, official legislation URLs are derived from a static mapping rather than requiring the URL to be stored directly in Qdrant payloads [21], [22].

### 6.9 Answer Generation

Answer generation uses `llama-3.3-70b-versatile` through Groq [13], [22]. The model receives the user question and retrieved legal context. In document workflows, separate generation functions are used for document analysis and document comparison. If mock modes are enabled or no LLM key is available, fallback behavior can produce extractive or document-oriented responses.

### 6.10 Important Configuration Parameters

**Table 7. RAG Configuration Parameters**

| Parameter | Purpose |
|---|---|
| `STRICT_UPSTREAMS` | Hard-fail when upstream services are unavailable |
| `ALLOW_LOCAL_RETRIEVAL_FALLBACK` | Enable or disable local fallback corpus |
| `RERANKER_ENABLED` | Enable conditional reranking |
| `COLLECTION_KANUN_NAME` | Optional second law collection |
| `SCORE_THRESHOLD` | Retrieval score threshold |
| `HAKBUL_PERF_LOG` | Enable performance logging |

### 6.11 Source Grounding Strategy

The most important reliability principle in the RAG design is that the answer should be grounded in retrieved source chunks. The system therefore treats retrieval as a required preparation step before generation. Source summaries are produced before the final answer, and the response model returns both the generated answer and a source list [20], [22].

This design has two benefits. First, the user can inspect which legal sources influenced the answer. Second, the system can store source metadata together with assistant messages for later review. However, grounding is not the same as legal correctness. A retrieved source may be relevant but incomplete, or the generated answer may overgeneralize. This is why the system includes legal warnings and why future expert evaluation remains necessary.

### 6.12 Failure Modes in the RAG Pipeline

The RAG pipeline can fail in several ways. Query rewriting can fail if the Groq API is unavailable. Retrieval can fail if Qdrant is not configured or unreachable. Reranking can be skipped if its model is unavailable or disabled. Generation can fail because of upstream timeouts or rate limits. The system addresses some of these cases with fallback behavior, mock modes, local retrieval fallback, and upstream health checks.

The test artifacts show that upstream availability and rate limits are not theoretical concerns. The 100-question system test recorded Groq upstream errors, rate-limit responses, and empty answer cases under test conditions [24]. These observations support the future-work items related to retry logic, monitoring, and request pacing.

### 6.13 Performance Considerations

The latency of a RAG request is the sum of several operations: request validation, category detection, optional query rewriting, embedding generation, vector search, optional reranking, source formatting, LLM answer generation, and persistence. The system uses SSE streaming to improve perceived responsiveness, but the retrieval stage still must complete before the first metadata event is sent [20], [22].

Performance logging can be enabled with `HAKBUL_PERF_LOG`. When enabled, the backend records timing for warm-up, query rewriting, retrieval, category penalty, reranking, filtering, source formatting, answer generation, and total `/ask` or `/ask/stream` duration. This is useful for identifying whether latency comes from retrieval, generation, or application overhead.

---

## Chapter 7: Backend Implementation

### 7.1 FastAPI Application Structure

FastAPI was selected because it provides a modern Python API framework with automatic OpenAPI documentation, async support, validation through type hints, and a developer-friendly routing model [1]. Hak-Bul uses router modules to separate responsibilities such as authentication, chat, feedback, forum, document processing, templates, and admin analytics.

### 7.2 API Endpoint Groups

**Table 6. API Endpoint Groups**

| Group | Example Endpoints | Purpose |
|---|---|---|
| Question answering | `/ask`, `/ask/stream`, `/search`, `/health` | RAG and system status |
| Authentication | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | User identity and sessions |
| Chat | `/chat/conversations`, `/chat/history/{id}` | Conversation history |
| Sharing | `/chat/conversations/{id}/share`, `/chat/shared/{token}` | Public conversation sharing |
| Feedback | `/feedback` | Message-level ratings |
| Documents | `/documents/analyze`, `/documents/compare` | PDF workflows |
| Templates | `/templates`, `/templates/{id}/generate` | Legal document generation |
| Forum | `/forum/threads`, `/forum/replies/{id}` | Community discussion |
| Admin | `/admin/stats`, `/admin/users`, `/admin/weak-queries` | Monitoring and management |

### 7.3 Authentication and Authorization

The authentication system uses JWT access tokens and refresh token rotation. Access tokens are sent with the `Authorization: Bearer <token>` header. Refresh tokens are stored in HttpOnly cookies rather than returned directly in the response body [16], [20]. This reduces exposure to client-side JavaScript. User roles include `user`, `lawyer`, and `admin`.

### 7.4 Chat and Guest Session Handling

Chat flows support authenticated users and guest users. Authenticated requests are associated with `user_id`. Guest requests are associated with a `guest_session_id` cookie. The database enforces the ownership rule for chat history with an XOR constraint [21].

### 7.5 Feedback, Forum, and Admin Services

The feedback service allows positive or negative voting on assistant messages. The forum service supports threads, replies, verification, locking, and voting. Admin endpoints provide aggregate statistics, category distribution, feedback summaries, daily activity, user management, and weak query inspection [20].

### 7.6 Document and Template Services

Document endpoints support PDF analysis and comparison. Template endpoints list supported legal templates and generate PDF documents from user-provided fields. These features extend Hak-Bul beyond conversational question answering and make it a broader legal information utility.

### 7.7 Rate Limiting and Error Handling

The API documentation defines rate limits for sensitive or expensive endpoints. For example, `/ask` and `/ask/stream` are limited to 20 requests per minute, `/auth/login` to 5 per minute, and `/documents/compare` to 5 per minute [20]. Rate limiting reduces abuse risk and protects upstream services.

### 7.8 Backend Module Responsibilities

The backend follows a layered organization. Router modules define HTTP behavior, services implement business logic, models define database entities, schemas define request and response contracts, and the RAG package handles retrieval and generation. This separation makes the code easier to test because service functions can be tested independently from HTTP routing.

The `chat_service` module resolves conversation identifiers, saves user-assistant message pairs, lists conversation histories, exports messages, soft-deletes conversations, and renames conversation titles. The `forum_service` module normalizes categories, creates threads and replies, applies verification, handles soft delete, and manages voting. The `admin_service` module calculates statistics, category distribution, feedback summaries, daily activity, user lists, role updates, user activation status, and weak-query listings. The `document_service` module extracts PDF text and prepares compact document prompts. The `template_service` module validates required fields and generates PDF documents for supported legal templates.

### 7.9 Backend Endpoint Design Rationale

The API uses resource-oriented endpoint groups. Chat endpoints are grouped under `/chat`, forum endpoints under `/forum`, authentication under `/auth`, and admin operations under `/admin`. This grouping is useful for frontend integration because each UI workflow maps to a predictable API namespace.

The design also separates synchronous and streaming question-answering. `/ask` returns a complete JSON response, while `/ask/stream` returns a `text/event-stream` response. Supporting both modes allows the application to serve clients that prefer simple JSON and clients that want progressive token rendering.

---

## Chapter 8: Frontend Implementation

### 8.1 React and Vite Structure

The frontend is implemented as a single-page application using React 19 and Vite [2], [3]. React provides a component-based UI model, while Vite provides fast development builds and a modern frontend toolchain.

### 8.2 Page-Level Organization

The frontend includes pages for chat, authentication, profile management, document analysis, document comparison, templates, forum, admin analytics, and shared conversations. This structure maps closely to backend endpoint groups and supports both general users and administrative workflows.

### 8.3 Chat Interface and Streaming UX

The chat interface is the primary user-facing workflow. For streaming answers, the frontend consumes SSE events from `/ask/stream`. The first event contains metadata such as sources and category, token events append generated text, and the final event includes completion information [20].

### 8.4 Guest and Authenticated Flows

Guest users can use the system without registration through a guest session cookie. Authenticated users can store conversations permanently, update profile information, share conversations, and access richer account-based workflows.

### 8.5 Forum, Admin, and Document Interfaces

The forum interface supports reading threads, creating discussions, replying, voting, and moderation-related actions. The admin interface exposes system-level information such as user lists, category distribution, feedback summaries, and weak queries. Document interfaces support PDF upload, analysis, comparison, and template-based PDF generation.

### 8.6 Theme and Typography

The frontend design uses a documented theme and typography system. Centralized visual conventions improve consistency across chat, forum, admin, and document pages. This is important because the application combines several workflows in one interface.

### 8.7 Frontend Module Responsibilities

The frontend source tree separates pages, components, hooks, API helpers, contexts, localization files, and flow utilities. Page components represent major screens such as `SohbetSayfasi`, `KarsilastirmaSayfasi`, `TaslakSayfasi`, `ForumSayfasi`, `ForumBaslikSayfasi`, `AdminSayfasi`, `ProfilSayfasi`, and `PaylasimSayfasi`. Shared components include message rendering, source cards, feedback buttons, loading indicators, authentication modals, history panels, and legal warning modals.

The `useChat` hook coordinates the chat workflow. It connects user input, backend requests, conversation identifiers, guest session behavior, document analysis calls, and streaming updates. This keeps the chat page focused on presentation while the hook handles stateful communication logic.

API helper modules centralize request behavior, authentication calls, and error handling. Context modules provide authentication, language, and theme state. The presence of contract tests and flow tests in the frontend indicates that the UI has been designed around stable behavioral surfaces rather than only visual components.

### 8.8 Localization and User Experience

Hak-Bul supports Turkish and English UI flows. This is important because the project report and some evaluation artifacts are in English, while the primary legal use case is Turkish. Localization files separate display text from component logic, making it easier to maintain bilingual interfaces.

The user experience prioritizes direct access to the chat tool. Guest mode reduces the barrier to entry, while authentication enables persistent history. Source cards help users inspect legal references. Feedback buttons create a lightweight mechanism for collecting answer quality signals.

---

## Chapter 9: Security, Ethics, and Legal Boundaries

### 9.1 Authentication Security

Hak-Bul uses JWT access tokens for authenticated API access [16]. Refresh tokens are stored as hashes in the relational database and rotated to reduce replay risk. The refresh token itself is transported through an HttpOnly cookie, which limits direct access from JavaScript [17], [20].

### 9.2 Password and Session Management

Passwords are stored as hashes rather than plain text. Refresh token records include fields such as `jti`, `token_hash`, `expires_at`, `revoked_at`, and `replaced_by_jti` [21]. This design supports token revocation and replacement during rotation.

### 9.3 Role-Based Authorization

Role-based access control separates normal users, lawyers, and admins. Admin-only endpoints include statistics, user management, and weak-query inspection. Lawyer and admin roles can perform selected forum verification or moderation functions.

### 9.4 Legal and Ethical Boundaries

Hak-Bul must not be presented as a substitute for a lawyer. Legal questions may involve deadlines, evidence, procedural conditions, and jurisdiction-specific interpretation. For critical areas such as criminal law, divorce, enforcement, or compensation, the system should direct users toward bar legal aid offices or qualified lawyers.

The ethical position of the project is that AI can support initial legal information access, but it must not create false certainty. The system should communicate uncertainty, cite sources, and encourage professional advice where necessary.

### 9.5 Privacy Considerations

The system stores chat history, feedback, account data, and forum content. This creates privacy responsibilities. Guest sessions reduce the need for immediate registration but still create session-linked data. Future production deployment should include stronger privacy documentation, data retention policies, and user-facing controls for data deletion.

### 9.6 Legal Disclaimer Strategy

The disclaimer strategy is part of both ethics and product design. A legal AI assistant should not present generated text as final legal advice. The system should state that answers are informational, that legal outcomes depend on facts and procedural details, and that users should consult a qualified lawyer for case-specific advice.

Disclaimers should not be hidden only in terms of service. They should appear in relevant user flows, especially before first use and near generated answers. The goal is not only to reduce institutional risk but also to prevent user overreliance on AI-generated content.

### 9.7 Sensitive Legal Categories

Some legal categories require additional caution. Criminal law, divorce, enforcement proceedings, compensation claims, employment termination, and administrative deadlines can involve urgent rights or irreversible procedural consequences. For these topics, the system should use stronger language encouraging professional assistance.

Hak-Bul already includes the project goal of directing users toward bar legal aid offices or qualified lawyers in critical legal topics. Future work can make this more systematic by detecting sensitive categories and showing category-specific referral messages.

### 9.8 Ethical Use of User Feedback

Feedback data can help improve the system, but it should not be interpreted as a complete quality metric. A user may downvote a legally correct answer because it is unfavorable, or upvote an answer that sounds helpful but contains a subtle legal error. Therefore, feedback should be used as a signal for review, not as ground truth.

Weak queries and negative feedback should feed an improvement process where developers inspect the question, retrieved sources, generated answer, and expected legal reference. This creates a quality loop without assuming that user ratings alone measure correctness.

---

## Chapter 10: Testing and Evaluation

### 10.1 Testing Strategy

The project uses automated tests, endpoint checks, retrieval regression tests, and system-level scenario testing. Testing is important because the system combines web APIs, authentication, database state, document processing, retrieval, and LLM-dependent generation.

### 10.2 Backend Automated Tests

Backend tests cover authentication, chat history, feedback, forum behavior, templates, document flows, language support, retrieval regression, and supporting utilities. These tests provide evidence that core application workflows remain stable during development.

### 10.3 API and Rate-Limit Behavior

API documentation defines expected request and response behavior for major endpoints [20]. Rate limits are part of the operational behavior and must be tested because they affect user experience and upstream service protection.

### 10.4 Retrieval Test Methodology

Retrieval evaluation uses category-based legal question sets. Each question can include expected laws and expected article numbers. The automatic test script sends questions to the API and stores responses, sources, categories, and timing information.

### 10.5 System Test Evidence

**Table 8. Test Categories and Evidence**

| Test Area | Evidence Source |
|---|---|
| Unit and integration tests | `backend/tests/` |
| API behavior | `docs/reference/api.md` |
| Retrieval regressions | `backend/tests/test_retrieval_regressions.py` |
| 100-question system test | `docs/tests/SYSTEM_TEST_100_QUESTIONS_REPORT.md` |
| Audit summary | `docs/audits/AUDIT_SUMMARY.md` |

### 10.6 Evaluation Limitations

The existing evaluation shows functional progress but is not equivalent to a formal legal accuracy audit. Some test findings involve upstream API errors, rate limiting, empty responses, and retrieval quality issues. Future evaluation should include legal expert review, more systematic citation checking, and metrics such as faithfulness, answer relevancy, and context recall. RAGAS provides one possible framework for automated RAG evaluation [11].

### 10.7 100-Question System Test Discussion

The 100-question system test evaluated the system with Turkish legal questions across multiple legal categories. The report recorded 100 questions across areas such as labor, rental, family, criminal, consumer, civil, real estate, commercial, administrative, and tax law [24]. The test is useful because it exposed operational behavior under repeated requests rather than only isolated success cases.

The most important findings were upstream unavailability, rate limiting, and empty-answer behavior in some cases. These findings should be interpreted carefully. A low success rate in that test does not necessarily mean the entire retrieval corpus failed; some failures were caused by API availability and test pacing. Nevertheless, from a user perspective, these are real reliability problems. A production version must handle them with retry policies, queueing, monitoring, clearer error states, and possibly response caching.

### 10.8 Audit Summary Discussion

The audit summary provides a separate snapshot of system status, including unit test results, database table status, Qdrant connectivity, Groq connectivity, migration status, and service checks [25]. It reported that core tests passed, database tables existed, Qdrant contained loaded legal vectors, and Groq API connectivity worked at the time of the audit.

There is an important lesson in comparing the system test report and the audit summary. A system can be structurally healthy while still showing reliability problems under repeated workload or upstream constraints. Therefore, graduation evaluation should not rely on one type of evidence. It should combine unit tests, integration tests, schema checks, retrieval tests, API tests, and scenario-based system tests.

### 10.9 Recommended Evaluation Improvements

The next evaluation phase should include:

1. A fixed benchmark set of legal questions with expected law names and article numbers.
2. Separate measurement of retrieval accuracy and generation quality.
3. Manual legal expert review for a representative sample.
4. Citation verification against official sources.
5. Repeated tests with controlled request delays to avoid confusing rate-limit failures with model failures.
6. Monitoring of latency distribution, including p50, p95, and maximum response time.
7. RAGAS-style faithfulness, context recall, and answer relevancy metrics [11].

### 10.10 Proposed Evaluation Matrix

| Evaluation Dimension | Question Answered | Suggested Metric | Current Evidence | Future Improvement |
|---|---|---|---|---|
| Functional correctness | Do endpoints behave as expected? | Automated test pass rate | Backend and frontend tests | Broader integration suite |
| Retrieval relevance | Are correct legal sources retrieved? | Expected law/article match | Category test sets | Expert-labeled benchmark |
| Faithfulness | Does the answer follow sources? | RAGAS faithfulness/manual review | Partial qualitative checks | Formal RAGAS pipeline |
| Citation quality | Are citations verifiable? | URL and article validation | Source metadata | Automatic citation checker |
| Latency | Is response time acceptable? | p50/p95 response time | System test timings | Performance dashboard |
| Robustness | Does system recover from upstream errors? | Error rate and fallback rate | 503/rate-limit findings | Retry and circuit breaker |
| Usability | Can users complete workflows? | Task completion observation | Implemented UI flows | User study |
| Security | Are protected actions restricted? | Auth/role tests | Auth and admin tests | Penetration testing |

### 10.11 Test Data Limitations

The current test data is useful for development, but it has limitations. Some questions are prepared by the project team rather than independent legal experts. Some expected answers are represented as expected laws or article numbers, which may not capture all legally acceptable answers. In addition, API tests may fail because of service availability or rate limits rather than because the retrieval model selected the wrong sources.

For a stronger academic evaluation, the benchmark should be frozen and versioned. Each question should include the expected legal domain, expected source type, expected law or decision reference, a short expert explanation, and a difficulty label. The evaluation script should report retrieval correctness separately from generation correctness. This separation is necessary because a correct retrieval with a weak generated answer and a weak retrieval with a fluent answer require different fixes.

### 10.12 Manual Review Protocol

A future manual review can use the following protocol:

1. Select a representative sample from each legal category.
2. Run each question through the same deployed version of the system.
3. Save the full answer, sources, scores, category, and latency.
4. Ask a legal reviewer to mark each retrieved source as relevant, partially relevant, or irrelevant.
5. Ask the reviewer to mark the generated answer as correct, partially correct, misleading, or unsafe.
6. Record whether the answer contains unsupported statements.
7. Record whether the disclaimer and referral behavior are appropriate.

This protocol would provide stronger evidence than raw pass/fail API tests because it evaluates the legal quality of both context and generation.

---

## Chapter 11: Results and Discussion

### 11.1 Completed Features

The project delivers a working web application with legal question answering, streaming responses, chat history, guest mode, authentication, refresh token rotation, PDF analysis, document comparison, legal templates, a forum, feedback, admin analytics, and vector retrieval.

### 11.2 Technical Achievements

The most important technical achievement is the integration of RAG into a full-stack application rather than a standalone notebook or prototype. The system connects frontend workflows, backend services, relational persistence, vector search, LLM generation, and test infrastructure.

### 11.3 Retrieval Quality Observations

Retrieval quality is central to the reliability of the application. The current design uses category detection, Qdrant vector search, category penalty, optional reranking, score filtering, and local fallback. These mechanisms improve robustness, but they do not guarantee that the retrieved legal source is always the best possible source. Legal retrieval remains an area for future improvement.

### 11.4 Reliability and Usability Discussion

Streaming responses improve perceived responsiveness. Guest mode reduces friction for first-time users. Conversation history and sharing improve continuity. However, reliance on external services such as Groq and Qdrant introduces availability risks. The local fallback corpus reduces this risk for retrieval, but answer generation still depends on LLM availability unless mock or extractive fallback is used.

### 11.5 Limitations and Mitigation Plans

**Table 9. Limitations and Mitigation Plans**

| Limitation | Mitigation |
|---|---|
| LLM hallucination risk | Retrieval grounding, citations, disclaimers, future citation verification |
| Retrieval mismatch | Better reranking, larger corpus, expert-labeled evaluation sets |
| Upstream API failure | Fallback modes, monitoring, retry policy |
| Limited legal validation | Lawyer review workflow and formal expert evaluation |
| No production deployment yet | Deployment pipeline, HTTPS, monitoring, backups |
| Privacy policy not finalized | Data retention and user deletion policies |

---

## Chapter 12: Conclusion and Future Work

### 12.1 Conclusion

Hak-Bul demonstrates that a source-grounded legal information assistant for Turkish law can be implemented as a full-stack web application. The project combines RAG, vector search, LLM generation, relational data management, authentication, chat history, document workflows, and administrative tooling.

The system does not replace legal professionals. Its value is in making legal information more accessible, organizing retrieved sources, and providing a structured first layer of legal understanding. The project also shows that engineering decisions such as source grounding, role-based access, token rotation, and fallback retrieval are essential when applying AI to sensitive domains.

### 12.2 Future Work

Future work should focus on:

- Production deployment with HTTPS, monitoring, logging, and backup policies.
- Larger and more frequently updated legal corpora.
- Stronger reranking and legal-domain retrieval evaluation.
- RAGAS-style faithfulness and context recall measurement [11].
- Citation verification against official legislation and court decision sources [18], [19].
- Lawyer verification workflows for forum answers and sensitive legal topics.
- Better privacy controls and data retention policies.
- Improved UI support for explaining uncertainty and source relevance.

---

## References

[1] FastAPI Documentation, "FastAPI: Modern, fast web framework for building APIs with Python." Available: https://fastapi.tiangolo.com/

[2] React Documentation, "React." Available: https://react.dev/

[3] Vite Documentation, "Vite." Available: https://vite.dev/

[4] PostgreSQL Documentation, "PostgreSQL." Available: https://www.postgresql.org/docs/

[5] SQLAlchemy Documentation, "SQLAlchemy ORM." Available: https://docs.sqlalchemy.org/

[6] Alembic Documentation, "Alembic Database Migrations." Available: https://alembic.sqlalchemy.org/

[7] Qdrant Documentation, "Qdrant Vector Database." Available: https://qdrant.tech/documentation/

[8] Docker Documentation, "Docker Docs." Available: https://docs.docker.com/

[9] P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," Advances in Neural Information Processing Systems, 2020.

[10] A. Vaswani et al., "Attention Is All You Need," Advances in Neural Information Processing Systems, 2017.

[11] S. Es, J. James, L. Espinosa-Anke, and S. Schockaert, "RAGAS: Automated Evaluation of Retrieval Augmented Generation," EACL System Demonstrations, 2024.

[12] Meta, "Llama model documentation and model cards." Available: https://www.llama.com/

[13] Groq Documentation, "Groq API Documentation." Available: https://console.groq.com/docs/

[14] Sentence Transformers Documentation, "Sentence Transformers." Available: https://www.sbert.net/

[15] MDN Web Docs, "EventSource." Available: https://developer.mozilla.org/en-US/docs/Web/API/EventSource/

[16] IETF, "RFC 7519: JSON Web Token (JWT)." Available: https://www.rfc-editor.org/rfc/rfc7519

[17] OWASP, "Authentication and Session Management Guidance." Available: https://owasp.org/

[18] T.C. Cumhurbaşkanlığı, "Mevzuat Bilgi Sistemi." Available: https://www.mevzuat.gov.tr/

[19] Yargıtay Başkanlığı, "Yargıtay Karar Arama." Available: https://karararama.yargitay.gov.tr/

[20] Hak-Bul Project, "API Documentation," `docs/reference/api.md`.

[21] Hak-Bul Project, "Data Schema," `docs/reference/database.md`.

[22] Hak-Bul Project, "RAG Pipeline," `docs/reference/rag-pipeline.md`.

[23] Hak-Bul Project, "Technical Specification," `docs/reference/tech-spec.md`.

[24] Hak-Bul Project, "100-Question System Test Report," `docs/tests/SYSTEM_TEST_100_QUESTIONS_REPORT.md`.

[25] Hak-Bul Project, "Project Audit Summary," `docs/audits/AUDIT_SUMMARY.md`.

---

## Appendices

### Appendix A: API Endpoint Summary

The detailed API endpoint table is maintained in `docs/reference/api.md`. The final Word version should include the full endpoint table or a condensed version with endpoint groups, authentication requirement, and response format.

### Appendix B: Database Schema Summary

The detailed schema is maintained in `docs/reference/database.md`. The final Word version should include the relational database table summary, migration chain, and ER diagram.

### Appendix C: RAG Pipeline Summary

The detailed RAG pipeline is maintained in `docs/reference/rag-pipeline.md`. The final Word version should include a figure and step-by-step explanation.

### Appendix D: Screenshot Placeholders

The final Word report should include screenshots for:

- Chat page
- Streaming answer state
- Source cards
- Login/register screens
- PDF analysis page
- Document comparison page
- Template generation page
- Forum thread page
- Admin analytics page

Each screenshot should include a short caption that explains what workflow it demonstrates. Screenshots should not be decorative; they should support the implementation narrative. For example, the chat screenshot should show a question, an answer, source cards, and feedback controls. The admin screenshot should show measurable system data such as category distribution, feedback summary, or weak-query records.

### Appendix E: Example RAG Response

The final report should include one anonymized example question, retrieved sources, generated answer, and explanation of how sources are displayed to the user.

**Example Question**

> Under which conditions can an employee request severance pay?

**Expected Processing**

| Stage | Expected Behavior |
|---|---|
| Category detection | Labor law |
| Query rewrite | Convert everyday wording into retrieval-oriented legal query |
| Retrieval | Retrieve related labor law chunks and possibly court decisions |
| Source formatting | Produce article titles, short summaries, scores, and URLs |
| Answer generation | Explain general conditions with legal warning |

**Example Source Display**

| Field | Example Value |
|---|---|
| Source type | `kanun` |
| Title | `4857 Sayili Is Kanunu - Madde ...` |
| Summary | Short excerpt or query-aware summary |
| Score | Normalized relevance score |
| URL | Official legislation URL when available |

**Example Answer Structure**

1. Direct answer to the user's question.
2. Explanation of the relevant legal rule.
3. Conditions and exceptions.
4. Source list or source cards.
5. Warning that the answer is informational and not legal advice.

This example should be replaced with a real captured application response before the final Word export.

### Appendix F: Expanded API Endpoint Table

| Group | Method | Path | Authentication | Response Type |
|---|---|---|---|---|
| RAG | POST | `/ask` | Optional | JSON |
| RAG | POST | `/ask/stream` | Optional | `text/event-stream` |
| Search | GET | `/search` | None | JSON |
| Health | GET | `/health` | None | JSON |
| Auth | POST | `/auth/register` | None | JSON |
| Auth | POST | `/auth/login` | None | JSON + HttpOnly cookie |
| Auth | POST | `/auth/refresh` | Refresh cookie/body fallback | JSON + HttpOnly cookie |
| Auth | POST | `/auth/logout` | Refresh cookie/body fallback | No content |
| Auth | GET | `/auth/profile` | Required | JSON |
| Chat | GET | `/chat/conversations` | Required | JSON |
| Chat | GET | `/chat/history/{id}` | Required | JSON |
| Chat | GET | `/chat/guest/conversations` | Guest cookie | JSON |
| Chat | GET | `/chat/guest/history/{id}` | Guest cookie | JSON |
| Sharing | POST | `/chat/conversations/{id}/share` | Required | JSON |
| Sharing | GET | `/chat/shared/{token}` | None | JSON |
| Feedback | POST | `/feedback` | User or guest | JSON |
| Documents | POST | `/documents/analyze` | Optional | JSON |
| Documents | POST | `/documents/compare` | Optional | JSON |
| Templates | GET | `/templates` | None | JSON |
| Templates | POST | `/templates/{id}/generate` | None | PDF |
| Forum | GET | `/forum/threads` | None | JSON |
| Forum | POST | `/forum/threads` | Required | JSON |
| Forum | POST | `/forum/threads/{id}/replies` | Required | JSON |
| Forum | PATCH | `/forum/replies/{id}/verify` | Lawyer/Admin | JSON |
| Admin | GET | `/admin/stats` | Admin | JSON |
| Admin | GET | `/admin/users` | Admin | JSON |
| Admin | GET | `/admin/weak-queries` | Admin | JSON |

### Appendix G: Expanded Database Table Summary

| Table | Key Fields | Notes |
|---|---|---|
| `users` | `id`, `email`, `password_hash`, `role`, `is_active` | User identity and authorization |
| `refresh_tokens` | `user_id`, `jti`, `token_hash`, `expires_at`, `revoked_at` | Token rotation and revocation |
| `chat_history` | `user_id`, `guest_session_id`, `conversation_id`, `role`, `content`, `metadata_json` | User/guest chat messages |
| `message_feedback` | `message_id`, `puan`, `user_id`, `guest_session_id` | Assistant message ratings |
| `weak_queries` | `soru`, `max_skor`, `kategori` | Low-confidence retrieval tracking |
| `shared_conversations` | `share_token`, `conversation_id`, `user_id`, `is_active` | Public conversation sharing |
| `forum_threads` | `user_id`, `title`, `content`, `category`, `is_locked`, `deleted_at` | Forum thread lifecycle |
| `forum_replies` | `thread_id`, `user_id`, `content`, `is_verified`, `deleted_at` | Reply lifecycle and verification |
| `forum_votes` | `user_id`, `target_type`, `target_id`, `value` | Polymorphic voting |

### Appendix H: Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Relational database connection |
| `QDRANT_URL` | Qdrant endpoint |
| `QDRANT_API_KEY` | Qdrant API key |
| `QDRANT_COLLECTION` | Main Qdrant collection |
| `QDRANT_COLLECTION_KANUN` | Optional law-specific collection |
| `GROQ_API_KEY` | Groq API key |
| `JWT_SECRET_KEY` | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime |
| `ALLOW_LOCAL_RETRIEVAL_FALLBACK` | Local retrieval fallback switch |
| `RERANKER_ENABLED` | Conditional reranking switch |
| `SCORE_THRESHOLD` | Retrieval score threshold |
| `STRICT_UPSTREAMS` | Hard-fail upstream behavior |

### Appendix I: Deployment Checklist

| Area | Checklist Item |
|---|---|
| Backend | Configure production `DATABASE_URL` |
| Backend | Set strong `JWT_SECRET_KEY` |
| Backend | Enable HTTPS-aware cookie settings |
| Backend | Configure CORS origins for production frontend |
| Backend | Verify rate limits for expected traffic |
| Database | Apply Alembic migrations |
| Database | Configure backups and restore testing |
| Qdrant | Verify collection exists and vector size matches embedding model |
| Qdrant | Configure API key and network access |
| LLM | Configure Groq API key and model names |
| Monitoring | Track `/health`, Qdrant status, Groq status, latency, and error rate |
| Security | Review admin accounts and default seed data |
| Privacy | Publish data retention and deletion policy |

### Appendix J: Future Work Backlog

| Priority | Item | Rationale |
|---|---|---|
| High | Citation verification | Prevent unsupported or incorrect legal references |
| High | Expert-labeled evaluation set | Measure legal quality more accurately |
| High | Retry and backoff for Groq errors | Improve reliability under transient failures |
| High | Production monitoring | Detect service degradation early |
| Medium | Redis caching | Reduce repeated query latency |
| Medium | Embedding cache | Avoid repeated embedding work |
| Medium | Better reranker tuning | Improve retrieval quality |
| Medium | Larger legal corpus | Improve coverage across legal categories |
| Medium | Lawyer verification workflow | Increase trust in forum and sensitive answers |
| Low | Mobile application | Improve accessibility after web stabilization |
| Low | Freemium quota system | Support future productization |

### Appendix K: Glossary

| Term | Definition |
|---|---|
| RAG | Retrieval-Augmented Generation; a method that retrieves external context before generating an answer |
| LLM | Large Language Model; a model capable of generating and understanding natural language |
| Embedding | Numeric vector representation of text |
| Vector database | Database optimized for similarity search over embeddings |
| Qdrant | Vector database used by Hak-Bul for legal chunk retrieval |
| JWT | JSON Web Token used for stateless authenticated API access |
| Refresh token | Longer-lived token used to obtain new access tokens |
| SSE | Server-Sent Events; one-way HTTP streaming from server to client |
| Soft delete | Marking data as deleted without physically removing it immediately |
| Weak query | A question whose retrieval score is low or whose sources are weak |
| Reranker | Model or algorithm that reorders retrieved documents by relevance |
| Citation verification | Checking whether generated references match real legal sources |
