# Project Notes  

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

---

## Next Meeting Agenda  
- Decide project part ownership.  
- Discuss Codex use cases.  
- Break down objectives into deliverables.  
- Assign first tasks.  
