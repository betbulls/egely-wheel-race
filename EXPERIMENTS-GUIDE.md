# Experiments — tartalom-szerkesztési útmutató (nem-programozóknak)

Ez az útmutató elmagyarázza, **hova, mit, hogyan** kell beírni, hogy új Experimenteket
készíts. Nem kell programozni tudni — csak pontosan követni a mintát.

---

## 1. A nagy kép (30 másodperc)

- **Minden SZÖVEG egyetlen fájlban van:** `experiments.js` (a projekt gyökerében).
- **Minden KÉP egyetlen mappában van:** `assets/experiments/`.
- **Folyamat:** szöveget írsz a fájlba → képeket feltöltesz a mappába → commit + push
  (GitHub Desktop vagy GitHub.com) → kint a cPanelen → a böngészőben **hard refresh** (Ctrl+Shift+R).

Két „doboz" van a fájlban:
- **TOPICS** = a témakörök (Telekinesis, Meditation, …).
- **EXPERIMENTS** = az egyes experimentek (mindegyik egy témakörhöz tartozik, és napokból áll).

---

## 2. Hogyan szerkeszd a fájlt (a legegyszerűbb mód)

**Ajánlott: GitHub.com böngészőből** (nem kell semmit telepíteni):
1. Menj a github.com-ra, nyisd meg a repódat (`egely-wheel-race`).
2. Kattints a `experiments.js` fájlra.
3. Jobb fent a **ceruza ✏️** ikon → szerkesztés.
4. Írd át / illeszd be a tartalmat.
5. Lent **„Commit changes"** → kész. (Ez egyben push is.)

**Vagy a megszokott GitHub Desktop:** nyisd meg a `experiments.js`-t egy szövegszerkesztőben
(ajánlott a **VS Code**, ingyenes, és pirossal jelzi a hibát), írd át, mentsd, majd a GitHub
Desktopban commit + push.

> 💡 **A 3 aranyszabály szerkesztéskor:**
> 1. Minden mondatot/címet **backtick** közé tegyél: `` `...` `` (NEM `'` és NEM `"`).
>    Így az aposztrófok (don't, you're) nem törnek el semmit.
> 2. **Vesszők és zárójelek** maradjanak a helyükön. Minden `{ }` után vessző, ha még jön elem.
> 3. Egy **id-t SOSE nevezz át / használj újra**, ha már létrehoztad (elveszne a userek haladása).

---

## 3. A fájl felépítése — mit jelent minden mező

### TOPICS (egy témakör)
```js
{ id: 'telekinesis', title: `Telekinesis`, icon: '🧠', cover: 'assets/experiments/telekinesis.jpg', order: 1 },
```
| mező | mit jelent | szabály |
|---|---|---|
| `id` | belső azonosító | csak kisbetű/kötőjel, egyedi, **soha ne változtasd** |
| `title` | a látható név | backtick közé |
| `icon` | egy emoji | bármilyen emoji |
| `cover` | a borítókép útvonala | pontosan egyezzen a feltöltött fájl nevével |
| `order` | sorrend | 1, 2, 3 … |

### EXPERIMENTS (egy experiment)
```js
{
  id: 'telekinesis-fundamentals',
  topic: 'telekinesis',
  title: `Telekinesis Fundamentals`,
  level: 'Beginner',
  cover: 'assets/experiments/telekinesis-fundamentals.jpg',
  order: 1,
  summary: `Five gentle days to learn the basics of focused intention.`,
  days: [ /* … napok … */ ],
},
```
| mező | mit jelent | szabály |
|---|---|---|
| `id` | egyedi azonosító | kisbetű/kötőjel, **soha ne változtasd** |
| `topic` | melyik témakörhöz tartozik | egy létező TOPIC `id`-ja |
| `title` | a látható cím | backtick |
| `level` | szint | `'Beginner'`, `'Intermediate'` vagy `'Advanced'` |
| `cover` | borítókép útvonala | egyezzen a feltöltött fájllal |
| `order` | sorrend a témakörön belül | 1, 2, 3 … |
| `summary` | egymondatos leírás | backtick |
| `days` | a napok listája | lásd lent |

### Egy NAP
```js
{ id: 'd1', title: `Getting Grounded`,
  intro: `Rövid bevezető szöveg a napról.`,
  task: `A konkrét feladat erre a napra.`,
  practice: `Mit csináljon mérés közben.`,
  reflectionPrompt: `Egy kérdés a mérés utáni reflexióhoz.`,
  measureSeconds: 120 },
```
| mező | mit jelent | szabály |
|---|---|---|
| `id` | a nap azonosítója | `'d1'`, `'d2'`, … **soha ne változtasd** |
| `title` | a nap címe | backtick |
| `intro` | bevezető szöveg | backtick |
| `task` | a feladat | backtick |
| `practice` | mit csináljon mérés közben | backtick |
| `reflectionPrompt` | reflexió-kérdés | backtick |
| `measureSeconds` | **hány másodperc mérés zárja le a napot** | szám (pl. `120` = 2 perc) |

> A napok száma szabad: lehet 3, 5, 7, akárhány. Csak adj minden napnak **új `id`-t** (`d1`, `d2`, …).

---

## 4. Borítóképek

- **Mappa:** `assets/experiments/` (ha még nincs, hozd létre).
- **Fájlnév:** pontosan egyezzen a `cover:` értékkel. Pl. ha a fájlban
  `cover: 'assets/experiments/meditation-basics.jpg'`, akkor a kép neve `meditation-basics.jpg`.
  Csak **kisbetű, kötőjel, szóköz nélkül**.
- **Méret:** **négyzetes**, kb. **800×800 px** (a kártyák négyzetesen vágják).
- **Formátum:** `.jpg` (vagy `.png`), **300 KB alatt** (gyors töltés).
- Kell: minden **témakörhöz** 1 kép + minden **experimenthez** 1 kép.

**Hogyan töltsd fel (GitHub.com):** a repóban menj az `assets/experiments/` mappába →
**„Add file" → „Upload files"** → húzd be a képeket → Commit. (Vagy GitHub Desktopban: másold
a képeket a `assets/experiments/` mappába a gépeden, majd commit + push.)

> Ha nincs még kép, **nem baj** — addig egy színes csempe + emoji jelenik meg helyette.

---

## 5. Kész ChatGPT-prompt (ezt másold be a ChatGPT-be)

> Másold be az alábbi promptot a ChatGPT-be, és írd a végére, milyen témáról / hány napos
> experimentet szeretnél. A ChatGPT a helyes formátumban adja vissza, te csak beilleszted az
> `EXPERIMENTS = [ ... ]` listába (a többi experiment után, vesszővel elválasztva).

```
You are helping me write content for an app called "Egely Wheel Experiments".
Output ONE JavaScript object in EXACTLY this format (no explanation, code only):

  {
    id: 'UNIQUE-SLUG-HERE',
    topic: 'telekinesis',
    title: `Title Here`,
    level: 'Beginner',
    cover: 'assets/experiments/UNIQUE-SLUG-HERE.jpg',
    order: 3,
    summary: `One short sentence describing the experiment.`,
    days: [
      { id: 'd1', title: `Day Title`,
        intro: `2-3 sentence intro to the day.`,
        task: `The concrete task for the day.`,
        practice: `What to do during the measurement.`,
        reflectionPrompt: `A reflection question.`,
        measureSeconds: 120 },
      // ...more days, each with a new id: d2, d3, ...
    ],
  },

Hard rules:
- Wrap every sentence and title in BACKTICKS ` ` (never ' or "). Do not use the
  characters ` or ${ inside any text.
- `id` and every day `id` must be lowercase, hyphenated, and unique. Day ids are d1, d2, d3...
- level is one of: 'Beginner', 'Intermediate', 'Advanced'.
- measureSeconds is a number (seconds): use 120, 150, or 180.
- topic must be one of: telekinesis, meditation, breathwork, energy-focus.
- Keep all commas and brackets exactly as shown.
- Warm, calm, encouraging tone. No medical claims.

Now write a [NUMBER]-day experiment about [TOPIC] for the "[topic-id]" topic.
```

---

## 6. Deploy + ellenőrzés
1. Commit + push (GitHub.com vagy GitHub Desktop).
2. Várd meg, míg a cPanel kideployolja.
3. A böngészőben **Ctrl+Shift+R** (hard refresh).
4. Nyisd meg az **Experiments** menüt → ott az új tartalom.

---

## 7. Biztonsági háló (FONTOS)
A `experiments.js` egy programkód-fájl: egyetlen hiányzó vessző vagy rossz idézőjel
**az egész appot eltörheti**. Ezért:

> **Mielőtt deploy-olsz: másold be a ChatGPT által írt új részt Claude-nak egy chatben,
> és kérd meg, hogy ellenőrizze, hibátlanul betöltődik-e.** Claude egy másodperc alatt
> megmondja, jó-e, mielőtt élesítenéd. Így sosem törhet el semmi.
