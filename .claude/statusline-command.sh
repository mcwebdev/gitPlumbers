#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract values from JSON
model_name=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // "~"')
project_dir=$(echo "$input" | jq -r '.workspace.project_dir // ""')
output_style=$(echo "$input" | jq -r '.output_style.name // "default"')
version=$(echo "$input" | jq -r '.version // ""')

# Get current directory name
current_dir_name=$(basename "$cwd" 2>/dev/null || echo "~")

# Get git branch (skip optional locks for performance)
git_branch=""
if [ -d "$cwd/.git" ] || git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
    git_branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null || echo "")
    if [ -z "$git_branch" ]; then
        git_branch=$(git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null || echo "")
    fi
fi

# Get git status indicators
git_status=""
if [ -n "$git_branch" ]; then
    # Check for uncommitted changes
    if ! git -C "$cwd" --no-optional-locks diff-index --quiet HEAD -- 2>/dev/null; then
        git_status="*"
    fi
fi

# Color codes (will be dimmed by Claude Code)
BLUE="\033[34m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
MAGENTA="\033[35m"
RED="\033[31m"
RESET="\033[0m"
BOLD="\033[1m"

# Build status line
status_line=""

# Model info
status_line="${BOLD}${CYAN}${model_name}${RESET}"

# Output style (if not default)
if [ "$output_style" != "default" ]; then
    status_line="${status_line} ${MAGENTA}[${output_style}]${RESET}"
fi

# Git branch
if [ -n "$git_branch" ]; then
    git_color="${GREEN}"
    if [ -n "$git_status" ]; then
        git_color="${YELLOW}"
    fi
    status_line="${status_line} ${git_color}(${git_branch}${git_status})${RESET}"
fi

# Working directory
status_line="${status_line} ${BLUE}${current_dir_name}${RESET}"

# Print the status line
printf "$status_line"
