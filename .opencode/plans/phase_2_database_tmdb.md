# Phase 2: Search UI & Movie Cards

**Goal:** Build the Search view UI with mock data to establish the visual design before integrating TMDB API.

**Prerequisites:** Phase 1 completed - navigation shell with placeholder views

---

## Strategy

Build UI components first with **mock/dummy data** to:
1. Establish visual design and layout
2. Test user interactions and flow
3. Identify UX issues early
4. Iterate quickly without API dependencies

**Database and TMDB API integration will come in Phase 3.**

---

## Tasks

### 1. Movie Card Widget

**File:** `src/widgets/movie-card.js`

Create reusable movie card widget with mock data:
- `AdwBin` or `GtkBox` as container
- Poster image placeholder (gray box with film icon)
- Movie title (bold)
- Year (subdued text)
- Clickable with hover effect
- Fixed size for grid layout (e.g., 150x225 for poster)
- Uses libadwaita styling

**Mock data example:**
```javascript
{
  id: 1,
  title: "Inception",
  year: 2010,
  poster_path: null  // Will show placeholder
}
```

---

### 2. Search View Layout

**File:** `src/views/search-view.js`

Replace placeholder with search UI:

**Layout:**
```
┌─────────────────────────────────────┐
│  [Search Entry - "Search movies"]   │
├─────────────────────────────────────┤
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │Movie │  │Movie │  │Movie │     │
│  │Card  │  │Card  │  │Card  │     │
│  │  1   │  │  2   │  │  3   │     │
│  └──────┘  └──────┘  └──────┘     │
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │Movie │  │Movie │  │Movie │     │
│  │Card  │  │Card  │  │Card  │     │
│  │  4   │  │  5   │  │  6   │     │
│  └──────┘  └──────┘  └──────┘     │
│                                     │
└─────────────────────────────────────┘
```

**Components:**
- `GtkSearchEntry` at top with placeholder text
- `GtkScrolledWindow` for scrollable content
- `GtkFlowBox` for responsive grid of movie cards
- Proper spacing and margins using libadwaita style classes

**Mock data:** 8-10 hardcoded movies to test layout

---

### 3. Movie Details Dialog

**File:** `src/widgets/movie-details-dialog.js`

Create movie details dialog using `AdwDialog`:

**Layout:**
```
┌────────────────────────────────────────┐
│  [X Close]                             │
│                                        │
│  ┌────────┐  Title (2010)             │
│  │        │  ★★★★☆ 8.5/10             │
│  │ Poster │  2h 28min • Action, Sci-Fi│
│  │        │                            │
│  └────────┘  Director: Christopher... │
│                                        │
│  Overview:                             │
│  A thief who steals corporate         │
│  secrets through dream-sharing...     │
│                                        │
│  [Future action buttons placeholder]  │
│                                        │
└────────────────────────────────────────┘
```

**Components:**
- `AdwDialog` container
- Two-column layout: poster (left) + info (right)
- Title as `AdwWindowTitle` or large label
- Star rating display (read-only for now)
- Runtime, genres as chips/pills
- Director info
- Overview text in scrollable area
- Placeholder for action buttons (grayed out)

**Mock data:** Use one of the hardcoded movies

---

### 4. Connect Search View to Movie Details

**File:** `src/views/search-view.js`

Wire up interaction:
- Clicking a movie card opens the details dialog
- Pass movie data to dialog
- Dialog shows over main window
- Close button dismisses dialog

---

### 5. Empty States

Add proper empty states to search view:

**States:**
1. **Initial state** (no search yet)
   - `AdwStatusPage` with search icon
   - "Search for Movies"
   - "Find movies from TMDB" description

2. **No results state** (for future - show placeholder)
   - `AdwStatusPage` with emoji or icon
   - "No results found"
   - "Try different keywords"

Show initial state by default, switch to grid when "searching" (even with mock data).

---

### 6. Mock Data Helper

**File:** `src/utils/mock-data.js`

Create mock data for testing:
```javascript
export const MOCK_MOVIES = [
  {
    id: 1,
    title: "Inception",
    year: 2010,
    poster_path: null,
    overview: "A thief who steals corporate secrets...",
    runtime: 148,
    genres: "Action, Sci-Fi, Thriller",
    director: "Christopher Nolan",
    tmdb_rating: 8.8
  },
  // ... 8-10 more movies
];
```

---

### 7. Styling and Polish

- Use libadwaita style classes (`card`, `toolbar`, etc.)
- Proper spacing and padding
- Responsive grid (adjusts columns based on window width)
- Smooth transitions
- Hover effects on cards
- Proper focus handling for keyboard navigation

---

### 8. Update Meson Build

**Files:** `src/io.github.ausathdzil.lounge.src.gresource.xml`

Register new files:
- `widgets/movie-card.js`
- `widgets/movie-details-dialog.js`
- `utils/mock-data.js`
- Update `views/search-view.js`

---

## File Structure After Phase 2

```
lounge/
├── src/
│   ├── widgets/
│   │   ├── movie-card.js (new)
│   │   └── movie-details-dialog.js (new)
│   ├── utils/
│   │   └── mock-data.js (new)
│   ├── views/
│   │   └── search-view.js (updated)
│   └── window.js (may need minor updates)
```

---

## Manual Testing Checklist

**After implementing Phase 2, perform these tests:**

### 1. Search View Layout
- [ ] Navigate to Search view
- [ ] Search entry is visible at top
- [ ] Grid of movie cards displays below (with mock data)
- [ ] Cards show placeholder poster, title, year
- [ ] Grid is responsive (columns adjust with window width)

### 2. Movie Card Interaction
- [ ] Hover over movie card - shows visual feedback
- [ ] Click movie card - opens movie details dialog
- [ ] Dialog appears centered over main window

### 3. Movie Details Dialog
- [ ] Dialog shows movie poster placeholder
- [ ] Title and year are displayed
- [ ] TMDB rating shows correctly
- [ ] Runtime and genres display
- [ ] Director shows
- [ ] Overview text is readable and scrollable if long
- [ ] Close button dismisses dialog

### 4. Empty States
- [ ] Initial state shows when search is empty
- [ ] Shows appropriate icon and message

### 5. Keyboard Navigation
- [ ] Tab key navigates between cards
- [ ] Enter key on card opens dialog
- [ ] Escape key closes dialog

### 6. Responsive Design
- [ ] Resize window - grid adjusts number of columns
- [ ] Cards maintain aspect ratio
- [ ] Looks good at various window sizes

### 7. Visual Polish
- [ ] Cards have proper spacing
- [ ] Hover effects are smooth
- [ ] Dialog layout is clean and organized
- [ ] Typography is consistent
- [ ] Colors follow libadwaita theme

**Report any failures or issues for fixes before moving to Phase 3.**

---

## Notes

- Using **mock data** only - no API calls yet
- No database operations yet
- Focus is on UI/UX and visual design
- This establishes the foundation for Phase 3 (API integration)
- Search entry is visible but not functional yet (will wire up in Phase 3)
- Phase 3 will replace mock data with real TMDB data and add database
