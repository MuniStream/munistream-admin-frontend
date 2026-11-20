#!/bin/sh
set -e

# Load theme if script exists and plugins are mounted
if [ -f "/app/load-theme.sh" ] && [ -d "/app/plugins" ]; then
    echo "🎨 Loading admin theme for tenant: ${VITE_TENANT_ID:-${VITE_TENANT}}"
    cd /app && ./load-theme.sh

    # Copy themes to nginx html directory if they exist
    if [ -d "/app/public/themes" ]; then
        echo "📁 Copying admin themes to nginx html directory..."
        mkdir -p /usr/share/nginx/html/themes
        cp -r /app/public/themes/* /usr/share/nginx/html/themes/
        echo "✅ Admin themes copied successfully"
    fi
else
    echo "ℹ️  No admin theme loading - script or plugins not found"
fi

# Replace environment variables in the built files
echo "Configuring admin portal for tenant: ${VITE_TENANT}"

# Find all JS files and replace placeholders
find /usr/share/nginx/html -type f -name "*.js" | while read file; do
  sed -i "s|__VITE_API_URL__|${VITE_API_URL}|g" "$file"
  sed -i "s|__VITE_API_BASE_URL__|${VITE_API_BASE_URL}|g" "$file"
  sed -i "s|__VITE_KEYCLOAK_URL__|${VITE_KEYCLOAK_URL}|g" "$file"
  sed -i "s|__VITE_KEYCLOAK_REALM__|${VITE_KEYCLOAK_REALM}|g" "$file"
  sed -i "s|__VITE_KEYCLOAK_CLIENT_ID__|${VITE_KEYCLOAK_CLIENT_ID}|g" "$file"
  sed -i "s|__VITE_TENANT__|${VITE_TENANT}|g" "$file"
  sed -i "s|__VITE_TENANT_ID__|${VITE_TENANT_ID}|g" "$file"
  sed -i "s|__VITE_TENANT_NAME__|${VITE_TENANT_NAME}|g" "$file"
  sed -i "s|__VITE_ORGANIZATION__|${VITE_ORGANIZATION}|g" "$file"

  # Also replace any hardcoded localhost:8180 references
  sed -i "s|http://localhost:8180|${VITE_KEYCLOAK_URL}|g" "$file"
  sed -i "s|munistream-admin|${VITE_KEYCLOAK_CLIENT_ID}|g" "$file"
  sed -i "s|/realms/munistream|/realms/${VITE_KEYCLOAK_REALM}|g" "$file"
done

# PWA manifest: the tenant's icons and name come from the `pwa` section of
# its citizen theme (the same app identity), labelled as the admin portal.
TENANT_DIR="/app/plugins/${VITE_TENANT_ID:-${VITE_TENANT}}"
mkdir -p /usr/share/nginx/html/pwa
node -e "
  const fs = require('fs');
  const { execSync } = require('child_process');
  let pwa = {};
  const yml = '${TENANT_DIR}/themes/citizen/theme.yaml';
  try { pwa = JSON.parse(execSync('js-yaml ' + yml, { encoding: 'utf8' })).pwa || {}; } catch (e) {}
  const assets = '${TENANT_DIR}/themes/citizen/assets/';
  const icons = (pwa.icons || []).filter((i) => fs.existsSync(assets + i.src)).map((i) => {
    fs.copyFileSync(assets + i.src, '/usr/share/nginx/html/pwa/' + i.src);
    return { src: '/pwa/' + i.src, sizes: i.sizes, type: 'image/png', purpose: i.purpose || 'any' };
  });
  const base = pwa.short_name || process.env.VITE_TENANT_NAME || 'MuniStream';
  fs.writeFileSync('/usr/share/nginx/html/manifest.webmanifest', JSON.stringify({
    name: 'Administración ' + base,
    short_name: 'Admin ' + base,
    description: 'Portal administrativo de ' + (pwa.name || base),
    lang: 'es-MX', start_url: '/', scope: '/', display: 'standalone',
    theme_color: '#9F2241', background_color: '#F7F6F4', icons,
  }, null, 2));
  console.log('PWA manifest written (' + icons.length + ' icons)');
"

echo "Admin portal configuration complete"

# Start nginx
nginx -g "daemon off;"