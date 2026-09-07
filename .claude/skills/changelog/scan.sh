#!/usr/bin/env bash
# Collects release-changelog candidates across the Ligoj host, ligoj-api and the
# service-level plugins. SKILL.md in this directory explains how the output is used.
#
#   scan.sh [--since-tag <host tag>] [--out <dir>]
#
# Output (in --out, default $TMPDIR/ligoj-changelog):
#   inventory.md       one row per repo: next version, base tag, window, counts, unreleased work, dirty files
#   candidates.md      one heading per distinct subject, with every repo/commit carrying it
#   auto-excluded.md   commits dropped by the technical-noise rules, to review for false drops
#   versions.md        repo -> pom version / last tag / unreleased commits, for the compatible-plugins table
#   tool-hints.md      subjects of the tool-level plugins (out of scope) that may consume an extension point
#   commits/<repo>.txt every commit of the window: subject, body, files
set -euo pipefail

HOST=$(git -C "$(cd "$(dirname "$0")" && pwd)" rev-parse --show-toplevel)
PARENT=$(dirname "$HOST")
OUT=${TMPDIR:-/tmp}/ligoj-changelog
SINCE_TAG=""
while [ $# -gt 0 ]; do
  case $1 in
    --since-tag) SINCE_TAG=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    *) echo "usage: $0 [--since-tag <host tag>] [--out <dir>]" >&2; exit 2 ;;
  esac
done
[ -n "$SINCE_TAG" ] || SINCE_TAG=$(git -C "$HOST" describe --tags --abbrev=0)
SINCE_EPOCH=$(git -C "$HOST" log -1 --format=%ct "$SINCE_TAG")
SINCE_ISO=$(git -C "$HOST" log -1 --format=%cI "$SINCE_TAG")
HOST_PARENT=$(grep -oE '<version>[^<]+' "$HOST/pom.xml" | head -1 | sed 's/<version>//')
mkdir -p "$OUT/commits"
rm -f "$OUT"/commits/*.txt "$OUT"/*.md "$OUT"/*.tsv

# Scope: host, ligoj-api, and the service-level plugins: plugin-<svc>, or plugin-<a>-<b> when no
# plugin-<a> parent exists (inbox-sql, sso-salt, iam-node). Tool-level plugins (plugin-id-ldap,
# plugin-prov-aws, plugin-bt-jira...) are only listed as hints in tool-hints.md.
repos=("$HOST" "$PARENT/ligoj-api"); tools=()
for d in "$PARENT"/ligoj-plugins/plugin-*/; do
  d=${d%/}; n=$(basename "$d"); a=${n#plugin-}; a=${a%%-*}
  [ "$n" = plugin-id_old ] && continue
  if [ "$n" = "plugin-$a" ] || [ ! -d "$PARENT/ligoj-plugins/plugin-$a" ]; then repos+=("$d"); else tools+=("$d"); fi
done

# Technical noise. A commit is dropped when its lower-cased subject matches DROP_SUBJECT, or when
# EVERY touched file matches DROP_FILES. No backslashes: awk -v would re-interpret them.
DROP_SUBJECT='^(chore|lint|style|test|ci|build|docs?|refactor)([(]|!?:)|^(lint|format|style|cleanup|minify|renovate|update|sync)$|release [0-9]|prepare (next )?release|[[]maven-release-plugin[]]|bump|renovate|plugin-api|plugin-parent|plugin-core|bootstrap to [0-9]|__dirname|node ?js [0-9]|package-lock|codename|maven central badge|action hash|eclipse|coverage|jarsigner|launch configuration|previous implementation references|-snapshot|[.]ds_store'
DROP_FILES='(^|/)(README|DOC|REWRITE_VUEJS|CONTRIBUTING)[^/]*[.]md$|/__tests__/|/src/test/|(^|/)[.]github/|(^|/)package(-lock)?[.]json$|vite[.]config|eslint|(^|/)[.]gitignore$|(^|/)[.]codeclimate|(^|/)[.]DS_Store$|(^|/)[.]vscode/|(^|/)[.]idea/'
RELEASE_PLUMBING='prepare (next )?release|release [0-9]|[[]maven-release-plugin[]]'

# Latest tag reachable from HEAD whose commit is not newer than the previous host release: the plugin
# version that was current in that release. Empty when every tag is newer (or there is none).
base_tag_for() {
  local r=$1 t
  for t in $(git -C "$r" tag --sort=-creatordate); do
    git -C "$r" merge-base --is-ancestor "$t" HEAD 2>/dev/null || continue
    if [ "$(git -C "$r" log -1 --format=%ct "$t")" -le "$SINCE_EPOCH" ]; then echo "$t"; return; fi
  done
}

ALL="$OUT/all.tsv"; : > "$ALL"
{
  echo "Previous host tag: \`$SINCE_TAG\` ($SINCE_ISO). Host parent \`org.ligoj.parent:project\` version: \`$HOST_PARENT\` (its major is the Java version)."
  echo
  echo "Window per repo = from the tag that was current at that host release (latest tag not newer than it) to HEAD; without such a tag, from the host release date."
  echo
  echo '| Repo | Next version (pom) | Window | Commits | Candidates | Last tag | Unreleased | Dirty files |'
  echo '|---|---|---|---:|---:|---|---:|---:|'
} > "$OUT/inventory.md"
{ echo '| Repo | Version in pom | Last released tag | Unreleased commits (release plumbing excluded) |'; echo '|---|---|---|---:|'; } > "$OUT/versions.md"

for r in "${repos[@]}"; do
  n=$(basename "$r")
  git -C "$r" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "| $n | - | not a git repo | 0 | 0 | - | 0 | 0 |" >> "$OUT/inventory.md"; continue; }
  pom=$(grep -oE '<version>[^<]+' "$r/pom.xml" 2>/dev/null | sed -n '2s/<version>//p'); pom=${pom:-?}
  last=$(git -C "$r" describe --tags --abbrev=0 2>/dev/null || true)
  last_date=$( [ -n "$last" ] && git -C "$r" log -1 --format=%cs "$last" || echo - )
  unreleased=$( [ -n "$last" ] && git -C "$r" log --format=%s "$last..HEAD" | { grep -vciE "$RELEASE_PLUMBING" || true; } )
  base=$(base_tag_for "$r")
  if [ -n "$base" ]; then
    range=("$base..HEAD"); window="since $base ($(git -C "$r" log -1 --format=%cs "$base"))"
  else
    range=(--since="$SINCE_ISO" HEAD); window="since host $SINCE_TAG date (no earlier tag)"
  fi
  dirty=$(git -C "$r" status --porcelain | grep -vc 'DS_Store' || true)
  git -C "$r" log --no-merges --reverse --format='%n@@ %h|%cs|%s%n%b' --name-only "${range[@]}" > "$OUT/commits/$n.txt"
  git -C "$r" log --no-merges --reverse --format='@@%h%x09%cs%x09%s' --name-only "${range[@]}" \
    | awk -F'\t' -v repo="$n" -v DS="$DROP_SUBJECT" -v DF="$DROP_FILES" '
      function flush(  flag, tag, norm, s) {
        if (hash == "") return
        s = tolower(subj); flag = "KEEP"
        if (s ~ DS) flag = "DROP"; else if (nf > 0 && docs == nf) flag = "DROP"
        tag = (nf > 0 && pom == nf) ? "pom-only" : (main > 0 ? "main-code" : "")
        norm = s; gsub(/^[a-z]+\(+[^)]*\)+!?: */, "", norm); gsub(/^[a-z]+!?: */, "", norm)
        gsub(/[[:space:]]+/, " ", norm); gsub(/^ | $/, "", norm); gsub(/[.]$/, "", norm)
        printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n", repo, hash, date, flag, tag, norm, subj
        hash = ""
      }
      /^@@/ { flush(); hash = substr($1, 3); date = $2; subj = $3; nf = 0; docs = 0; pom = 0; main = 0; next }
      NF { nf++; if ($0 ~ DF) docs++; if ($0 ~ /(^|\/)pom\.xml$/) pom++; if ($0 ~ /(^|\/)(ui\/src|src\/main)\//) main++ }
      END { flush() }' >> "$ALL"
  total=$(awk -F'\t' -v r="$n" '$1==r' "$ALL" | wc -l | tr -d ' ')
  keep=$(awk -F'\t' -v r="$n" '$1==r && $4=="KEEP"' "$ALL" | wc -l | tr -d ' ')
  echo "| $n | $pom | $window | $total | $keep | ${last:--} ($last_date) | $unreleased | $dirty |" >> "$OUT/inventory.md"
  echo "| $n | $pom | ${last:--} ($last_date) | $unreleased |" >> "$OUT/versions.md"
done

# candidates.md: one heading per normalized subject, every commit carrying it, so that the same
# change landing in several repos (host + plugin-ui, "vuejs migration" in every plugin) is obvious.
awk -F'\t' '$4=="KEEP" {
    k=$6; if (!(k in cnt)) { order[++n]=k }
    lines[k] = lines[k] "- `" $1 "` " $2 " " $3 ($5=="pom-only"?" _(pom-only)_":"") "\n"
    cnt[k]++
  }
  END {
    print "# Candidates (" n " distinct subjects)\n\nOne heading per subject: a merge hint, not a feature. Several lines under it mean the same change landed in several repos or commits (write ONE entry); a heading can also gather unrelated changes sharing a subject, and one commit can carry two changes: verdicts are per commit.\n"
    for (i=1;i<=n;i++) { k=order[i]; printf "### %s%s\n%s\n", k, (cnt[k]>1?"  [" cnt[k] "x]":""), lines[k] }
  }' "$ALL" > "$OUT/candidates.md"
awk -F'\t' 'BEGIN{print "# Auto-excluded\n\nReview for false drops: a pom-only default change, a doc-only rename of a visible option, a rewrite hidden behind a bump subject. `(main-code)` = touches ui/src or src/main.\n"}
  $4=="DROP" { printf "- `%s` %s %s — %s%s\n", $1, $2, $3, $7, ($5!=""?" _(" $5 ")_":"") }' "$ALL" > "$OUT/auto-excluded.md"

# tool-hints.md: what the tool-level plugins did in the same window, to decide whether an extension
# point of a service plugin has a visible consumer (subjects only, release plumbing removed).
{
  echo "# Tool-level plugins (out of scope): subjects in the same window, as extension-point hints"; echo
  for r in "${tools[@]}"; do
    n=$(basename "$r"); git -C "$r" rev-parse --is-inside-work-tree >/dev/null 2>&1 || continue
    base=$(base_tag_for "$r")
    if [ -n "$base" ]; then range=("$base..HEAD"); else range=(--since="$SINCE_ISO" HEAD); fi
    subjects=$(git -C "$r" log --no-merges --reverse --format='%h %s' "${range[@]}" | grep -viE "$RELEASE_PLUMBING|$DROP_SUBJECT" || true)
    [ -n "$subjects" ] || continue
    echo "## $n (${base:-since host date})"; echo "$subjects" | sed 's/^/- /'; echo
  done
} > "$OUT/tool-hints.md"

echo "Scanned ${#repos[@]} repos (+${#tools[@]} tool plugins as hints) into $OUT"
cat "$OUT/inventory.md"
echo
echo "Candidates: $(grep -c '^### ' "$OUT/candidates.md")   Auto-excluded: $(grep -c '^- ' "$OUT/auto-excluded.md")   Tool hints: $(grep -c '^- ' "$OUT/tool-hints.md")"
