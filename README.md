
# Racing Kings Study Converter

A browser-based converter that transforms Lichess studies into structured JSON opening trees for Racing Kings training tools.

## Features

- Multiple study URL support
- Exports complete move trees
- Reusable line IDs
- Comment placeholders for future annotations
- Copy JSON to clipboard
- Save JSON locally
- GitHub Pages compatible
- No backend required

## Project Structure

```text
/project
│
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── README.md
```

## How To Use

1. Open `index.html`
2. Paste one or more Lichess study links
3. Click `Convert Studies`
4. Copy or save the generated JSON

## GitHub Pages Deployment

1. Upload the project to a GitHub repository
2. Go to:
   Settings → Pages
3. Select:
   Deploy from branch
4. Choose:
   main branch / root
5. Save

Your site will be live after GitHub finishes deployment.

## Notes

The converter currently exports:
- Move order
- Mainline IDs
- Ply count
- Side to move
- Empty comment fields

This structure is designed so you can later:
- Attach annotations
- Merge studies
- Reuse shared opening paths
- Build advanced training systems
