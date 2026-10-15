import type { NextConfig } from "next"

// The toolbar repository also has a lockfile; keep Next.js scoped to the playground.
const nextConfig: NextConfig = {
	turbopack: { root: __dirname },
	outputFileTracingRoot: __dirname,
	// `next dev` would otherwise write AGENTS.md and CLAUDE.md files into the playground.
	agentRules: false,
}

export default nextConfig
