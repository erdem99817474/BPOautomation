# Function Gallery

A minimal, black UI site to manage small UI/JS functions/snippets. Each item has a description and two actions:
- Code: view the source with a copy-to-clipboard button
- Preview: run the snippet in a sandboxed iframe

## Use
- Add a new function at the top form (Name, Description, Code)
- Click Code to view and copy
- Click Preview to see it run
- Click ✎ to edit; 🗑 to delete
- Everything is saved to `localStorage` under `function-gallery-items`

## Run locally
```bash
python3 -m http.server 8000 --directory /workspace
```
Open `http://localhost:8000`.
