#!/usr/bin/env fish

# .env ファイルを読み込み、SECRET_KEYS に列挙されたキーの値を
# Secret Manager に新しいバージョンとして投入する汎用スクリプト。
# 呼び出し側（Makefile）が PROJECT / ENV_FILE / SECRET_KEYS を渡す。

if not set -q PROJECT
    echo "Error: PROJECT is required (example: set -gx PROJECT mirai-yoho-dev)"
    exit 1
end

if not set -q ENV_FILE
    set -gx ENV_FILE .env
end

if not set -q SECRET_KEYS
    echo "Error: SECRET_KEYS is required (space separated secret key names)"
    exit 1
end

if not test -f "$ENV_FILE"
    echo "Error: $ENV_FILE not found in current directory"
    exit 1
end

set -l secret_keys (string split -n ' ' -- $SECRET_KEYS)

if test (count $secret_keys) -eq 0
    echo "Error: SECRET_KEYS is empty"
    exit 1
end

for raw_line in (string split \n -- (string collect < "$ENV_FILE"))
    set -l line (string trim -- $raw_line)

    if test -z "$line"
        continue
    end

    if string match -qr '^#' -- $line
        continue
    end

    if not string match -qr '^[A-Za-z_][A-Za-z0-9_]*=' -- $line
        continue
    end

    set -l pair (string split -m1 '=' -- $line)
    set -l key $pair[1]
    set -l value $pair[2]

    if test (string length -- $value) -ge 2
        set -l first_char (string sub -s 1 -l 1 -- $value)
        set -l last_char (string sub -s -1 -- $value)
        if test "$first_char" = '"' -a "$last_char" = '"'
            set value (string sub -s 2 -l (math (string length -- $value) - 2) -- $value)
        else if test "$first_char" = "'" -a "$last_char" = "'"
            set value (string sub -s 2 -l (math (string length -- $value) - 2) -- $value)
        end
    end

    set -gx $key $value
end

for secret in $secret_keys
    if not set -q $secret
        echo "Error: environment variable $secret is required (from $ENV_FILE)"
        exit 1
    end

    printf '%s' $$secret | gcloud secrets versions add $secret --project "$PROJECT" --data-file=- >/dev/null
    if test $status -ne 0
        echo "Error: failed to add version for $secret"
        exit 1
    end

    echo "Added new version for $secret"
end
