# Kości — zadanie rekrutacyjne VSoft 2026

Implementacja gry kośćmi wzorowanej na Yahtzee dla 2–4 graczy. Aplikacja webowa działająca w całości po stronie klienta — bez backendu, bez zewnętrznych API.

## Spis treści

- [Technologia i uzasadnienie](#technologia-i-uzasadnienie)
- [Architektura](#architektura)
- [Kluczowe decyzje projektowe](#kluczowe-decyzje-projektowe)
- [Przyjęte założenia](#przyjęte-założenia)
- [Elementy kreatywne](#elementy-kreatywne)
- [Uruchomienie](#uruchomienie)
- [Testy](#testy)
- [Struktura projektu](#struktura-projektu)

## Technologia i uzasadnienie

**Stack: React 18 + TypeScript + Vite + Vitest.**

| Wybór | Uzasadnienie |
|---|---|
| **TypeScript** | Logika gry to skończony automat z dyskretnymi stanami — typy literalne (`DieValue = 1\|2\|3\|4\|5\|6`, `Category = 'ones'\|...\|'chance'`) pozwalają kompilatorowi wyłapać błędy, których w JS-ie nie zobaczylibyśmy aż do runtime. Switch po wszystkich kategoriach jest weryfikowany z `noUncheckedIndexedAccess` i exhaustiveness check. |
| **React** | Naturalne dopasowanie do gry, w której stan jest centralny, a UI to jego funkcja (`UI = f(state)`). Brak ręcznej manipulacji DOM. |
| **Vite** | Najszybszy znany mi setup dla nowego projektu React+TS. HMR <100 ms, zero konfiguracji. |
| **Vitest** | Bezbolesne testowanie — to samo API co Jest, ale natywnie rozumie TS i moduły ES, działa na tym samym configu co Vite. |

Świadomie zrezygnowałem z bibliotek state-management (Redux, Zustand) — engine jest czystą funkcją, a React hook `useGame` mu wystarczy. Nie dodaję rzeczy "na zapas".

## Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                       UI (React)                            │
│   App.tsx → PlayerSetup / DiceTray / Scorecard / GameOver   │
│   useGame() — hook spinający widok ze silnikiem             │
└──────────────────────────┬──────────────────────────────────┘
                           │ wywołuje czyste funkcje
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ENGINE (czyste TypeScript)                 │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────┐ ┌────────┐  │
│  │ types.ts │ │categories│ │ dice.ts │ │ ai.ts│ │storage │  │
│  └──────────┘ └──────────┘ └─────────┘ └──────┘ └────────┘  │
│  ┌──────────────────────────┐ ┌──────────────────────────┐  │
│  │ scoring.ts               │ │ game.ts                  │  │
│  │ scoreCategory(cat, dice) │ │ rollAction(state)        │  │
│  │ upperBonus(scorecard)    │ │ scoreAction(state, cat)  │  │
│  │ totalScore(scorecard)    │ │ toggleHoldAction(...)    │  │
│  └──────────────────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Podział odpowiedzialności

**Engine** (`src/engine/`) — całość logiki gry. Pełna izolacja od UI: ani jeden plik nie importuje niczego z Reacta. Każda funkcja modyfikująca stan to czysta funkcja `state → state` (wzorzec reducera). Brak klas, mutacji, side-effectów. Dzięki temu engine jest:

- W 100% testowalny jednostkowo (80 testów Vitest, wszystkie w `src/__tests__/`).
- Łatwy do przeniesienia na inną platformę (CLI, serwer, mobile) — wystarczy podmienić warstwę prezentacji.
- Deterministyczny — RNG wstrzykiwany jako parametr (`RandomFn`), więc testy nie potrzebują mockowania `Math.random`.

**UI** (`src/ui/`) — komponenty React + hook `useGame`. Hook trzyma stan, woła reducery z engine, obsługuje pętlę AI (`setTimeout` z opóźnieniem dla efektu wizualnego) i synchronizuje stan do `localStorage`.

### Zastosowane wzorce

- **Reducer pattern** — wszystkie akcje (`rollAction`, `scoreAction`, `toggleHoldAction`) to czyste funkcje `(state, params) → newState`. Pozwala to wymusić niezmienniki w jednym miejscu i nie martwić się o spójność.
- **Dependency injection** — `RandomFn` wstrzykiwany do funkcji rzutu, dzięki czemu w testach używamy seeded Mulberry32 i mamy w pełni deterministyczne wyniki.
- **Strategy** w warstwie AI — `aiDecideHolds`, `aiPickCategory`, `aiShouldScoreNow` jako odrębne funkcje. Łatwo wymienić strategię bez ruszania pętli sterującej w `useGame`.
- **Tagged unions** (`GameView = setup | playing | finished`) — wykluczenie nieprawidłowych stanów na poziomie typu, kompilator pilnuje wyczerpującej obsługi w `App.tsx`.

## Kluczowe decyzje projektowe

### 1. `Scorecard` jako `Record<Category, number | null>`, nie tablica

```ts
type Scorecard = Record<Category, number | null>;
```

`null` = pole niewypełnione, **dowolna liczba (też `0`)** = pole już wykorzystane. Rozróżnienie jest kluczowe: 0 punktów to legalny wpis (np. "Król" przy braku kombinacji wymusza wpisanie 0, ale wiersz jest już skreślony). Tablica `number[]` z `-1` jako sentinelem byłaby brzydsza i bardziej podatna na błędy.

### 2. Walidacja w engine, nie tylko w UI

Każda akcja w `game.ts` rzuca wyjątek przy nieprawidłowym wywołaniu (`rollAction` przy `rollsLeft === 0`, `scoreAction` na już wykorzystanej kategorii, `createGame` przy <2 lub >4 graczach). UI wprawdzie też pilnuje przycisków (`canRoll`, `canScore`), ale **engine jest źródłem prawdy**. Gdyby ktoś próbował obejść UI (np. uruchomić akcję z konsoli), gra by się nie zepsuła.

### 3. `Held` mask ignorowana przed pierwszym rzutem

Reguła z PDF: "W pierwszej próbie zawsze rzuca wszystkimi pięcioma". Implementacja: `rollAction` sprawdza `rollsLeft === 3` i wymusza rzut całością niezależnie od `held`. Bez tej kondycji ktoś mógłby kliknąć kość (jeszcze leżącą na początku tury) i przypadkowo "zatrzymać" wartość z poprzedniej tury.

### 4. AI jako osobny moduł, niezależny od UI

`ai.ts` operuje wyłącznie na `GameState`. UI hook po prostu w pętli woła `aiDecideHolds → toggleHoldAction` i `aiPickCategory → scoreAction` z drobnymi `setTimeout`-ami dla efektu wizualnego. Można uruchomić cały mecz AI vs AI w testach (i to robię — patrz `ai.test.ts`).

Strategia AI — celowo prosta, ale niegłupia:
1. Liczy "potencjał" każdej dostępnej kategorii.
2. Zatrzymuje kości wnoszące wkład do najwyżej ocenianej.
3. Kończy turę wcześniej, gdy ma yahtzee/duży strit (nie marnuje rzutów).
4. Przy wymuszeniu zera poświęca kategorię o najmniejszej maksymalnej wartości (np. Jedynki przed Królem).

### 5. Logika `held` toggle jest no-op poza fazą rzutów

`toggleHoldAction` nie tylko nie rzuca błędu, ale **ignoruje** wywołania w stanach, w których hold nie ma sensu (przed pierwszym rzutem, po trzecim). To celowe: pozwala UI obsłużyć klik na kości jednolicie, bez warunkowych disable'ów rozproszonych po komponentach.

### 6. Brak zewnętrznych zależności w warstwie engine

Engine importuje wyłącznie z innych plików w `engine/`. Brak lodash, brak immer. Spread/`map` w nowoczesnym JS-ie wystarczają, a każda biblioteka to potencjalna podatność i rozmycie odpowiedzialności.

## Przyjęte założenia

| Wątpliwość | Decyzja | Uzasadnienie |
|---|---|---|
| **Próg bonusu: 62 czy 63?** | **63 pkt** | PDF wyraźnie podaje 63, mail wspomina 62. Idę za PDF-em jako oficjalnym źródłem prawdy. Klasyczny Yahtzee też ma 63 (3·1 + 3·2 + ... + 3·6 — średnio trzy "swoje" w każdym wierszu górnej sekcji). Stała `UPPER_BONUS_THRESHOLD` w `categories.ts` — wystarczy zmienić w jednym miejscu. |
| **Czy 5 jednakowych spełnia warunek 3 i 4 jednakowych oraz Full?** | **Tak** | Spec: "Król spełnia też warunek 3 i 4 jednakowych, Full, itp.". Zaimplementowane jawnie w `scoreCategory`: dla `threeOfAKind` warunek to `≥3`, dla `fourOfAKind` — `≥4`, dla `fullHouse` rozpoznajemy też pięć jednakowych (3+2 wymyślnie zawiera się w 5+0). |
| **Czy duży strit (1-2-3-4-5) liczy się też jako mały strit?** | **Tak** | Mały strit wymaga 4 kolejnych wartości — duży strit z definicji je zawiera. Zaimplementowane przez `hasStraight(dice, length)`. |
| **Co przy wpisie kategorii bez spełnionego warunku?** | **0 pkt, slot zużyty** | Spec: "Gracz zawsze musi wybrać jakiś wiersz, nawet jeżeli wyrzucona kombinacja do niego nie pasuje". `scoreCategory` zwraca 0 dla nietrafionych kombinacji, `scoreAction` po prostu zapisuje. UI w tabeli wyników podświetla takie kategorie kropkowanym obramowaniem. |
| **Kolejność tur** | **Stała (P1 → P2 → … → Pn → P1 → …)** | Spec nie wspomina o naprzemiennym losowaniu kolejności. Trzymam się prostego rozwiązania. |
| **Co kończy grę** | **Wszystkie wiersze wypełnione u każdego gracza** | Spec: "13 wierszy (6 + 7)". `isScorecardComplete` sprawdza wszystkie 13. |

## Elementy kreatywne

Spec wymaga co najmniej dwóch — zaimplementowałem **sześć**:

1. **🤖 Tryb gry z komputerem (AI)** — strategia heurystyczna w `engine/ai.ts`, animowana tura z opóźnieniami dla efektu wizualnego. Dowolny gracz może być AI (od jednego do wszystkich). AI vs AI też działa.
2. **🎲 Animacje rzutu kości** — CSS keyframes (`die-shake`) odpalane przez zmianę klucza Reactowego (`key={rollingTick}`). Niezatrzymane kości "potrząsają się" przy każdym rzucie, zatrzymane stoją w miejscu i są wyróżnione kolorem.
3. **📜 Historia ruchów (log)** — chronologiczny zapis wszystkich akcji (rzuty, zapisy, rozpoczęcia tur, koniec gry) z ikonami i sensownymi opisami.
4. **🌙 Tryb ciemny / jasny** — toggle w prawym górnym rogu, motyw zapisany w `localStorage`, respekt dla `prefers-color-scheme` przy pierwszym uruchomieniu. Wszystkie kolory na CSS variables — łatwo dodać kolejne motywy.
5. **💾 Zapis i wznowienie gry (localStorage)** — stan automatycznie persystowany przy każdej zmianie. Na ekranie startowym pojawia się przycisk "Wznów poprzednią grę", jeśli zapis istnieje. Po zakończeniu meczu zapis jest czyszczony.
6. **📱 Responsywność** — układ flex/grid działa od 320 px wzwyż. Na małych ekranach kości i tabela są skalowane, scorecard ma poziomy scroll dla 4 graczy.

Drobiazgi UX:
- Podgląd punktów (preview) — na aktywnej kolumnie scorecard widać ile punktów gracz dostanie za każdą jeszcze niewypełnioną kategorię, zanim kliknie.
- Wskaźnik dystansu do bonusu — przy bonusie 35 pkt widać "−X pkt" lub "+35".
- Aktywna kategoria/kolumna podświetlone kolorem akcentu.
- Tooltipy z opisem kategorii (atrybut `title` z `CATEGORY_DESCRIPTIONS`).
- Bez `<form>` w komponentach React — używam zwykłych handlerów (best practice w artifacts/SPA).

## Uruchomienie

### Wymagania

- **Node.js ≥ 18** (testowane na 20).
- npm lub kompatybilny menedżer pakietów.

### Krok po kroku

```bash
# 1. Wejdź do katalogu projektu
cd yahtzee

# 2. Zainstaluj zależności
npm install

# 3. Uruchom tryb deweloperski
npm run dev
# Aplikacja będzie dostępna pod http://localhost:5173

# 4. Lub zbuduj wersję produkcyjną
npm run build
npm run preview
# Wersja produkcyjna pod http://localhost:4173
```

### Wszystkie dostępne skrypty

| Komenda | Opis |
|---|---|
| `npm run dev` | Tryb deweloperski (Vite HMR, port 5173) |
| `npm run build` | Build produkcyjny (TS compile + Vite bundle do `dist/`) |
| `npm run preview` | Podgląd buildu produkcyjnego |
| `npm test` | Uruchom testy jednostkowe (jednorazowo) |
| `npm run test:watch` | Testy w trybie watch |

## Testy

**80 testów jednostkowych** pokrywających logikę silnika:

```bash
npm test
```

Pliki testowe (`src/__tests__/`):

- **`scoring.test.ts`** (39 testów) — wszystkie 13 kategorii + edge case'y:
  - Króla liczonego jako 3, 4, i Full
  - Duży strit liczony jako mały strit
  - Bonus aktywujący się przy ≥63 pkt
  - `totalScore` jako kompozycja podsum
- **`dice.test.ts`** (8 testów) — RNG i mechanika rzutu:
  - Zakres wartości 1–6
  - Respektowanie maski hold
  - Pełny hold = brak zmian
  - Rozkład statystycznie jednolity (60k rzutów, tolerancja ±15%)
- **`game.test.ts`** (23 testy) — pełny przepływ rozgrywki:
  - Walidacja `createGame` (liczba graczy, puste nazwy)
  - `rollAction` (dekrement, ignorowanie hold przy pierwszym rzucie, rzucanie po wykorzystaniu prób)
  - `scoreAction` (wymóg rzutu, blokada powtórnego wpisu, przejście tury)
  - `winners` (jeden zwycięzca + remis)
  - Integracyjny: pełna tura z trafionym Królem w 3 rzutach
- **`ai.test.ts`** (10 testów) — heurystyki AI:
  - Trzymanie 4 jednakowych
  - Wybór Króla przy 5 jednakowych
  - Preferencja kategorii niezerowej przy wymuszonym sacrifice
  - Symulacja pełnej gry AI vs AI doprowadzona do końca

## Struktura projektu

```
yahtzee/
├── package.json              # Zależności i skrypty
├── tsconfig.json             # TypeScript: strict, exhaustive checks
├── vite.config.ts            # Vite + Vitest config
├── index.html                # Entry HTML
├── README.md                 # Ten plik
└── src/
    ├── main.tsx              # React root
    ├── App.tsx               # Router: setup / playing / finished
    ├── styles.css            # Style globalne z CSS variables
    │
    ├── engine/               # CZYSTA LOGIKA (zero React)
    │   ├── types.ts          # GameState, Player, Scorecard, …
    │   ├── categories.ts     # Lista kategorii, etykiety, bonus
    │   ├── dice.ts           # rollDie, rollDice + RandomFn
    │   ├── scoring.ts        # scoreCategory, upperBonus, totalScore
    │   ├── game.ts           # rollAction, scoreAction, … (reducery)
    │   ├── ai.ts             # Strategia AI
    │   └── storage.ts        # save/load do localStorage
    │
    ├── ui/                   # WARSTWA REACT
    │   ├── hooks/
    │   │   └── useGame.ts    # Hook spinający engine z UI
    │   └── components/
    │       ├── Die.tsx       # Pojedyncza kość (SVG)
    │       ├── DiceTray.tsx  # Pas kości + przycisk rzutu
    │       ├── Scorecard.tsx # Tabela wyników
    │       ├── PlayerSetup.tsx
    │       ├── GameOver.tsx
    │       ├── GameLog.tsx
    │       └── ThemeToggle.tsx
    │
    └── __tests__/            # Testy Vitest
        ├── scoring.test.ts
        ├── dice.test.ts
        ├── game.test.ts
        └── ai.test.ts
```

---

*Autor implementacji: kandydat na praktyki VSoft 2026.*
