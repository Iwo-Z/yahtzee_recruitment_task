# Kości (Yahtzee) — VSoft 2026

Implementacja Yahtzee dla 2–4 graczy (ludzie i/lub AI) w React + TypeScript.

---

## Uruchomienie

```bash
cd yahtzee/yahtzee
npm install
npm run dev
npm test
```

---

## Jak grać

1. Na ekranie startowym ustaw liczbę graczy (2–4), wpisz imiona i zaznacz, kto ma być sterowany przez AI.
2. Kliknij „Rzuć kośćmi" — masz do 3 rzutów na turę.
3. Po pierwszym rzucie klikaj kości, żeby je zablokować (nie zostaną ponownie rzucone).
4. Kliknij kategorię w tabelce, by wpisać wynik. Każdą kategorię można wypełnić tylko raz.
5. Gra kończy się, gdy wszyscy wypełnią wszystkie 13 kategorii. Wygrywa ten z najwyższą sumą.

---

## Decyzje projektowe

### Czyste funkcje zamiast klas i efektów

Cały silnik (`src/engine/`) to zestaw czystych funkcji — stan wchodzi, nowy stan wychodzi. Dzięki temu testy pokrywające logikę gry działają bez przeglądarki i bez mocków. UI w `src/ui/` jest cienką warstwą na wierzchu.

### Zarządzanie stanem — `useGame`

Jeden niestandardowy hook zarządza całym stanem gry przez `useState`. Komponenty dostają gotowe callbacki (`roll`, `toggleHold`, `score`) i nie importują silnika bezpośrednio. Widok gry jest unią dyskryminowaną (`setup` / `playing` / `finished`), co eliminuje warunki if-phase rozsiane po komponentach.

### Animacja kości

Każde kliknięcie „Rzuć" inkrementuje licznik `rollingTick`. `DiceTray` przekazuje go jako `key`, wymuszając re-mount komponentów kości i tym samym restart animacji CSS — niezależnie od tego, czy wartość kości się zmieniła.

### Pętla AI

Kiedy aktywny gracz jest AI, `useEffect` uruchamia sekwencję kroków z opóźnieniami (900 ms), by rozgrywka była czytelna dla ludzkiego obserwatora. Aktualny stan czytany jest przez `stateRef`, żeby uniknąć przestarzałych zamknięć. Cleanup efektu ustawia flagę `cancelled` i kasuje wszystkie timery — zmiana tury lub restart nie zostawiają wiszących kroków.

---

## Zasady punktowania

Górna sekcja (jedynki–szóstki): suma kości o danej wartości. Bonus **+35 pkt** za ≥ 63 pkt w górnej sekcji (próg ze specyfikacji zadania).

Dolna sekcja: 3/4 jednakowe (suma wszystkich), Full 25 pkt, Mały strit 30 pkt, Duży strit 40 pkt, Król 50 pkt, Szansa (suma bez warunków).

Yahtzee liczy się też jako Full House — jest korzystniejsze dla gracza i zgodne z oficjalnymi zasadami.

---

## Logika AI

AI podejmuje trzy decyzje po każdym rzucie:

- **Które kości trzymać** — dla każdej wolnej kategorii szacuje „potencjał" przy obecnych kościach i zatrzymuje kości najlepiej pasujące do kategorii z najwyższym potencjałem.
- **Czy wpisać teraz** — wpisuje natychmiast po wyrzuceniu Króla lub Dużego strita (trudno poprawić), albo gdy nie ma już rzutów.
- **Którą kategorię wybrać** — bierze tę, która daje najwięcej punktów. Jeśli wszystkie dają 0, poświęca kategorię o najmniejszym potencjale (jedynki pierwsze, Król ostatni).

---

## Testy

Testy Vitest pokrywają silnik i AI: inicjalizację gry, kolejność tur, mechanikę rzutów i blokowania kości, walidację reguł, wykrywanie końca gry, rozstrzyganie zwycięzcy i remisu, zachowanie AI oraz pełną symulację gry dwóch botów.
