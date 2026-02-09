"soft, feminie, techy" vibe

### A) App shell (all pages)

**Layout:**

- Left sidebar (surface) with big rounded nav pills
    
- Top header (surface2) with:
    
    - legacy switcher
        
    - search
        
    - “✨ Ask AI” button
        
    - quick add sim (+)
        

**Design touches:**

- Sidebar icons: simple line icons + pastel highlight on active
    
- Tiny “sparkle” accents near active nav (pure CSS, subtle)
    

---

### B) Legacy Dashboard (home)

**Hero row**

- “Current Generation” card (big)
    
    - pack icon + generation name
        
    - goal completion ring (mint -> yellow gradient)
        
    - “Continue Generation” CTA
        

**Stats cards (4 across on desktop)**

- Wealth, Sims born, Deaths, Collections progress
    
- Each card has a small top-right sticker badge (⭐ / 🌙 / ✨)
    

**Activity feed**

- “Sofia aged up to Teen” (mint)
    
- “Goal completed: Max Singing” (yellow)
    
- “Drama: spouse left the lot…” (pink/coral)
    

---

### C) Sim List

**Two-pane layout**

- Left: filters in a card (generation, life stage, occult, living/deceased)
    
- Right: grid of “Sim cards”:
    
    - portrait circle
        
    - name + gen badge
        
    - quick chips: traits/occult/life stage
        
    - a tiny progress strip for aspirations/skills
        

**Interaction**

- Hover = soft glow + lift (`hover:-translate-y-0.5` + `shadow-glowMint`)
    

---

### D) Sim Detail

**Header**

- Big portrait + name + “Heir” badge
    
- Right side: quick actions
    
    - “Add Trait”
        
    - “Add Skill”
        
    - “Ask AI about this Sim”
        

**Tabs**

- Overview | Traits | Skills | Career | Relationships | Story
    
- Tab indicator is a pastel underline (pink/mint/yellow depending on tab)
    

**Story panel**

- Looks like a cute “journal card”
    
- Includes AI summaries and your manual notes
    
- A “sparkly” button: “Generate a scene / prompt”
    

---

### E) Generation Detail

**Three-column feel**

1. Backstory card (scrollable, pretty)
    
2. Goals checklist card (required + optional)
    
3. “Requirements” card (traits/career/skills chips)
    

**Delight moment**

- When a goal is checked:
    
    - confetti _lite_ (tiny sparkles)
        
    - progress ring animates
        
    - optional “write a recap” button appears
        

---

### F) Generation Timeline

**Vertical timeline**

- Each generation is a “pill card” with:
    
    - status dot (mint active, muted complete, lilac upcoming)
        
    - pack badge
        
    - mini stats (goals done)
        
- Clicking opens the generation details in a slide-over panel.
    

This matches the “calendar / advent” illustration vibe you included: playful milestones and numbered nodes.

---

### G) AI Agent Chat

**Right-side dock**

- Always available as a collapsible bubble (“✨”)
    
- When open: chat in a tall rounded panel with:
    
    - message bubbles as soft cards
        
    - assistant messages have a tiny sparkle avatar
        
    - quick prompts as chips:
        
        - “Summarize this generation”
            
        - “Suggest next goals”
            
        - “Help choose heir”


