# Sims Legacy Tracker - Complete Development Roadmap

## 🔮 **AI Integration Note**

**AWS Bedrock** is used throughout this project for all AI features (Phases 4, 5, 6, 7):
- **Model**: Claude 3.5 Sonnet (via Bedrock) for primary AI features
- **Model**: Claude 3 Haiku (via Bedrock) for quick/simple tasks
- **Budget**: $400 AWS credits available
- **Integration**: Seamless with existing AWS infrastructure (Lambda, Secrets Manager)
- **Benefits**: No separate API key management, native AWS IAM, cost tracking via CloudWatch

---

## ✅ **COMPLETED: Foundation Setup**

- [x]  Project structure created  
- [x]  PostgreSQL database schema  
- [x]  Terraform infrastructure configuration  
- [x]  Local database setup and connection tested  
- [x]  Comprehensive seed data system (skills, traits, aspirations, careers, worlds, collections)  
- [x]  Pack Legacy Challenge 35 generations seeded  

---

## 🚀 **Phase 1: Foundation & Infrastructure**

**Goal:** Get the basic infrastructure running end-to-end

### Backend

- [x]  Set up Lambda function boilerplate  
- [x]  Create database connection utility (pg pool)  
- [x]  Set up API Gateway routes  
- [x]  Implement basic CORS handling  
- [x]  Create error handling middleware  
- [x]  Set up environment variable management (local vs AWS)  

### Frontend

- [x]  Scaffold React + Vite + Tailwind application  
- [x]  Set up routing (React Router)  
- [x]  Create basic layout components (Header, Sidebar, Main)  
- [x]  Set up API service layer (axios/fetch wrapper)  
- [x]  Implement basic error handling  
- [x]  Create loading states/components  

### DevOps

- [x]  Deploy Terraform infrastructure to AWS (dev environment)  
- [x]  Set up database migrations workflow  
- [x]  Configure AWS Secrets Manager for DB credentials  
- [x]  Test Lambda deployment process  
- [x]  Set up S3 for Lambda packages  

### Deliverable

- Working "Hello World" API endpoint
- Frontend can call backend and display response
- Database connection confirmed in deployed environment

---

## 🎮 **Phase 2: Core Sim Management** (Week 2)

**Goal:** Users can create, view, edit, and manage Sims

### Backend

- [x]  Create Sims CRUD endpoints:  
  - `POST /api/sims` - Create new sim
  - `GET /api/sims/:id` - Get sim details
  - `GET /api/legacies/:legacyId/sims` - Get all sims in legacy
  - `PUT /api/sims/:id` - Update sim
  - `DELETE /api/sims/:id` - Delete sim (soft delete)
- [x]  Create endpoints for sim relationships:  
  - `POST /api/sims/:id/traits` - Add trait to sim
  - `POST /api/sims/:id/skills` - Add/update skill
  - `POST /api/sims/:id/aspirations` - Add aspiration
  - `POST /api/sims/:id/careers` - Add career
- [x]  Family tree query endpoints:  
  - `GET /api/sims/:id/family-tree` - Get ancestors/descendants
  - `GET /api/sims/:id/relationships` - Get all relationships

### Frontend

- [x]  Create Sim List page (view all sims in legacy)  
- [x]  Create Sim Detail page:  
  - Display all sim information
  - Show portrait
  - Display traits, skills, aspirations, careers
  - Show family relationships
- [x]  Create Sim Form component:  
  - Dropdowns populated from reference data (traits, skills, etc.)
  - Portrait upload functionality
  - Life stage selector
  - Occult type selector
- [x]  Create "Add Trait" modal with searchable dropdown  
- [x]  Create "Add Skill" modal with level slider  
- [x]  Create "Add Aspiration" modal  
- [x]  Create "Add Career" modal with branch selection  
- [x]  Basic family tree visualization (simple tree diagram)  

### Data Management

- [x]  Reference data API endpoints:  
  - `GET /api/reference/skills`
  - `GET /api/reference/traits`
  - `GET /api/reference/aspirations`
  - `GET /api/reference/careers`
  - `GET /api/reference/worlds`

### Deliverable

- Users can create sims with full details
- Users can view sim profiles with all information
- Users can update skills/traits/aspirations/careers
- Basic family tree shows relationships

---

## 📖 **Phase 3: Generation & Legacy Tracking** (Week 3)

**Goal:** Track generations, goals, and overall legacy progress

### Backend

- [x]  Legacy CRUD endpoints:  
  - `POST /api/legacies` - Create new legacy
  - `GET /api/legacies/:id` - Get legacy details
  - `PUT /api/legacies/:id` - Update legacy
- [x]  Generation endpoints:  
  - `GET /api/legacies/:id/generations` - Get all generations
  - `GET /api/generations/:id` - Get generation details
  - `POST /api/generations/:id/start` - Start a new generation
  - `PUT /api/generations/:id/complete` - Mark generation complete
  - `GET /api/generations/:id/goals` - Get generation goals
  - `PUT /api/goals/:id/complete` - Mark goal complete
- [x]  Generation template system:  
  - `GET /api/generation-templates/:number` - Get Pack Legacy gen template
- [x]  Legacy statistics:  
  - `GET /api/legacies/:id/stats` - Total wealth, sims born, deaths, etc.
- [x]  Milestone endpoints:  
  - `GET /api/reference/milestones` - Get all milestones
  - `GET /api/reference/milestones/by-age/:lifeStage` - Get milestones for specific life stage
  - `POST /api/sims/:id/milestones` - Mark milestone achieved
  - `GET /api/sims/:id/milestones` - Get all achieved milestones for sim
  - `DELETE /api/sims/:id/milestones/:milestoneId` - Remove milestone (if added by mistake)

### Frontend

- [x]  Legacy Creation Wizard:  
  - Name your legacy
  - Choose succession laws (Gender, Bloodline, Heir, Species)
  - Select founder
  - Choose starting generation (1-35)
- [x]  Legacy Dashboard page:  
  - Display current generation
  - Show legacy statistics (wealth, sims born, deaths)
  - Display succession laws
  - Show active household members
- [x]  Generation Detail page:  
  - Display generation backstory
  - Show required goals (checklist)
  - Show optional goals (checklist)
  - Display required traits/careers
  - Show heir information
  - Mark goals complete
- [x]  Generation Timeline view:  
  - Visual timeline of all generations
  - Mark which are complete/active/upcoming
  - Click to view generation details
- [x]  Heir Selection interface:  
  - View eligible heirs based on succession laws
  - Select heir from eligible children
  - Display succession law logic
- [x]  Milestone Tracking UI (on Sim Detail page, probably an overview on the main page and but most of the content on the story tab):  
  - Section showing achieved milestones by category
  - Visual milestone badges/icons grouped by:
    - Fine Motor (Infant only)
    - Gross Motor (Infant only)
    - Cognitive (Toddler only)
    - Motor (Toddler only)
    - Firsts (All ages)
    - Life (All ages)
    - Social (All ages)
  - Timeline view of milestones achieved
  - Filterable by category
- [x]  "Add Milestone" interface:  
  - Filterable list by category and age-appropriateness
  - Search functionality
  - Show only milestones appropriate for sim's current life stage
  - Option to add notes to milestone
  - Option to link milestone to another sim (for milestones involving relationships)
  - Should probably be integrated in some way with the 'Story' tab of the SimDetails page
- [x]  Milestone suggestions:  
  - Show available milestones not yet achieved
  - Highlight milestones relevant to sim's current life stage
  - "Quick add" common milestones

### Deliverable

- Users can create a legacy with succession laws
- Users can view and track generation goals
- Users can mark goals as complete
- Generation progress is visible
- Heir selection works based on succession laws

---

## **Phase 3SUBA: We Forgot Users and Auth!**

Add Users & JWT Authentication

- [x] Database migration & backfill (users + ownership)  
- [x] JWT utilities & auth middleware  
- [x] Auth endpoints (register / login / refresh / logout)  
- [x] Authorization helpers (ownership verification)  
- [x] Update backend handlers to enforce ownership  
- [x] Terraform + Secrets Manager updates  
- [x] Frontend auth context & protected routes  
- [x] Header + UX updates for authenticated users  
- [x] Documentation updates (CLAUDE.md, env vars)  

Decisions made:

Self-hosted JWT (bcrypt + jsonwebtoken) -- no external auth providers
Email + password only (no OAuth initially)
Existing data assigned to a default admin user via migration
Phase 1: Database Migration
New file: database/migrations/007_add_auth.up.sql
New file: database/migrations/007_add_auth.down.sql

Creates:

users table (user_id UUID PK, email unique case-insensitive, password_hash, display_name, created_at, updated_at)
refresh_tokens table (token_id UUID PK, user_id FK, token_hash, expires_at, created_at, revoked_at)
Adds user_id column to legacies table (FK to users, NOT NULL after backfill)
Inserts a default admin user with known UUID 00000000-0000-0000-0000-000000000001
Backfills all existing legacies to the default admin user
Index on legacies.user_id
New file: database/scripts/seed-admin-user.js

Sets the real bcrypt password hash for the default admin user (reads password from env var)
Phase 2: Backend Auth Utilities
Install deps: bcryptjs, jsonwebtoken in backend/package.json

New file: backend/src/utils/jwt.js

getJwtSecret() -- reads from JWT_SECRET env var or JWT_SECRET_ARN via Secrets Manager (same pattern as existing pool.js)
signAccessToken({ userId, email }) -- 15-minute expiry
signRefreshToken({ userId, tokenId }) -- 7-day expiry
verifyToken(token) -- verify + decode
New file: backend/src/middleware/auth.js

withAuth(handler) middleware -- extracts Bearer token, verifies JWT, attaches event.userId and event.userEmail
Allowlist of public routes: health, /reference/*, /generation-templates/*, /auth/register, /auth/login, /auth/refresh
Returns 401 for missing/invalid/expired tokens
Modify: backend/src/index.js (line 542-544)

Chain: withErrorHandling(withAuth(handler)) instead of withErrorHandling(handler)
Phase 3: Auth Handler Endpoints
New file: backend/src/handlers/auth.js

Endpoint Handler Description
POST /auth/register register(origin, body) Validate email/password/display_name, hash password, insert user, return tokens
POST /auth/login login(origin, body) Lookup user by email, verify password, return tokens
GET /auth/me getMe(origin, userId) Return current user profile (requires auth)
POST /auth/refresh refreshTokens(origin, body) Rotate refresh token, return new token pair
POST /auth/logout logout(origin, userId, body) Revoke refresh token(s)
Modify: backend/src/index.js -- add auth route patterns and handler calls (after health check, before reference data)

Phase 4: Authorization in All Handlers (Largest Phase)
This is the most impactful phase -- it touches every handler file.

4a. Authorization helpers
New file: backend/src/utils/authorization.js

verifySimOwnership(simId, userId) -- JOINs sims -> legacies to check user_id
verifyGenerationOwnership(generationId, userId) -- JOINs generations -> legacies
verifyGoalOwnership(goalId, userId) -- JOINs goals -> generations -> legacies
4b. Thread event.userId through index.js
Modify: backend/src/index.js -- ~40 handler call sites change from:

return getAllLegacies(origin);
return createLegacy(origin, event?.body);
return getSimById(origin, simIdMatch[1]);
to:

return getAllLegacies(origin, event.userId);
return createLegacy(origin, event.userId, event?.body);
return getSimById(origin, event.userId, simIdMatch[1]);
New convention: handler(origin, userId, ...resourceIds, body?)

4c. Update handler files (all in backend/src/handlers/)
File Functions to update Authorization approach
legacies.js getAllLegacies, createLegacy, getLegacyById, updateLegacy, getLegacyStats Add WHERE user_id = $N to queries; set user_id on INSERT
sims.js createSim, getSimById, getSimsByLegacy, updateSim, deleteSim verifySimOwnership() or verifyLegacyOwnership()
generations.js getGenerationsByLegacy, getGenerationById, startGeneration, completeGeneration, getGenerationGoals, updateGoalCompletion verifyGenerationOwnership() or verifyLegacyOwnership()
heir-selection.js getEligibleHeirs, selectHeir verifyGenerationOwnership()
sim-traits.js getSimTraits, addSimTrait, removeSimTrait verifySimOwnership()
sim-skills.js getSimSkills, upsertSimSkill, removeSimSkill verifySimOwnership()
sim-aspirations.js getSimAspirations, addSimAspiration, updateSimAspiration, removeSimAspiration verifySimOwnership()
sim-careers.js getSimCareers, addSimCareer, updateSimCareer, removeSimCareer verifySimOwnership()
sim-milestones.js getSimMilestones, addSimMilestone, removeSimMilestone verifySimOwnership()
sim-relationships.js getSimRelationships, addSimRelationship, updateSimRelationship, removeSimRelationship verifySimOwnership()
family-tree.js getSimFamilyTree verifySimOwnership()
Pattern: each handler adds userId as second param. For sim sub-resources, call verifySimOwnership(simId, userId) first -- return 404 if null (avoids leaking existence of other users' data).

Phase 5: Infrastructure (Terraform)
Modify: infrastructure/ terraform files:

Add Secrets Manager secret for JWT signing key (random 64-char string)
Add JWT_SECRET_ARN to Lambda environment variables
Update IAM policy to allow reading the new secret
Modify: backend/.env -- add JWT_SECRET=<dev-secret> for local development

Phase 6: Frontend Auth Context & API Layer
New file: frontend/src/api/auth.js

loginUser(email, password), registerUser(email, password, display_name), refreshAccessToken(refresh_token), getCurrentUser(), logoutUser(refresh_token)
Modify: frontend/src/api/client.js

Inject Authorization: Bearer <token> header from localStorage on every request
On 401 response: attempt token refresh, retry original request once
On refresh failure: dispatch auth:logout custom event, clear tokens
Modify: frontend/src/api/index.js -- export auth functions

New file: frontend/src/context/authContext.js -- React Context
New file: frontend/src/context/useAuth.js -- useAuth() hook
New file: frontend/src/context/AuthProvider.jsx

On mount: check for stored token, call /auth/me to validate
Provides: { user, loading, login, register, logout, isAuthenticated }
Listens for auth:logout events from the API client
Phase 7: Frontend Pages & Route Protection
New file: frontend/src/pages/Login.jsx

Email + password form, error display, link to register, redirect on success
New file: frontend/src/pages/Register.jsx

Email + display name + password + confirm password form, redirect on success
New file: frontend/src/components/ProtectedRoute.jsx

Checks isAuthenticated from useAuth(), redirects to /login if not, shows loading spinner while checking
Modify: frontend/src/App.jsx

Add /login and /register routes outside the Layout
Wrap <Layout /> in <ProtectedRoute>
Modify: frontend/src/main.jsx

Wrap <ActiveLegacyProvider> inside <AuthProvider> (auth must init before legacy fetches)
Modify: frontend/src/components/Header.jsx

Add user display name + logout button to the right side of the nav bar
Phase 8: Update CLAUDE.md
Modify: CLAUDE.md -- document new auth endpoints, environment variables, middleware, handler signature convention, frontend auth context

Files Summary
Category New Files Modified Files
Database 3 (migration up/down, seed script) 0
Backend 4 (jwt.js, auth middleware, auth handler, authorization.js) ~13 (index.js + all handler files + package.json + .env)
Frontend 6 (auth API, authContext, useAuth, AuthProvider, Login, Register, ProtectedRoute) 4 (client.js, api/index.js, App.jsx, main.jsx, Header.jsx)
Infra 0 ~3 terraform files
Docs 0 1 (CLAUDE.md)
Verification
Backend (curl/httpie via dev server on port 3001):

POST /auth/register with email/password/display_name -- expect 201 + tokens
POST /auth/login with valid creds -- expect 200 + tokens
POST /auth/login with bad creds -- expect 401
GET /auth/me without token -- expect 401
GET /auth/me with valid token -- expect 200 + user
GET /legacies without token -- expect 401
GET /legacies with token -- expect only that user's legacies
GET /reference/skills without token -- expect 200 (public)
Create user B, create legacy under B, verify user A cannot access it
POST /auth/refresh -- expect new token pair
POST /auth/logout -- expect refresh token revoked
Frontend (browser):

Navigate to / unauthenticated -- redirects to /login
Register new account -- redirects to home, legacies load
Header shows display name + logout button
Logout -- redirects to /login
Login -- redirects to home
Token refresh works silently (test by shortening access token expiry)
Risks
Phase 4 is large (~40 call sites + ~25 handler functions). Mitigation: mechanical change, same pattern everywhere. Do in one pass.
ActiveLegacyProvider calls getLegacies() on mount, which now requires auth. Mitigation: ProtectedRoute prevents Layout rendering until auth resolves.
localStorage tokens vulnerable to XSS. Acceptable for this app's threat model (personal Sims tracking tool). Can migrate to httpOnly cookies later.

---

## 🤖 **Phase 4: AI Agent Integration** (Week 4)

**Goal:** Conversational AI agent that helps with storytelling and tracking

### Backend

- [ ]  **AWS Bedrock Integration:**  
  - Set up AWS Bedrock access in your AWS account
  - Configure IAM roles/policies for Lambda to access Bedrock
  - Create Bedrock service wrapper in backend
  - Choose model: Claude 3.5 Sonnet (via Bedrock) for best balance of quality/cost
  - Implement streaming responses for better UX
- [ ]  AI Agent endpoints:  
  - `POST /api/agent/chat` - Send message to agent (supports streaming)
  - `GET /api/agent/conversation/:legacyId` - Get conversation history
  - `POST /api/agent/generate-story` - Generate story for sim/generation
  - `POST /api/agent/suggest-goals` - Get goal suggestions
- [ ]  Context building for agent:  
  - Package legacy data (sims, generations, goals, milestones)
  - Include current household state
  - Add relevant Pack Legacy Challenge rules
  - Build system prompt with user's legacy context
- [ ]  Conversation persistence:  
  - Store agent conversations in database
  - Link conversations to legacies
  - Track token usage for cost monitoring

### Infrastructure (Terraform)

- [ ]  **Bedrock Access Configuration:**
  - Add IAM policy allowing Lambda to invoke Bedrock models
  - Specific permissions: `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`
  - Add Bedrock model ARNs to Lambda environment variables
  - Configure VPC endpoints for Bedrock (optional, for cost savings)
- [ ]  **Cost Monitoring:**
  - Set up CloudWatch metrics for Bedrock usage
  - Configure cost alerts if usage exceeds thresholds
  - Track tokens per request for budget management

### Backend Implementation Details

- [ ]  **Bedrock Service Wrapper** (`backend/src/services/bedrock.js`):
  ```javascript
  // Example structure:
  class BedrockService {
    constructor() {
      this.client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
      this.modelId = "anthropic.claude-3-5-sonnet-20241022-v2:0"; // Sonnet 3.5
    }
    
    async invokeModel(prompt, systemPrompt, options = {}) {
      // Invoke Bedrock with Claude
      // Handle streaming if needed
      // Return response + token usage
    }
    
    async streamResponse(prompt, systemPrompt, onChunk) {
      // Stream responses for real-time chat experience
    }
  }
  ```
- [ ]  **Context Builder** (`backend/src/services/context-builder.js`):
  - Build system prompt with legacy details
  - Format sim data, generations, goals, milestones
  - Include Pack Legacy Challenge rules
  - Keep context under token limits
- [ ]  **Cost Tracking:**
  - Log input/output tokens per request
  - Store in database for analytics
  - Create endpoint to view usage stats

### Frontend

- [ ]  AI Agent Chat Interface:  
  - Chat panel (can be sidebar or full page)
  - Message history display with markdown rendering
  - Input field with send button
  - Loading states with streaming text (typewriter effect)
  - Token usage indicator (optional)
- [ ]  Agent features:  
  - "Suggest what my heir should do next"
  - "Write a summary of Generation X"
  - "Generate a dramatic event for my family"
- [ ]  Integration with existing pages:  
  - Quick-access agent icon in header

### Agent Capabilities
- [ ]  End of play wrapup. A user can give the agent a summary of what happened during their play session (ex "My sim Lavender was promoted twice and raised her cooking skill to level 7") and the agent would update any relevent data related to the conversation
- [ ]  Answer questions about legacy/sims/generations  
- [ ]  Generate narrative summaries  
- [ ]  Suggest next steps based on goals  
- [ ]  Help with heir selection decisions  
- [ ]  Create dramatic story prompts  
- [ ]  Track legacy statistics in conversation  

### Database Changes

- [ ]  **Conversation Storage:**
  ```sql
  conversations (
    conversation_id UUID PRIMARY KEY,
    legacy_id UUID REFERENCES legacies,
    user_id UUID REFERENCES users,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )
  
  messages (
    message_id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations,
    role TEXT, -- 'user' or 'assistant'
    content TEXT,
    input_tokens INT,
    output_tokens INT,
    created_at TIMESTAMP
  )
  ```

### Cost Considerations

- **Claude 3.5 Sonnet via Bedrock pricing** (as of Jan 2025):
  - Input: ~$3 per million tokens
  - Output: ~$15 per million tokens
- **Your $400 budget estimate:**
  - ~133M input tokens OR ~27M output tokens
  - Mix: ~50M input + ~15M output = plenty for development!
- **Optimization strategies:**
  - Cache system prompts when possible
  - Summarize long conversations to stay under context limits
  - Use cheaper models for simple tasks (Haiku for quick responses)

### Deliverable

- Users can chat with AI agent about their legacy
- Agent has full context of legacy data via Bedrock
- Agent can generate stories and suggestions
- Conversation history is saved
- Token usage tracked for cost monitoring
- Streaming responses for better UX

---

## 🎲 **Phase 5: AI Challenge Generator** (Week 5)

**Goal:** Generate unique, personalized legacy challenges based on user's owned packs

### The Vision

Players get stuck in gameplay routines. The AI Challenge Generator creates fresh, unique challenges that:

- Are tailored to packs the user owns
- Can be any length (5-50 generations)
- Feature compelling backstories and goals
- Push players to try new gameplay styles
- Are infinitely replayable

### Backend

- [ ]  Challenge generation endpoints:  
  - `POST /api/challenges/generate` - Generate new challenge
  - `GET /api/challenges/:id` - Get challenge details
  - `GET /api/challenges/templates` - Get existing challenge templates
  - `POST /api/challenges/regenerate-generation/:challengeId/:genNum` - Regenerate single generation
  - `POST /api/challenges/save/:challengeId` - Save generated challenge
  - `GET /api/challenges/my-challenges` - Get user's saved challenges
  - `POST /api/legacies/create-from-challenge/:challengeId` - Start legacy with challenge
- [ ]  **AWS Bedrock Integration for Challenge Generation:**  
  - Use Claude 3.5 Sonnet via Bedrock for complex multi-generation challenges
  - Consider Claude 3 Haiku via Bedrock for quick single-generation tweaks
  - Implement prompt engineering for consistent JSON output
  - Smart pack usage algorithm (ensures all owned packs used)
  - Goal generation (balanced, thematic, difficulty-appropriate)
  - Backstory generation (builds on previous generations)
  - Trait/career selection (thematically appropriate)
  - Challenge naming (AI-generated creative names)
- [ ]  Challenge database schema:  
  - `challenges` table (stores generated challenges)
  - `challenge_generations` table (generation templates)
  - `legacy_challenges` table (links legacies to challenges)
  - Track generation metadata (model used, tokens, generation time)

### Challenge Generation Logic

- [ ]  **Pack Distribution:**  
  - Ensure each owned pack used at least once
  - Combine packs creatively ("University vampire detective")
  - Suggest pack-specific worlds per generation
- [ ]  **Goal Generation:**  
  - Balance skill maxing, aspiration completion, career progression
  - Create thematic cohesion (goals support backstory)
  - Adjust difficulty based on user preference
  - Mix gameplay styles (building, relationships, skills, careers, collections)
  - Include unique/creative challenges ("Never use a bed, only nap")
- [ ]  **Backstory Generation:**  
  - Build on previous generation's story
  - Create family drama and conflicts
  - Suggest character arcs
  - Tie into pack themes organically
- [ ]  **Smart Randomization:**  
  - Trait compatibility (no contradictions)
  - Aspiration-trait matching
  - Career-skill alignment
  - Thematic consistency across generations

### Bedrock-Specific Implementation

- [ ]  **Challenge Generation Service** (`backend/src/services/challenge-generator.js`):
  ```javascript
  class ChallengeGenerator {
    constructor(bedrockService) {
      this.bedrock = bedrockService;
    }
    
    async generateChallenge(params) {
      // params: ownedPacks, generationCount, style, theme, difficulty
      // Build prompt with constraints
      // Call Bedrock with structured output request
      // Parse and validate JSON response
      // Return challenge object
    }
    
    async regenerateGeneration(challengeId, genNumber) {
      // Load existing challenge
      // Generate replacement for specific generation
      // Maintain consistency with surrounding generations
    }
  }
  ```
- [ ]  **Prompt Engineering:**
  - Request structured JSON output from Claude
  - Include schema validation in prompts
  - Use examples of good vs bad challenge designs
  - Implement retry logic for invalid outputs
- [ ]  **Cost Optimization:**
  - Cache common pack combination patterns
  - Reuse backstory elements for similar themes
  - Use Haiku for simple regenerations
  - Batch multiple generation requests when possible

### Frontend

- [ ]  **Challenge Generator Page:**  #phase/challenges #status/backlog
  - Pack selector (checkboxes for all packs)
  - Generation count slider (5-50)
  - Style selector:
    - ○ Use existing template (Not So Berry, Pack Legacy, etc.)
    - ● Generate completely unique challenge
    - ○ Hybrid (mix templates + unique)
  - Theme selector (optional):
    - Dropdown: Rags to Riches, Occult Family, Criminal Empire, etc.
    - Custom text input: "Or describe your own theme..."
  - Difficulty selector: Casual / Standard / Hardcore
  - "Generate Challenge" button with loading state
- [ ]  **Challenge Preview/Detail Page:**  #phase/challenges #status/backlog
  - Challenge overview (name, description, generation count)
  - Generation cards (expandable to see all details)
  - Visual timeline
  - Pack requirements display
  - "Regenerate" buttons (whole challenge or individual generations)
  - "Start Legacy with This Challenge" button
  - "Export" options (PDF/Markdown for sharing)
- [ ]  **Challenge Library Page:**  #phase/challenges #status/backlog
  - Browse existing templates (Not So Berry, Pack Legacy, etc.)
  - View user's generated challenges
  - Search/filter challenges
  - "Use this challenge" button
- [ ]  **Legacy Creation Integration:**  #phase/challenges #status/backlog
  - Option to "Use a Challenge" vs "Freeform Legacy"
  - Select from library or generate new challenge
  - Challenge goals automatically populate generation tracking

### Challenge Variations (Advanced Features)

- [ ]  **"Surprise Me!" Mode:**  #phase/challenges #status/backlog
  - One-click random generation
  - Completely wild combinations
  - "Your heir must be a vegetarian vampire detective on a houseboat"
- [ ]  **"Remix" Mode:**  #phase/challenges #status/backlog
  - Take existing challenge (Not So Berry)
  - AI adapts it to user's owned packs
  - Keeps spirit but customizes content
- [ ]  **"Story Arc" Mode:**  #phase/challenges #status/backlog
  - User provides story concept: "Family curse spanning generations"
  - AI creates challenge that tells that story
  - Each generation advances the narrative
- [ ]  **"Chaos Mode":**  #phase/challenges #status/backlog
  - Each generation completely random
  - No thematic throughline
  - Pure chaos and adaptability

### Database Schema

```sql
-- Store generated challenges
challenges (
  challenge_id UUID PRIMARY KEY,
  challenge_name TEXT,
  description TEXT,
  generation_count INT,
  owned_packs TEXT[],
  style TEXT, -- template, unique, hybrid
  theme TEXT,
  difficulty TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMP
)

-- Challenge generations (templates)
challenge_generations (
  challenge_generation_id UUID PRIMARY KEY,
  challenge_id UUID REFERENCES challenges,
  generation_number INT,
  pack_focus TEXT,
  generation_name TEXT,
  color_theme TEXT,
  backstory TEXT,
  required_goals JSONB[],
  optional_goals JSONB[],
  required_traits TEXT[],
  career TEXT,
  career_branch TEXT,
  world_restriction TEXT,
  unique_restrictions TEXT[],
  story_hooks TEXT[]
)

-- Link legacies to challenges
legacy_challenges (
  legacy_id UUID REFERENCES legacies,
  challenge_id UUID REFERENCES challenges
)
```

### AI Agent Integration

- [ ]  Generate challenges conversationally:  #phase/challenges #status/backlog
  - User: "Generate me a 10-generation vampire dynasty using only occult packs"
  - Agent: Creates custom challenge on the fly
- [ ]  Dynamic difficulty adjustment:  #phase/challenges #status/backlog
  - User: "Make generation 5 harder, I'm bored"
  - Agent: Regenerates gen 5 with more challenging goals
- [ ]  New pack integration:  #phase/challenges #status/backlog
  - User: "I just got Horse Ranch! Add it to my current challenge"
  - Agent: Suggests how to incorporate new pack

### Example Generated Challenge

```
Challenge Name: "The Spectrum Shift"
Theme: Colors + Occult
Generations: 7
Difficulty: Standard

Gen 1 (Red/Vampire): "The Blood Moon Rising"
- Become a vampire
- Max Pipe Organ skill
- Complete Vampire Family aspiration
- Paint only in shades of red
- Required traits: Gloomy, Creative, Night Owl

Gen 2 (Orange/Werewolf): "The Autumn Transformation"  
- Become a werewolf
- Max Wellness and Fitness
- Run a vet clinic (orange logo)
- Live in Brindleton Bay
- Required traits: Active, Dog Lover, Hot-Headed

Gen 3 (Yellow/Spellcaster): "The Golden Age"
- Become a spellcaster
- Max all 3 magic skills
- Own a retail magic shop
- Wear only yellow/gold clothing
- Required traits: Cheerful, Bookworm, Ambitious
```

### Deliverable

- Users can generate completely unique challenges based on owned packs using AWS Bedrock
- AI creates compelling backstories and thematic goals via Claude 3.5 Sonnet
- Challenges can be any length (5-50 generations)
- "Regenerate" functionality for flexibility
- Challenges integrate with legacy creation
- Export challenges for sharing with community
- Infinite replayability - never run out of fresh challenges
- Token usage and costs tracked for budget management

---

## 🎲 **Phase 6: Pre-Generated Backstory (Random Generation)** (Week 6)

**Goal:** Allow users to start at any generation with AI-generated backstory

### Backend

- [ ]  Random generation service:  
  - `POST /api/legacies/create-with-backstory` - Create legacy with pre-gen
  - Algorithm to generate complete sims for past generations
  - Respect succession laws when generating heirs
  - Generate family trees (spouses, siblings, relationships)
  - Mark goals as complete for past generations
- [ ]  Generation logic:  
  - Random trait selection (from generation requirements)
  - Random spouse generation
  - Random children (2-5 per generation)
  - Heir selection based on succession laws
  - Random life events (births, marriages, deaths)
  - Random skill/career completion
  - Random collection progress
- [ ]  AI-generated backstories:  
  - `POST /api/agent/generate-backstory/:generationId` - Generate story
  - Create compelling narratives for pre-generated sims
  - Generate family chronicles for past generations
  - Create "legacy lore" documents

### Frontend

- [ ]  Enhanced Legacy Creation Wizard:  
  - Step 3: "Starting Generation" selector
  - Option to "Skip ahead - generate backstory"
  - Slider/dropdown to choose starting generation (1-35)
- [ ]  Pre-Generation Preview:  
  - Show generated family tree
  - Display brief summaries of each generation
  - Show key stats (wealth, sims born, deaths)
  - "Re-roll" button to regenerate if not satisfied
- [ ]  Pre-Generated Indicator:  
  - Badge on pre-generated sims ("Backstory")
  - Visual distinction in family tree (grayed out or different style)
  - "Legacy Lore" section for pre-generated content
- [ ]  Backstory Viewer:  
  - Read AI-generated chronicles for past generations
  - View pre-generated sim profiles
  - See family dynamics and relationships

### Database Changes

- [ ]  Add `is_pre_generated` field to `sims` table  
- [ ]  Add `is_pre_generated` field to `generations` table  
- [ ]  Track generation metadata (generation_date, generator_version)  

### Smart Generation Rules

- [ ]  Trait compatibility (no conflicting traits)  
- [ ]  Genetic inheritance (occult status, traits)  
- [ ]  Succession law adherence (correct heir selection)  
- [ ]  Required goals completion for each generation  
- [ ]  Spouse trait generation (compatible with heir)  
- [ ]  Collection progress across generations  
- [ ]  Wealth accumulation logic  

### Deliverable

- Users can create a legacy starting at any generation  
- System generates complete backstory for all previous generations  
- AI creates compelling narratives for pre-generated content  
- Users can "re-roll" if they don't like the generation  
- Pre-generated content is clearly marked but fully integrated  

---

## 🌱 **Phase 7: Living Sim Auto-Generation** (Week 7)

**Goal:** Auto-generate traits/aspirations/life events for non-heir sims

### Backend

- [ ]  Auto-generation service:  
  - `POST /api/sims/:id/auto-generate-traits` - Generate traits for aging up
  - `POST /api/sims/:id/auto-generate-aspiration` - Pick aspiration
  - `POST /api/sims/:id/auto-generate-life-event` - Create random event
  - `PUT /api/sims/:id/auto-generation-settings` - Configure auto-gen level
- [ ]  Auto-generation logic:  
  - Age-appropriate trait selection
  - Aspiration matching to traits
  - Genetic trait inheritance (parents' traits influence children)
  - Random skill progression for non-heirs
  - Random relationship formation (friends, romances)
  - Random life events (promotions, achievements, drama)
- [ ]  Auto-event tracking:  
  - Store auto-generated events in `sim_auto_events` table
  - Allow user to approve/reject/override
  - AI can narrate what happened

### Frontend

- [ ]  Age-Up Notification System:  
  - Modal/notification when sim ages up
  - "Auto-generate personality?" prompt
  - Preview of what will be generated
  - Option to manually choose instead
- [ ]  Sim Profile Auto-Gen UI:  
  - "🎲 Auto-Generate Personality" button
  - "🎲 Generate Life Event" button
  - Toggle "Auto-Pilot Mode" for non-heirs
  - Display auto-generated events timeline
- [ ]  Legacy Settings - Automation:  
  - Configure auto-generation preferences:
    - ○ Fully Manual (I choose everything)
    - ● Semi-Automated (Auto-generate traits, I choose major decisions)
    - ○ Fully Automated (System generates everything for non-heirs)
  - When sim ages up:
    - ☑ Notify me and offer auto-generation
    - ☐ Always auto-generate for non-heirs
    - ☐ Never auto-generate
- [ ]  Non-Heir Activity Feed:  
  - "What's happening with your family?" section
  - Shows recent auto-generated events
  - "Sofia made a new friend!"
  - "Elena got promoted!"
  - "Thomas learned to walk!"

### Database Changes

- [ ]  Add to `sims` table:  
  - `auto_generation_enabled` (boolean)
  - `auto_generation_level` (enum: none, traits_only, semi_auto, full_auto)
  - `last_auto_generation_date` (timestamp)
- [ ]  Create `sim_auto_events` table:  
  - `event_id` (PK)
  - `sim_id` (FK)
  - `event_type` (trait_assigned, aspiration_chosen, skill_gained, etc.)
  - `event_description`
  - `generation_date`
  - `user_can_override` (boolean)
  - `was_overridden` (boolean)

### Smart Randomization

- [ ]  Trait compatibility checks (no contradictions)  
- [ ]  Weighted trait inheritance from parents  
- [ ]  Aspiration-trait matching  
- [ ]  Life event probability based on traits:  
  - Ambitious sims get promoted faster
  - Romantic sims form relationships easier
  - Active sims gain fitness skill
- [ ]  Sibling dynamics (rivalry, friendships)  
- [ ]  Age-appropriate events  

### AI Agent Integration

- [ ]  Generate narrative descriptions of auto-events  
- [ ]  "Tell me about [non-heir sim]" command  
- [ ]  Suggest dramatic events for non-heirs  
- [ ]  Create sibling rivalry/drama storylines  
- [ ]  "Where are they now?" updates for moved-out sims  
 
### For Infants/Toddlers Specifically

- [ ]  Random toddler trait assignment
- [ ]  Quirk/preference generation
- [ ]  Early skill development (walking, talking, potty)

### For Children Aging to Teen

- [ ]  Childhood aspiration completion (random)
- [ ]  Teen trait assignment
- [ ]  Teen aspiration selection
- [ ]  School performance level
- [ ]  Part-time job (optional, random)

### For Teens Aging to Young Adult

- [ ]  Final trait slot
- [ ]  Graduation status (honors, normal, dropout)
- [ ]  University decision (random based on traits)
- [ ]  Starting career path
- [ ]  Move-out decision for non-heirs

### Deliverable

- Non-heir sims can have traits/aspirations auto-generated
- Users get notifications when sims age up with auto-gen option
- Auto-generated life events keep non-heirs feeling alive
- Users can configure automation level per legacy
- AI narrates what's happening with non-heirs
- "Re-roll" functionality if user doesn't like auto-generation

---

## 🎨 **Phase 8: Enhanced UI/UX & Polish** (Week 8)

**Goal:** Make the app beautiful, intuitive, and delightful to use

### Visual Design

- [ ]  Design system/component library:  
  - Color palette (Sims-inspired?)
  - Typography system
  - Button styles
  - Card components
  - Form styling
- [ ]  Iconography:  
  - Custom icons for skills, traits, aspirations
  - Life stage icons
  - Occult type icons
  - Generation icons
- [ ]  Animations and transitions:  
  - Page transitions
  - Loading skeletons
  - Smooth hover effects
  - Celebration animations (when goals complete)

### Family Tree Visualization

- [ ]  Interactive family tree:  
  - Zoom and pan
  - Clickable nodes (open sim profile)
  - Show portraits
  - Color-code by life stage or generation
  - Highlight heir lineage
  - Show marriages (connecting lines)
  - Display ghosts (deceased sims)

### Dashboard Improvements

- [ ]  Legacy Overview:  
  - Visual generation progress bar
  - Key statistics cards with icons
  - Recent activity feed
  - Quick actions (add sim, start new generation, chat with AI)
- [ ]  Generation Progress Widgets:  
  - Goal completion percentage
  - Required vs optional goals
  - Skills/careers/traits tracking visual

### Enhanced Sim Profiles
 
- [ ]  Portrait gallery (multiple photos per sim)  
- [ ]  Life story timeline (visual events timeline)  
- [ ]  Relationship graph (visual connections)  
- [ ]  Skill progress bars with visual indicators  
- [ ]  Career ladder visualization  
- [ ]  Aspiration progress tracking  

### Mobile Responsiveness

- [ ]  Responsive layouts for all pages  
- [ ]  Mobile-optimized navigation  
- [ ]  Touch-friendly interactions  
- [ ]  Mobile family tree view  

### Quality of Life Features

- [ ]  Search functionality (find sims, generations)  
- [ ]  Filters (view only living sims, filter by generation, etc.)  
- [ ]  Sorting options (by name, age, generation, etc.)  
- [ ]  Bulk actions (mark multiple goals complete, etc.)  
- [ ]  Keyboard shortcuts  
- [ ]  Dark mode support  

### Performance

- [ ]  Lazy loading for large family trees  
- [ ]  Pagination for sim lists  
- [ ]  Image optimization (compressed portraits)  
- [ ]  Caching strategy for reference data  
- [ ]  Optimistic UI updates  

### Deliverable

- Beautiful, polished UI that's joy to use
- Interactive family tree visualization
- Mobile-friendly design
- Fast, responsive experience
- Delightful micro-interactions

---

## 🔧 **Phase 9: Advanced Features & Integrations** (Future)

**Goal:** Power-user features and extended functionality

### Screenshot Integration

- [ ]  Upload screenshots to legacy/generation/sim  
- [ ]  Image gallery view  
- [ ]  Tag sims in screenshots (auto-detect using AI?)  
- [ ]  Generate captions using AI  
- [ ]  Screenshot timeline view  

### Collection Tracking

- [ ]  Collection progress UI  
- [ ]  Mark individual items as found  
- [ ]  Track which sim found which item  
- [ ]  Collection completion notifications  
- [ ]  Visual collection display  

### Custom Challenge Support

- [ ]  Create custom challenge rules (not just Pack Legacy)  
- [ ]  Challenge template builder  
- [ ]  Share custom challenges with community  
- [ ]  Import/export challenge definitions  

### Social Features

- [ ]  Share legacy publicly (read-only link)  
- [ ]  Legacy showcase gallery  
- [ ]  Export legacy as blog post  
- [ ]  Social media sharing (generate summary cards)  

### Advanced AI Features

- [ ]  "What if?" scenarios (AI explores alternate outcomes)  
- [ ]  Family drama generator  
- [ ]  Writing prompts based on current state  
- [ ]  Generate heir selection arguments (for Democracy law)  
- [ ]  Story arc suggestions (multi-generation plots)  

### Analytics & Insights

- [ ]  Legacy statistics dashboard  
- [ ]  Trait distribution charts  
- [ ]  Career path analysis  
- [ ]  Wealth progression graph  
- [ ]  Generation completion times  
- [ ]  Most/least used skills  

### Import/Export

- [ ]  Export legacy as JSON  
- [ ]  Import legacy from JSON  
- [ ]  Backup/restore functionality  
- [ ]  Export as PDF (printable chronicle)  

---

## 🚀 **Phase 10: Electron Desktop App + Obsidian Integration** (Stretch Goal)

**Goal:** Package web app as desktop application with file system access and Obsidian markdown generation

### Electron Setup

- [ ]  Electron project structure  
- [ ]  Bundle React app in Electron  
- [ ]  Set up IPC (Inter-Process Communication)  
- [ ]  Configure electron-builder for packaging  

### Desktop-Specific Features

- [ ]  Direct Obsidian vault integration:  
  - User selects their Obsidian vault folder
  - App writes .md files directly to vault
  - Auto-sync on changes
- [ ]  Obsidian markdown generation:  
  - Generate sim profiles as markdown
  - Generate generation chronicles as markdown
  - Generate full legacy documents
  - Generate family tree (text format)
  - All with proper frontmatter (YAML metadata)
  - Internal links between files [[Sim Name]]
- [ ]  Markdown Templates:  
  - Sim Profile Template (with traits, skills, aspirations, family, story)
  - Generation Chronicle Template (backstory, goals, family members)
  - Legacy Overview Template (succession laws, statistics, generations)
- [ ]  Local file system access:  
  - Store screenshots locally
  - Manage portrait images
  - Create backup files
- [ ]  System tray integration:  
  - Quick access to app
  - Notifications for sim age-ups
- [ ]  Native menus and keyboard shortcuts  
 
### Offline Support

- [ ]  Local SQLite database (optional offline mode)  
- [ ]  Sync with cloud database when online  
- [ ]  Offline-first architecture  

### Distribution

- [ ]  Build for Windows, macOS, Linux  
- [ ]  Auto-updater functionality  
- [ ]  Installation packages (.exe, .dmg, .AppImage)  

### Deliverable

- Desktop app for Windows/Mac/Linux
- Direct Obsidian vault integration
- Better file management than web app
- Offline functionality

---

## 📋 **Ongoing Throughout All Phases**

### Testing

- [ ]  Unit tests for backend logic
- [ ]  Integration tests for API endpoints
- [ ]  Frontend component tests
- [ ]  End-to-end tests for critical flows
- [ ]  Load testing for database queries

### Documentation

- [ ]  API documentation (OpenAPI/Swagger)
- [ ]  User guide
- [ ]  Developer setup guide
- [ ]  Architecture documentation
- [ ]  Deployment guide

### Security

- [ ]  Input validation and sanitization
- [ ]  SQL injection prevention
- [ ]  CORS configuration
- [ ]  Rate limiting
- [ ]  Authentication (if adding user accounts later)
- [ ]  Secrets management (API keys, DB credentials)

### Monitoring & Logging

- [ ]  Error logging (CloudWatch)
- [ ]  Performance monitoring
- [ ]  Usage analytics (optional, privacy-respecting)
- [ ]  Database query performance monitoring

---

## 🎯 **Success Metrics**

By the end of development, the app should enable users to:

1. ✅ Track a complete Sims 4 Pack Legacy Challenge (35 generations)
2. ✅ Manage all sims with full details (traits, skills, aspirations, careers)
3. ✅ Visualize family trees across generations
4. ✅ Track generation goals and progress
5. ✅ Chat with AI agent for storytelling help
6. ✅ **Generate infinite unique challenges tailored to owned packs**
7. ✅ Start at any generation with auto-generated backstory
8. ✅ Auto-generate non-heir sim personalities and life events
9. ✅ Have a delightful, polished user experience
10. ✅ (Stretch) Export beautiful Obsidian markdown files via desktop app