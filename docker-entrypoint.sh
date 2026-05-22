#!/bin/sh
# Runtime ENV injection — lets the same image be reused across deploys
# without rebuilding. If VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
# are passed at run time, every "RUNTIME_PLACEHOLDER_*" string baked
# into the JS bundle gets replaced before nginx serves it.

set -e

if [ -n "$VITE_SUPABASE_URL" ] && [ "$VITE_SUPABASE_URL" != "RUNTIME_PLACEHOLDER_SUPABASE_URL" ]; then
  echo "Injecting runtime Supabase config..."

  find /usr/share/nginx/html/assets -name "*.js" -exec sed -i \
    -e "s|RUNTIME_PLACEHOLDER_SUPABASE_URL|${VITE_SUPABASE_URL}|g" \
    -e "s|RUNTIME_PLACEHOLDER_SUPABASE_KEY|${VITE_SUPABASE_PUBLISHABLE_KEY}|g" \
    {} +

  echo "Runtime config injected."
fi

exec nginx -g "daemon off;"
