#!/usr/bin/env node
import process from "node:process";
import { runCommitlintCli } from "./rust.js";

const code = runCommitlintCli();
process.exit(code);
