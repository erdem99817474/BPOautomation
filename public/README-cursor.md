### Custom Cursor Integration

1) Include assets

Add the following to your HTML template (e.g., `index.html`):

```html
<link rel="stylesheet" href="/cursor.css" />
<script defer src="/cursor.js"></script>
```

If your static root differs, adjust paths accordingly.

2) Default behaviors

- Pointer cursor on: `button`, `[role=button]`, `.cursor-pointer`, `.btn`, and elements with `data-action="add-function|code|preview|edit|copy"`.
- Text cursor on: text inputs, `textarea`, `.cursor-text`, and `[contenteditable=true]`.
- A minimal circular follower scales and changes color on clickable vs text fields.

3) Tailwind palette alignment

Colors default to Tailwind-like values:

- Indigo 500: `--cursor-color-clickable: #6366F1`
- Gray 400/500: `--cursor-color-default: #9CA3AF`, `--cursor-color-text: #6B7280`

Override in CSS:

```css
:root {
  --cursor-color-clickable: #4F46E5; /* indigo-600 */
  --cursor-color-default: #D1D5DB; /* gray-300 */
}
```

4) Accessibility and performance

- Honors `prefers-reduced-motion` to disable transitions.
- Uses `requestAnimationFrame` and CSS variables to avoid flicker.
- The follower is `pointer-events: none` and has high `z-index` without blocking UI.

5) Optional: explicit selectors

If your buttons differ, add your own selectors:

```css
/* Example: */
.my-add-button, .my-edit-button { cursor: pointer; }
```