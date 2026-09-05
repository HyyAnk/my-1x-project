---
trigger: always_on
---

# Strict English-Only Codebase & System Specification

## Core Directive: Absolute Prohibition of Vietnamese in All Code, Files, and System Artifacts

This repository strictly enforces an English-only standard across all technical assets. Under no circumstances should Vietnamese (whether accented or unaccented) be used, written, or committed into any file, filename, or system interface.

### 1. Code & Implementation Artifacts
- **Code & Identifiers:** All variable names, function/method names, class names, interface/type definitions, enums, constants, database columns, route paths, parameter names, and CSS classes must be strictly in English.
- **Comments & Documentation:** All inline comments, block comments, docstrings (JSDoc, TSDoc), markdown documentation, architectural decision records, guides, notes, and task handoffs must be written strictly in English.
- **File & Directory Names:** Every file name and directory name created or modified in this repository must be composed entirely of English words (e.g., `questionBankRepository.ts`, never Vietnamese words or transliterations).
- **Tests & Mock Data:** All test descriptions (`describe`, `it`, `test`), assertions, mocks, fixtures, and sample data must be in English.

### 2. User Interface (UI) & System Presentation
- **Frontend / Client UI:** All user-facing text, button labels, headings, navigation items, tooltips, placeholders, modal titles, confirmation dialogs, error messages, warning alerts, and status badges must be strictly in English.
- **API & Backend Output:** All server error responses, status messages, log output, notification text, and exception messages must be in English.

### 3. Agent Chat & Conversational Language (Crucial Distinction)
- **User Conversations in Vietnamese:** The user is fully allowed and welcome to communicate, prompt, ask questions, and hold discussions in Vietnamese (or any preferred language) within the Antigravity chat interface.
- **Agent Responses in Chat:** Antigravity and AI agents can naturally converse and respond to the user in Vietnamese in the chat when prompted in Vietnamese.
- **Boundary Guarantee:** While conversational exchange in chat may be conducted in Vietnamese, any file written, created, edited, refactored, or committed by the agent MUST strictly follow the English-only rules above without exception.
