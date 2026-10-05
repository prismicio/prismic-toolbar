import { execSync } from "node:child_process"

// Tests run against the production build, served at its production URLs.
export default function setup() {
	execSync("npm run build", { stdio: "inherit" })
}
