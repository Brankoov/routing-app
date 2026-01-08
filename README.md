## 🛠 Tech Stack

### Backend
* Språk: Java 17
* Ramverk: Spring Boot (Web, Security, Data JPA)
* Säkerhet: Spring Security (JWT-baserad autentisering)
* Databas: PostgreSQL (Körs via Docker lokalt, Supabase i produktion)

### Frontend
* Ramverk: React (byggt med Vite)
* Karta: Leaflet / React-Leaflet
* Design: Custom CSS (Mobile First-fokus)
* HTTP Client: Fetch API / Axios

### Externt API & Routing
* OpenRouteService (ORS): Används för både geokodning (adress till koordinater) och ruttoptimering (Traveling Salesman Problem).

### DevOps & Drift
* Versionshantering: GitHub
* Containerisering: Docker (för databas och backend-miljö)
* Hosting Backend: Render
* Hosting Frontend: Vercel
* Hosting Databas: Supabase