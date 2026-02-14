# Next.js 14+ Project Initialization - Learnings

## Successful Approach
1. **Create in temp directory**: create-next-app conflicts with existing .sisyphus/ directory, so create in temp and move files
2. **Clean install after moves**: node_modules can become corrupted during file moves - always `rm -rf node_modules && npm install`
3. **shadcn/ui initialization**: Use `npx shadcn@latest` (not deprecated `shadcn-ui`)
4. **Component installation**: Add button first, then batch remaining components to avoid registry issues

## Key Configuration
- **next.config.ts**: Set `output: "standalone"` for Docker compatibility and `serverExternalPackages: ["better-sqlite3"]` for native module support
- **Environment validation**: Zod schema in lib/env.ts validates all required vars at startup, preventing runtime surprises
- **Directory structure**: Matches plan exactly with app/(auth), app/(app), app/api, lib/{db,ai,auth,utils}, components/{ui,chat,analytics,layout}, hooks, types

## Dependencies Installed
- Core: next@16.1.6, react@19.2.3, react-dom@19.2.3
- Database: better-sqlite3@12.6.2, drizzle-orm@0.45.1
- Auth: jose@6.1.3, bcryptjs@3.0.3
- AI: @openrouter/sdk@0.8.0
- UI: tailwindcss@4.1.18, recharts@3.7.0
- Validation: zod@4.3.6
- shadcn/ui: 17 components (button, card, input, label, dialog, sheet, scroll-area, separator, tabs, badge, avatar, skeleton, dropdown-menu, switch, slider, textarea, tooltip)

## Build Verification
- ✓ npm run build succeeds with exit 0
- ✓ .next/standalone directory created for Docker deployment
- ✓ All 17 shadcn components in src/components/ui/
- ✓ All dependencies in package.json
