# App Color Palette System

This document defines five color palette options for the app. Each palette is designed to feel visually comfortable, restrained, and suitable for long-term use. Brightness and saturation are intentionally controlled to avoid harsh contrast or visual fatigue.

---

## 1. Cloud Blue

### Tone
A soft, cool-toned palette built around off-white, muted blue, and desaturated teal. The overall appearance is clean and airy without feeling sterile.

### Positioning
Best suited for a primary light theme, productivity apps, dashboards, learning tools, modern SaaS products, and general-purpose applications.

### Style
Minimal, professional, calm, modern, and technology-oriented. The blue tones are intentionally subdued to avoid the aggressive appearance of highly saturated corporate blues.

| Role | HEX | Usage |
|---|---|---|
| Background | `#F7F9FC` | Main application background and large page areas |
| Surface | `#FFFFFF` | Cards, dialogs, input fields, panels, and elevated surfaces |
| Primary | `#4F6F8F` | Primary buttons, selected states, active navigation, key branding elements |
| Secondary | `#8EA9B8` | Secondary controls, icons, inactive elements, supporting visual hierarchy |
| Accent | `#7FA6A0` | Tags, status indicators, subtle highlights, decorative emphasis |
| Text | `#263746` | Primary text, headings, important labels, high-priority information |

---

## 2. Meadow Cream

### Tone
A warm and natural palette combining soft cream, sage green, muted olive, and a restrained wheat-gold accent.

### Positioning
Ideal for learning apps, lifestyle products, note-taking tools, reading apps, wellness interfaces, weather apps, and products that need a friendly and approachable appearance.

### Style
Fresh, natural, relaxed, warm, and slightly organic. The yellow component is kept creamy rather than bright, preventing the palette from becoming childish or overly energetic.

| Role | HEX | Usage |
|---|---|---|
| Background | `#FBF7EA` | Main page background with a warm cream tone |
| Surface | `#F1F3E7` | Cards, content blocks, input areas, soft secondary surfaces |
| Primary | `#607A64` | Primary buttons, active states, selected controls, core brand elements |
| Secondary | `#A5B58A` | Secondary buttons, supporting icons, low-priority interactive elements |
| Accent | `#C9AF78` | Highlights, badges, selected tags, achievement indicators, decorative details |
| Text | `#38463B` | Primary text, titles, labels, and readable long-form content |

---

## 3. Blush Berry

### Tone
A soft pink palette based on milk pink, muted berry, dusty rose, and greyed lavender.

### Positioning
Designed for apps that need a cute, friendly, warm, or emotionally expressive appearance without becoming overly childish.

### Style
Soft, cute, gentle, polished, and slightly romantic. Instead of relying on vivid pink, the palette shifts toward berry and dusty tones for better long-term readability and a more refined visual identity.

| Role | HEX | Usage |
|---|---|---|
| Background | `#FFF5F7` | Main page background with a very soft pink undertone |
| Surface | `#F8E7EC` | Cards, panels, dialogs, grouped content areas |
| Primary | `#9F5F75` | Primary buttons, active states, major interactive components |
| Secondary | `#D7A6B5` | Secondary controls, icons, supporting graphics, softer emphasis |
| Accent | `#A799BA` | Achievement markers, special tags, decorative highlights, secondary emphasis |
| Text | `#4A3941` | Primary text, headings, labels, and important interface information |

---

## 4. Midnight Blue

### Tone
A cool dark palette combining near-black navy, slate blue, muted steel blue, and desaturated teal.

### Positioning
Recommended as the primary dark theme for developer tools, dashboards, admin panels, AI products, game engines, technical software, and productivity applications.

### Style
Minimal, technical, professional, calm, and highly structured. The background avoids pure black, creating a softer dark interface while maintaining strong visual depth.

| Role | HEX | Usage |
|---|---|---|
| Background | `#0F141A` | Main dark application background |
| Surface | `#171E27` | Cards, sidebars, dialogs, editor panels, elevated containers |
| Primary | `#527397` | Primary buttons, active navigation, selected states, major controls |
| Secondary | `#3F586F` | Secondary buttons, borders, inactive controls, supporting interface elements |
| Accent | `#6D8D8A` | Status indicators, tags, small highlights, special interface states |
| Text | `#D8E0E8` | Main text, headings, labels, and high-priority information |

---

## 5. Night Garden

### Tone
A deep, atmospheric palette combining warm charcoal, smoky purple, blue-grey, and muted forest green.

### Positioning
Best suited for creative applications, AI tools, premium dashboards, music products, game communities, note-taking apps, and interfaces that need a stronger visual identity.

### Style
Dark, artistic, premium, calm, and slightly mysterious. Compared with Midnight Blue, this palette is less technical and more expressive, making it suitable for products where brand character is important.

| Role | HEX | Usage |
|---|---|---|
| Background | `#171518` | Main dark background with a subtle warm undertone |
| Surface | `#211E23` | Cards, panels, sidebars, modals, and layered surfaces |
| Primary | `#806F8D` | Primary buttons, active controls, selected states, major brand accents |
| Secondary | `#5F6D78` | Supporting controls, secondary navigation, icons, low-emphasis interface elements |
| Accent | `#738778` | Tags, status indicators, decorative highlights, special UI states |
| Text | `#DDD8DF` | Primary text, headings, labels, and high-priority content |

---

## Recommended Theme Pairing

For the default application themes:

- **Default Light Theme:** Cloud Blue
- **Default Dark Theme:** Midnight Blue

For implementation, use semantic color tokens rather than hard-coded component colors. A recommended token structure is:

```css
--color-background;
--color-surface;

--color-primary;
--color-secondary;
--color-accent;

--color-text-primary;
```

Each theme should only replace the values of these semantic tokens, allowing the same UI components to support multiple visual themes without changing component-level styles.
