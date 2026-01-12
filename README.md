# PlanDefinition Viewer

![Screenshot of PlanDefinition to BPMN Viewer](static/plandefinition-to-bpmn.png)

## Features

- Upload and view FHIR PlanDefinition files (JSON)
- Automatic conversion to BPMN diagrams
- Interactive BPMN diagram viewer (zoom, pan)
- Edit PlanDefinition JSON in the browser
- No backend: all processing is local

## Export Options

- Export the BPMN diagram as an image (PNG)
- Copy the generated BPMN XML code

## Code Formatting

- The codebase uses Prettier for consistent formatting
- TypeScript is used throughout for type safety
- Please run `npm run format` before submitting pull requests

This project is a Vite + React + TypeScript application that converts a FHIR PlanDefinition JSON into a simple BPMN diagram.

Quick start:

```bash
npm install
npm run dev -- --port 5174   
```

Open the dev URL (usually http://localhost:5174).
