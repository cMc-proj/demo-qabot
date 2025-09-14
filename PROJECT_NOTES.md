# Project Notes  
Protect main (no force‑push); merge via PR only.

## Overview  
- **Project name:**  
- **Goal:** One-sentence description of what this project does.  
- **Stack:** Node.js backend, React frontend, Docker, etc.  
- **Repo link:** [ ]  

---

## Current Status  
- ✅ `/healthz` endpoint implemented for health checks.  
- Project scaffolding created (backend + frontend folders).  
- Environment set up with `.env` file.  
- ✅ PROJECT_NOTES.md file created.
- ✅ meetings/ folder created in repo for storing meeting notes.
- Owen is coding the demo locally, no commits pushed yet.
- Jackson preparing documentation, test plan, and meeting agenda.
- Sept 14: Created TEST_PLAN.md, updated agenda.

## Status Update – Sept 14

- Backend running on **http://localhost:5050**  
- `.env` settings:  
  - `PORT=5050`  
  - `FRONTEND_ORIGIN=http://localhost:3000`  
  - `RELAX_TLS=false`  
- Confirmed CORS logs:  

- Owen’s frontend will run on `http://localhost:3000` and can now make requests to the backend without CORS errors.
- Backend contract: `POST /api/ask` with `{ query, mode, verbose }`
- Modes supported: `general | retail | medical | ecommerce | restaurant`
- Backend returns JSON with `{ answer, mode, confidence, uncertainty, follow_up, citations, error }`
- Current backend tasks (Jackson):  
- ✅ Endpoint implemented with validation, modes, and uncertainty/confidence.  
- ⏳ Optional: refactor responders into `src/hive/*.js` for cleaner structure.  
- ⏳ Add Jest/supertest for testing and Postman collection for dev support.  

### Next Steps
- Owen: implement frontend fetch call, input field, mode dropdown, and error/uncertainty handling.
- Jackson: standby for testing and provide CORS/env support if Owen’s setup differs.
- Both: run test queries once frontend is hooked up.





---

## Objectives & Milestones  

**Short Term (1–2 weeks):**  
- Finalize repo structure.  
- Standardize dev environment (Node version, ESLint/Prettier).  
- Setup CI/CD skeleton (lint/test on PR).  
- Backend: add first core API route.  
- Frontend: scaffold landing page and auth flow.  

**Mid Term (2–4 weeks):**  
- Database schema + migrations.  
- Integration between frontend and backend.  
- Basic tests in place.  
- Documentation of setup instructions.  

**Long Term (4+ weeks):**  
- User-facing polish (UI/UX).  
- Advanced health/readiness probes.  
- Production deployment.  
- Stretch features.  

---

## Decisions Log  
- 9/13: Health check added at `/healthz` for readiness/liveness probes.  
- 9/14: Agreed Jackson focuses backend, Owen focuses frontend, infra shared.  
- 9/14: Copied `tenants/tableNow/config.json.txt` into main repo; deleted old duplicate project folder.  
- 9/14: Created PROJECT_NOTES.md to serve as shared log for team.
- 9/14: Created meetings/ folder in repo to hold raw meeting notes (.docx, .pdf).



---

## Open Questions  
- Which database to use? (Postgres vs. MongoDB)  
- Deployment target? (AWS, Heroku, Kubernetes, etc.)  
- CI/CD pipeline choice? (GitHub Actions, CircleCI)  
- What features need feedback first?

---

## Next Meeting Agenda  
- Decide project part ownership.  
- Discuss Codex use cases.  
- Break down objectives into deliverables.  
- Assign first tasks.  
